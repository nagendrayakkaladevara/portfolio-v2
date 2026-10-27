import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { chatClient, ChatError } from './client';
import type { ChatMessage, ChatRequest, ChatSession } from './contracts';

export function usePortfolioChat(open: boolean, pagePath: string) {
  const configQuery = useQuery({ queryKey: ['chat', 'config'], queryFn: ({ signal }) => chatClient.getConfig(signal), enabled: open, staleTime: 300_000, retry: false });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<ChatError | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const session = useRef<ChatSession | null>(null);
  const active = useRef<AbortController | null>(null);
  const lastRequest = useRef<ChatRequest | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; active.current?.abort(); }; }, []);
  useEffect(() => { if (!open) active.current?.abort(); }, [open]);

  async function send(content: string, retry = false) {
    const config = configQuery.data;
    const text = content.trim();
    if (active.current || resetting || !config?.enabled || !text || text.length > config.maxMessageLength) return;
    const request = retry && lastRequest.current ? lastRequest.current : { clientMessageId: crypto.randomUUID(), content: text, pagePath };
    lastRequest.current = request;
    const assistantId = `assistant-${request.clientMessageId}`;
    const controller = new AbortController(); active.current = controller;
    setBusy(true); setError(null); setAnnouncement('');
    const assistant: ChatMessage = { id: assistantId, role: 'assistant', text: '', sources: [], status: 'streaming' };
    setMessages(previous => retry ? previous.map(message => message.id === assistantId ? assistant : message) : [...previous, { id: request.clientMessageId, role: 'user', text: request.content, sources: [], status: 'complete' }, assistant]);
    const update = (patch: Partial<ChatMessage>) => { if (mounted.current && active.current === controller) setMessages(previous => previous.map(message => message.id === assistantId ? { ...message, ...patch } : message)); };
    let answer = '';
    let completed = false;
    try {
      session.current ??= await chatClient.createSession(controller.signal);
      for await (const event of chatClient.streamMessage(session.current, request, controller.signal)) {
        if (active.current !== controller) return;
        if (event.type === 'delta') { answer += event.text; update({ text: answer }); }
        if (event.type === 'sources') update({ sources: event.sources });
        if (event.type === 'done') { completed = true; update({ text: event.text, sources: event.sources, status: 'complete' }); if (mounted.current) setAnnouncement(`Assistant: ${event.text}`); }
      }
      if (!completed) throw new ChatError('The reply ended early. Please try again.');
    } catch (cause) {
      if (!mounted.current || active.current !== controller) return;
      if (controller.signal.aborted) { update({ status: 'stopped' }); setAnnouncement('Reply stopped.'); }
      else { const failure = cause instanceof ChatError ? cause : new ChatError('The connection was interrupted. Please try again.'); update({ status: 'error' }); setError(failure); }
    } finally {
      if (active.current === controller) { active.current = null; if (mounted.current) setBusy(false); }
    }
  }
  async function reset() {
    if (active.current || resetting) return;
    setResetting(true); setError(null);
    const controller = new AbortController(); active.current = controller;
    try {
      if (session.current) await chatClient.deleteSession(session.current, controller.signal);
      if (!mounted.current) return;
      session.current = null; lastRequest.current = null; setMessages([]); setAnnouncement('New chat started.');
    } catch { if (mounted.current && !controller.signal.aborted) setError(new ChatError('Could not clear this chat. Use New chat to try again.', false)); }
    finally { if (active.current === controller) active.current = null; if (mounted.current) setResetting(false); }
  }
  return { configQuery, messages, busy, resetting, error, announcement, mode: chatClient.mode, send,
    stop: () => active.current?.abort(), reset,
    retry: () => { if (lastRequest.current) void send(lastRequest.current.content, true); },
  };
}
