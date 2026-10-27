import { describe, expect, it } from 'vitest';
import SwaggerParser from '@apidevtools/swagger-parser';
import { readFile } from 'node:fs/promises';
import { postListSchema, postResponseSchema } from '../src/features/writing/contracts';
import { chatConfigSchema, chatEventSchema, chatSessionSchema } from '../src/features/chat/contracts';

describe('future backend contract', () => {
  it('is a valid, internally resolved OpenAPI document', async () => {
    const api = await SwaggerParser.validate(new URL('../docs/openapi.json', import.meta.url).pathname);
    expect(api.info.version).toBe('1.1.0');
    expect(Object.keys(api.paths || {})).toHaveLength(29);
  });
  it('keeps concrete public examples compatible with frontend schemas', async () => {
    const detail = JSON.parse(await readFile(new URL('../docs/examples/post-response.json', import.meta.url), 'utf8'));
    const list = JSON.parse(await readFile(new URL('../docs/examples/post-list-response.json', import.meta.url), 'utf8'));
    expect(postResponseSchema.safeParse(detail).success).toBe(true);
    expect(postListSchema.safeParse(list).success).toBe(true);
  });
  it('keeps chat examples compatible and isolates visitor tokens from owner sessions', async () => {
    const read = async (name: string) => JSON.parse(await readFile(new URL(`../docs/examples/${name}`, import.meta.url), 'utf8'));
    const [config, session, done] = await Promise.all([read('chat-config-response.json'), read('chat-session-response.json'), read('chat-done-event.json')]);
    expect(chatConfigSchema.safeParse(config.data).success).toBe(true);
    expect(chatSessionSchema.safeParse(session.data).success).toBe(true);
    expect(chatEventSchema.safeParse(done).success).toBe(true);
    const spec = JSON.parse(await readFile(new URL('../docs/openapi.json', import.meta.url), 'utf8'));
    expect(spec.paths['/chat/sessions/{id}/messages'].post.security).toEqual([{ ChatSessionToken: [] }]);
    expect(spec.paths['/admin/chat/settings'].put.security).toEqual([{ OwnerSession: [] }]);
    expect(spec.paths['/chat/sessions/{id}/messages'].post.responses['200'].content).toHaveProperty('text/event-stream');
  });
});
