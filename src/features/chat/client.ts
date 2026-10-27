import { z } from 'zod';
import { chatConfigSchema, chatEventSchema, chatSessionSchema, type ChatClient, type ChatEvent, type ChatRequest, type ChatSession } from './contracts';
import { DemoChatClient } from './demo';

export class ChatError extends Error {
  constructor(message: string, public readonly retryable = true, public readonly status = 0) { super(message); this.name = 'ChatError'; }
}
function responseError(status: number) {
  if (status === 401 || status === 410) return new ChatError('This chat session has expired. Start a new chat to continue.', false, status);
  if (status === 429) return new ChatError('A few too many messages. Please wait a moment and try again.', true, status);
  if (status === 409) return new ChatError('Your previous reply is still finishing. Please try again shortly.', true, status);
  return new ChatError('The assistant is unavailable right now. Please try again.', status >= 500, status);
}
async function json<T>(url: string, init: RequestInit, schema: z.ZodType<T>, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { ...init, signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]), credentials: 'same-origin', headers: { Accept: 'application/json', ...init.headers } });
  if (!response.ok) throw responseError(response.status);
  const result = schema.safeParse(await response.json());
  if (!result.success) throw new ChatError('The assistant returned an unreadable response. Please try again.');
  return result.data;
}

// Incremental UTF-8 decoding handles frames split across arbitrary network chunks.
export async function* readChatStream(body: ReadableStream<Uint8Array>, signal: AbortSignal): AsyncIterable<ChatEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let started = false;
  let messageId = '';
  let textLength = 0;
  const onAbort = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', onAbort, { once: true });
  try {
    while (true) {
      signal.throwIfAborted();
      const part = await reader.read();
      signal.throwIfAborted();
      buffer += decoder.decode(part.value, { stream: !part.done });
      if (buffer.length > 131_072) throw new ChatError('The assistant response was too large.');
      let boundary: RegExpExecArray | null;
      while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
        const frame = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary[0].length);
        const data = frame.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).replace(/^ /, '')).join('\n');
        if (!data) continue; // SSE comments are heartbeat frames.
        let parsed: unknown;
        try { parsed = JSON.parse(data); } catch { throw new ChatError('The assistant stream was interrupted. Please retry.'); }
        const result = chatEventSchema.safeParse(parsed);
        if (!result.success) throw new ChatError('The assistant returned an invalid stream event.');
        const event = result.data;
        const eventName = frame.split(/\r?\n/).find(line => line.startsWith('event:'))?.slice(6).trim();
        if (eventName && eventName !== event.type) throw new ChatError('The assistant returned a mismatched stream event.');
        if (event.type === 'error') throw new ChatError(event.code === 'rate_limited' ? 'Please wait a moment before trying again.' : 'The reply could not be completed. Please try again.', event.retryable);
        if (event.type === 'start') {
          if (started) throw new ChatError('The assistant returned a duplicate start event.');
          started = true; messageId = event.messageId;
        } else if (!started) throw new ChatError('The assistant stream did not start correctly.');
        if (event.type === 'delta') { textLength += event.text.length; if (textLength > 8000) throw new ChatError('The assistant response was too large.'); }
        if (event.type === 'done' && event.messageId !== messageId) throw new ChatError('The assistant response did not match this message.');
        yield event;
        if (event.type === 'done') return;
      }
      if (part.done) throw new ChatError('The reply ended early. Please try again.');
    }
  } finally { signal.removeEventListener('abort', onAbort); await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

export class HttpChatClient implements ChatClient {
  readonly mode = 'api';
  constructor(private readonly base = '/api/v1') {}
  async getConfig(signal: AbortSignal) { return (await json(`${this.base}/chat/config`, {}, z.object({ data: chatConfigSchema }), signal)).data; }
  async createSession(signal: AbortSignal) { return (await json(`${this.base}/chat/sessions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }, z.object({ data: chatSessionSchema }), signal)).data; }
  async *streamMessage(session: ChatSession, request: ChatRequest, signal: AbortSignal): AsyncIterable<ChatEvent> {
    const deadline = AbortSignal.any([signal, AbortSignal.timeout(60_000)]);
    const response = await fetch(`${this.base}/chat/sessions/${session.id}/messages`, { method: 'POST', credentials: 'same-origin', signal: deadline, headers: { Accept: 'text/event-stream', 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` }, body: JSON.stringify(request) });
    if (!response.ok) throw responseError(response.status);
    if (!response.headers.get('Content-Type')?.includes('text/event-stream') || !response.body) throw new ChatError('The assistant stream could not be opened.');
    for await (const event of readChatStream(response.body, deadline)) {
      if (event.type === 'start' && event.clientMessageId !== request.clientMessageId) throw new ChatError('The assistant returned a reply for another request.');
      yield event;
    }
  }
  async deleteSession(session: ChatSession, signal: AbortSignal) {
    const response = await fetch(`${this.base}/chat/sessions/${session.id}`, { method: 'DELETE', credentials: 'same-origin', signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]), headers: { Authorization: `Bearer ${session.token}` } });
    if (!response.ok && response.status !== 404 && response.status !== 410) throw responseError(response.status);
  }
}
export const chatClient: ChatClient = import.meta.env.VITE_CHAT_SOURCE === 'api'
  ? new HttpChatClient((import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, ''))
  : new DemoChatClient();
