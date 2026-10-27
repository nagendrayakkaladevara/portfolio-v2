import { z } from 'zod';
import bundledPosts from '@/src/data/posts.json';
import { fixtureSchema, postListSchema, postResponseSchema, slugSchema, type ContentRepository, type ListPostsOptions, type Post, type PostSummary } from './contracts';

export class ContentError extends Error {
  constructor(public readonly status: number, message: string) { super(message); this.name = 'ContentError'; }
}

async function readJson<T>(url: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
  // TanStack cancellation is propagated; a hanging API also has a bounded deadline.
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' }, credentials: 'omit' });
    if (!response.ok) throw new ContentError(response.status, response.status === 404 ? 'Article not found.' : 'Writing is temporarily unavailable.');
    const result = schema.safeParse(await response.json());
    if (!result.success) throw new ContentError(502, 'The content response could not be read.');
    return result.data;
  } catch (error) {
    if (error instanceof ContentError || signal?.aborted) throw error;
    throw new ContentError(503, 'Writing is temporarily unavailable. Please try again.');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

function summary({ bodyMarkdown: _body, media: _media, ...post }: Post): PostSummary { return post; }

export class JsonContentRepository implements ContentRepository {
  // Local content is part of the application bundle, with no HTTP request.
  // The repository interface stays the same when the API is connected later.
  constructor(private readonly source: unknown = bundledPosts) {}
  private async read(signal?: AbortSignal) {
    signal?.throwIfAborted();
    const result = fixtureSchema.safeParse(this.source);
    if (!result.success) throw new ContentError(500, 'The local writing data could not be read.');
    const fixture = result.data;
    return fixture.posts.filter(post => Date.parse(post.publishedAt) <= Date.now()).sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || b.id.localeCompare(a.id));
  }
  async listPosts({ limit = 20, cursor, signal }: ListPostsOptions = {}) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new ContentError(400, 'Invalid page size.');
    const posts = await this.read(signal);
    const cursorIndex = cursor ? posts.findIndex(post => post.id === cursor) : -1;
    if (cursor && cursorIndex === -1) throw new ContentError(400, 'Invalid cursor.');
    const start = cursorIndex + 1;
    const data = posts.slice(start, start + limit).map(summary);
    const hasMore = start + data.length < posts.length;
    return { data, pagination: { nextCursor: hasMore ? data.at(-1)!.id : null, hasMore, limit } };
  }
  async getPost(slug: string, signal?: AbortSignal) {
    if (!slugSchema.safeParse(slug).success) throw new ContentError(404, 'Article not found.');
    const post = (await this.read(signal)).find(item => item.slug === slug);
    if (!post) throw new ContentError(404, 'Article not found.');
    return post;
  }
}

export class HttpContentRepository implements ContentRepository {
  constructor(private readonly baseUrl = '/api/v1') {}
  async listPosts({ limit = 20, cursor, signal }: ListPostsOptions = {}) {
    const search = new URLSearchParams({ limit: String(limit) });
    if (cursor) search.set('cursor', cursor);
    return readJson(`${this.baseUrl}/posts?${search}`, postListSchema, signal);
  }
  async getPost(slug: string, signal?: AbortSignal) {
    if (!slugSchema.safeParse(slug).success) throw new ContentError(404, 'Article not found.');
    const result = await readJson(`${this.baseUrl}/posts/${encodeURIComponent(slug)}`, postResponseSchema, signal);
    return result.data;
  }
}

// No silent mock fallback when the real API fails.
export const contentRepository: ContentRepository = import.meta.env.VITE_CONTENT_SOURCE === 'api'
  ? new HttpContentRepository((import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, ''))
  : new JsonContentRepository();
