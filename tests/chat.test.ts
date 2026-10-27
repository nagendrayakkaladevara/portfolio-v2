import { afterEach, describe, expect, it, vi } from 'vitest';
import { readChatStream, HttpChatClient } from '../src/features/chat/client';
import { DemoChatClient, getDemoReply } from '../src/features/chat/demo';
import { chatConfigSchema, chatEventSchema, chatSourceSchema } from '../src/features/chat/contracts';
import { portfolio } from '../src/data/portfolio';
const messageId = '00000000-0000-4000-8000-000000000011';
const clientMessageId = '00000000-0000-4000-8000-000000000012';
const sessionId = '00000000-0000-4000-8000-000000000013';
const start = { type: 'start', messageId, clientMessageId };
const done = { type: 'done', messageId, text: 'Hello, Nagendra 👋', sources: [{ id: 'profile', title: 'Profile', url: '/' }], finishReason: 'stop', knowledgeVersion: 'v1' };
const session = { id: sessionId, token: 'a'.repeat(48), expiresAt: '2026-10-09T00:00:00Z' };
const request = { clientMessageId, content: 'What does Nagendra work on?', pagePath: '/' };
function stream(text: string, chunkSize = 7) {
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream<Uint8Array>({ start(controller) { for (let i=0;i<bytes.length;i+=chunkSize) controller.enqueue(bytes.slice(i,i+chunkSize)); controller.close(); } });
}
function frame(value: unknown) { return `data: ${JSON.stringify(value)}\r\n\r\n`; }
async function collect<T>(values: AsyncIterable<T>) { const result: T[] = []; for await (const value of values) result.push(value); return result; }
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('portfolio chat demo', () => {
  it('reads only local data and produces the same validated events as the future API', async () => {
    vi.useFakeTimers(); const fetchMock = vi.fn().mockRejectedValue(new Error('No network')); vi.stubGlobal('fetch', fetchMock);
    const client = new DemoChatClient(); const signal = new AbortController().signal;
    const config = await client.getConfig(signal);
    expect(chatConfigSchema.safeParse(config).success).toBe(true);
    const current = await client.createSession(signal);
    const result = collect(client.streamMessage(current, request, signal));
    await vi.runAllTimersAsync(); const events = await result;
    expect(events.every(event => chatEventSchema.safeParse(event).success)).toBe(true);
    expect(events.at(-1)).toMatchObject({ type: 'done', text: expect.stringContaining(portfolio.current.company) });
    await client.deleteSession(current, signal); expect(fetchMock).not.toHaveBeenCalled();
  });
  it('does not invent private details or treat sample articles as published work', () => {
    expect(getDemoReply('What is his salary?').text).toContain('don’t have private details');
    expect(getDemoReply('Tell me about his articles').text).toContain('sample articles');
    expect(getDemoReply('Who will win the football game?').text).toContain('don’t have a verified answer');
  });
  it('uses actual portfolio data for contact, projects and skills', () => {
    expect(getDemoReply('How can I contact him?').text).toContain(portfolio.email);
    expect(getDemoReply('Show me his projects').text).toContain(portfolio.projects[0].name);
    expect(getDemoReply('What are his skills?').text).toContain('Angular');
  });
  it('stops immediately when cancelled', async () => {
    const client = new DemoChatClient(); const controller = new AbortController();
    const iterator = client.streamMessage(session, request, controller.signal)[Symbol.asyncIterator]();
    expect((await iterator.next()).value).toMatchObject({ type: 'start' });
    controller.abort(); await expect(iterator.next()).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('SSE contract', () => {
  it('handles split UTF-8, CRLF framing and heartbeat comments', async () => {
    const text = ': keepalive\r\n\r\n' + frame(start) + frame({ type: 'delta', text: 'Hello 👋' }) + frame(done);
    const events = await collect(readChatStream(stream(text, 1), new AbortController().signal));
    expect(events).toEqual([start, { type: 'delta', text: 'Hello 👋' }, done]);
  });
  it('rejects incomplete streams instead of marking a partial reply complete', async () => {
    await expect(collect(readChatStream(stream(frame(start)), new AbortController().signal))).rejects.toThrow('ended early');
  });
  it('rejects out-of-order events and a mismatched final message', async () => {
    await expect(collect(readChatStream(stream(frame({ type: 'delta', text: 'x' })), new AbortController().signal))).rejects.toThrow('start correctly');
    await expect(collect(readChatStream(stream(frame(start) + frame({ ...done, messageId: clientMessageId })), new AbortController().signal))).rejects.toThrow('did not match');
  });
  it('surfaces stream errors safely and blocks unsafe citation URLs', async () => {
    await expect(collect(readChatStream(stream(frame(start) + frame({ type: 'error', code: 'generation_failed', retryable: true })), new AbortController().signal))).rejects.toThrow('could not be completed');
    expect(chatSourceSchema.safeParse({ id: 'bad', title: 'bad', url: 'javascript:alert(1)' }).success).toBe(false);
    expect(chatSourceSchema.safeParse({ id: 'bad', title: 'bad', url: '//evil.example' }).success).toBe(false);
  });
  it('cancels a pending stream read', async () => {
    const controller = new AbortController();
    const body = new ReadableStream<Uint8Array>({ start() {} });
    const result = collect(readChatStream(body, controller.signal));
    controller.abort(); await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('future chat HTTP transport', () => {
  it('sends only the current user input and a session-scoped bearer token', async () => {
    const fetchMock = vi.fn(async () => new Response(stream(frame(start) + frame(done)), { headers: { 'Content-Type': 'text/event-stream' } }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await collect(new HttpChatClient().streamMessage(session, request, new AbortController().signal))).toEqual([start, done]);
    expect(fetchMock).toHaveBeenCalledWith(`/api/v1/chat/sessions/${sessionId}/messages`, expect.objectContaining({ method: 'POST', credentials: 'same-origin', body: JSON.stringify(request), headers: expect.objectContaining({ Authorization: `Bearer ${session.token}` }) }));
  });
  it('never falls back to demo content on a real API failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 503 })));
    await expect(new HttpChatClient().getConfig(new AbortController().signal)).rejects.toThrow('unavailable');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('rejects a response acknowledging a different user message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(stream(frame({ ...start, clientMessageId: messageId }) + frame(done)), { headers: { 'Content-Type': 'text/event-stream' } })));
    await expect(collect(new HttpChatClient().streamMessage(session, request, new AbortController().signal))).rejects.toThrow('another request');
  });
});
