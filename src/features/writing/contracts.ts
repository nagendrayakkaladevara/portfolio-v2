import { z } from 'zod';

export const slugSchema = z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const mediaSchema = z.object({
  id: z.string().uuid(),
  url: z.string().refine(value => {
    if (/^\/[^/\\]/.test(value) && !/[\\\s]/.test(value)) return true;
    try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
  }, 'Expected HTTPS or a local asset path'),
  alt: z.string().max(250),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  caption: z.string().max(500).nullable(),
});
export const tagSchema = z.object({ slug: slugSchema.max(60), name: z.string().min(1).max(60) });
export const postSummarySchema = z.object({
  id: z.string().uuid(), slug: slugSchema, title: z.string().min(1).max(160),
  excerpt: z.string().max(320), publishedAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
  readingTimeMinutes: z.number().int().positive(), tags: z.array(tagSchema).max(8),
  coverImage: mediaSchema.nullable(), isDemo: z.boolean(),
});
export const postSchema = postSummarySchema.extend({ bodyMarkdown: z.string().min(1).max(200_000), media: z.array(mediaSchema).max(50) });
export const postListSchema = z.object({
  data: z.array(postSummarySchema),
  pagination: z.object({ nextCursor: z.string().nullable(), hasMore: z.boolean(), limit: z.number().int().min(1).max(50) }),
});
export const postResponseSchema = z.object({ data: postSchema });
export const fixtureSchema = z.object({ schemaVersion: z.literal(1), posts: z.array(postSchema) });
export type Post = z.infer<typeof postSchema>;
export type PostSummary = z.infer<typeof postSummarySchema>;
export type PostList = z.infer<typeof postListSchema>;
export type ArticleMedia = z.infer<typeof mediaSchema>;
export type ListPostsOptions = { limit?: number; cursor?: string; signal?: AbortSignal };
export interface ContentRepository {
  listPosts(options?: ListPostsOptions): Promise<PostList>;
  getPost(slug: string, signal?: AbortSignal): Promise<Post>;
}
