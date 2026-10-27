import { z } from 'zod';

export const chatSourceSchema = z.object({
  id: z.string().min(1).max(120), title: z.string().min(1).max(160),
  url: z.string().refine(value => /^\/(?![/\\])[^\\\s]*$/.test(value), 'Sources must be local portfolio links'),
});
export const chatConfigSchema = z.object({
  enabled: z.boolean(), title: z.string().min(1).max(80), welcomeMessage: z.string().min(1).max(500),
  suggestedQuestions: z.array(z.string().min(1).max(120)).max(6),
  maxMessageLength: z.number().int().min(1).max(2000), disclaimer: z.string().min(1).max(250),
});
export const chatSessionSchema = z.object({ id: z.string().uuid(), token: z.string().min(32).max(512), expiresAt: z.iso.datetime() });
export const chatEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('start'), messageId: z.string().uuid(), clientMessageId: z.string().uuid() }),
  z.object({ type: z.literal('delta'), text: z.string().max(2048) }),
  z.object({ type: z.literal('sources'), sources: z.array(chatSourceSchema).max(5) }),
  z.object({ type: z.literal('done'), messageId: z.string().uuid(), text: z.string().min(1).max(8000), sources: z.array(chatSourceSchema).max(5), finishReason: z.enum(['stop', 'length']), knowledgeVersion: z.string().min(1).max(80) }),
  z.object({ type: z.literal('error'), code: z.enum(['generation_failed', 'rate_limited', 'content_unavailable', 'cancelled']), retryable: z.boolean() }),
]);
export type ChatConfig = z.infer<typeof chatConfigSchema>;
export type ChatSource = z.infer<typeof chatSourceSchema>;
export type ChatSession = z.infer<typeof chatSessionSchema>;
export type ChatEvent = z.infer<typeof chatEventSchema>;
export type ChatRequest = { clientMessageId: string; content: string; pagePath: string };
export interface ChatClient {
  mode: 'demo' | 'api';
  getConfig(signal: AbortSignal): Promise<ChatConfig>;
  createSession(signal: AbortSignal): Promise<ChatSession>;
  streamMessage(session: ChatSession, request: ChatRequest, signal: AbortSignal): AsyncIterable<ChatEvent>;
  deleteSession(session: ChatSession, signal: AbortSignal): Promise<void>;
}
export type ChatMessage = { id: string; role: 'user' | 'assistant'; text: string; sources: ChatSource[]; status: 'complete' | 'streaming' | 'stopped' | 'error' };
