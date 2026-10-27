import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFile } from 'node:fs/promises';
import { fixtureSchema } from '../src/features/writing/contracts';
import { contentRepository, HttpContentRepository, JsonContentRepository } from '../src/features/writing/repository';
import { ArticleBody, getHeadings } from '../src/features/writing/markdown';
const fixture = JSON.parse(await readFile(new URL('../src/data/posts.json', import.meta.url), 'utf8'));
function respond(data: unknown, status = 200) { vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }))); }
afterEach(() => { vi.unstubAllGlobals(); });

describe('writing contract and JSON adapter', () => {
  it('loads recent writing, the archive and every article without network requests', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Network unavailable'));
    vi.stubGlobal('fetch', fetchMock);
    const recent = await contentRepository.listPosts({ limit: 5 });
    expect(recent.data).toHaveLength(5);
    const archive = await contentRepository.listPosts();
    expect(archive.data).toHaveLength(fixture.posts.length);
    for (const entry of archive.data) {
      const article = await contentRepository.getPost(entry.slug);
      expect(article.title).toBe(entry.title);
      expect(renderToStaticMarkup(<ArticleBody markdown={article.bodyMarkdown} media={article.media} />)).toContain('<p>');
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('accepts every sample and requires unique slugs and IDs', () => {
    expect(fixtureSchema.safeParse(fixture).success).toBe(true);
    expect(new Set(fixture.posts.map((p: { slug: string }) => p.slug)).size).toBe(fixture.posts.length);
    expect(new Set(fixture.posts.map((p: { id: string }) => p.id)).size).toBe(fixture.posts.length);
    expect(fixture.posts.every((p: { isDemo: boolean }) => p.isDemo)).toBe(true);
  });
  it('orders and paginates without sending article bodies in summaries', async () => {
    const repo = new JsonContentRepository({ ...fixture, posts: [...fixture.posts].reverse() });
    const first = await repo.listPosts({ limit: 3 });
    const second = await repo.listPosts({ limit: 3, cursor: first.pagination.nextCursor! });
    expect(first.data.map(p => p.slug)).toEqual(fixture.posts.slice(0, 3).map((p: { slug: string }) => p.slug));
    expect(new Set([...first.data, ...second.data].map(p => p.id)).size).toBe(6);
    expect(first.data[0]).not.toHaveProperty('bodyMarkdown');
    expect(first.data[0]).not.toHaveProperty('media');
    const end = await repo.listPosts({ limit: 3, cursor: second.pagination.nextCursor! });
    expect(end.pagination).toEqual({ nextCursor: null, hasMore: false, limit: 3 });
  });
  it('rejects invalid pagination and unknown or malformed slugs', async () => {
    const repo = new JsonContentRepository();
    await expect(repo.listPosts({ limit: 51 })).rejects.toMatchObject({ status: 400 });
    await expect(repo.listPosts({ cursor: 'bad' })).rejects.toMatchObject({ status: 400 });
    await expect(repo.getPost('not-found')).rejects.toMatchObject({ status: 404 });
    await expect(repo.getPost('../admin')).rejects.toMatchObject({ status: 404 });
  });
  it('does not expose future-dated content', async () => {
    const repo = new JsonContentRepository({ ...fixture, posts: [{ ...fixture.posts[0], publishedAt: '2999-01-01T00:00:00Z' }] });
    expect((await repo.listPosts()).data).toHaveLength(0);
  });
  it('returns a recoverable upstream error for malformed API data', async () => {
    respond({ data: [] });
    await expect(new HttpContentRepository().listPosts()).rejects.toMatchObject({ status: 502 });
  });
});
describe('HTTP boundary', () => {
  it('uses the endpoint and unwraps the validated response', async () => {
    respond({ data: fixture.posts[0] });
    expect((await new HttpContentRepository().getPost(fixture.posts[0].slug)).id).toBe(fixture.posts[0].id);
    expect(fetch).toHaveBeenCalledWith(`/api/v1/posts/${fixture.posts[0].slug}`, expect.objectContaining({ credentials: 'omit' }));
  });
  it('surfaces API failure rather than falling back to mock content', async () => {
    respond({ title: 'Unavailable' }, 503);
    await expect(new HttpContentRepository().listPosts()).rejects.toMatchObject({ status: 503 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('propagates cancellation to fetch', async () => {
    vi.stubGlobal('fetch', vi.fn((_url, options: RequestInit) => new Promise((_resolve, reject) => options.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))))));
    const controller = new AbortController();
    const promise = new HttpContentRepository().listPosts({ signal: controller.signal });
    controller.abort(); await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });
});
describe('safe article rendering', () => {
  const markdown = '## **Same** [heading](https://example.com)\n\n## Same heading\n\n```md\n## not a heading\n```\n\nSetext title\n------------';
  it('shares stable, unique anchors between the TOC and rendered headings', () => {
    const headings = getHeadings(markdown);
    expect(headings.map(h => h.id)).toEqual(['section-same-heading', 'section-same-heading-2', 'section-setext-title']);
    const html = renderToStaticMarkup(<ArticleBody markdown={markdown} media={[]} />);
    for (const heading of headings) expect(html).toContain(`id="${heading.id}"`);
  });
  it('does not render raw HTML, script links, undeclared images, or another h1', () => {
    const html = renderToStaticMarkup(<ArticleBody markdown={'# Nested title\n\n<script>alert(1)</script>\n\n[bad](javascript:alert)\n\n![secret](https://evil.example/image.png)'} media={[]} />);
    expect(html).not.toContain('<script'); expect(html).not.toContain('javascript:'); expect(html).not.toContain('<h1'); expect(html).not.toContain('<img'); expect(html).toContain('Image unavailable');
  });
  it('renders declared images with dimensions and safe external links', () => {
    const media = [{ id: 'test-image', url: '/images/test.png', alt: 'Test illustration', width: 1024, height: 1536, caption: null }];
    const html = renderToStaticMarkup(<ArticleBody markdown={'![illustration](/images/test.png)\n\n[Link](https://example.com)'} media={media} />);
    expect(html).toContain('width="1024"'); expect(html).toContain('height="1536"'); expect(html).toContain('loading="lazy"'); expect(html).toContain('rel="noopener noreferrer"');
  });
});
