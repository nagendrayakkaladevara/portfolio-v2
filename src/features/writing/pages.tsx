import { useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Undo2 } from 'lucide-react';
import { portfolio } from '@/src/data/portfolio';
import { PageMeta } from '@/src/components/layout/page-meta';
import { usePost, useWritingArchive } from './queries';
import { ContentState, formatPostDate, PostList } from './post-list';
import { ArticleBody, getHeadings } from './markdown';
import { ContentError } from './repository';

export function WritingPage() {
  const query = useWritingArchive();
  const posts = query.data?.pages.flatMap(page => page.data) || [];
  return <main id="main" className="writing-page" tabIndex={-1}>
    <PageMeta title={`Writing — ${portfolio.name}`} description="Notes on interfaces, software, and the small decisions that make better products." noIndex={query.isPending || query.isError || posts.some(p => p.isDemo)} />
    <Link to="/" className="back-link"><Undo2 size={12} /> {portfolio.name}</Link>
    <h1 className="writing-page-title">Writing</h1>
    <p className="writing-intro">Notes on interfaces, software, and the things I’m learning. <a className="text-link" href="/feed.xml">RSS</a>.</p>
    <section className="writing-category" aria-labelledby="articles-heading"><h2 className="section-label" id="articles-heading">Articles</h2>
      {query.isPending ? <ContentState loading /> : query.isError && !posts.length ? <ContentState error onRetry={() => void query.refetch()} /> : posts.length ? <PostList posts={posts} /> : <ContentState />}
      {query.hasNextPage && <button className="more-link load-more" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>{query.isFetchingNextPage ? 'Loading…' : 'More articles →'}</button>}
      {query.isFetchNextPageError && <ContentState error onRetry={() => void query.fetchNextPage()} />}
    </section>
    {posts.some(p => p.isDemo) && <p className="sample-note archive-sample-note">These are sample articles for the portfolio preview.</p>}
  </main>;
}

export function ArticlePage() {
  const { slug = '' } = useParams();
  const query = usePost(slug);
  const post = query.data;
  const { hash } = useLocation();
  useEffect(() => {
    if (!post || !hash) return;
    try { document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView(); } catch { /* Ignore malformed fragments. */ }
  }, [post, hash]);
  if (query.isError && query.error instanceof ContentError && query.error.status === 404) return <NotFoundPage />;
  const headings = post ? getHeadings(post.bodyMarkdown) : [];
  return <main id="main" className="article-page" tabIndex={-1}>
    <PageMeta title={post ? `${post.title} — ${portfolio.name}` : `Writing — ${portfolio.name}`} description={post?.excerpt || 'Article'} noIndex={!post || post.isDemo} />
    <aside className="article-sidebar"><Link to="/posts" className="back-link"><Undo2 size={12} /> Writing</Link>{post && headings.length > 0 && <nav className="article-toc" aria-label="On this page"><p>{post.title}</p><ul>{headings.map(heading => <li key={heading.id}><a href={`#${heading.id}`}>{heading.text}</a></li>)}</ul></nav>}</aside>
    {query.isPending ? <ContentState loading /> : query.isError ? <ContentState error onRetry={() => void query.refetch()} /> : post && <>
      <header className="article-header"><h1>{post.title}</h1><time dateTime={post.publishedAt}>{formatPostDate(post.publishedAt, true)}</time></header>
      {post.isDemo && <p className="article-sample-note">Sample article · Illustrative content</p>}
      <ArticleBody key={post.id} markdown={post.bodyMarkdown} media={post.media} />
      <footer className="article-footer"><Link to="/posts" className="text-link">← All writing</Link><span>{post.readingTimeMinutes} min read</span></footer>
    </>}
  </main>;
}

export function NotFoundPage() {
  return <main id="main" className="writing-page" tabIndex={-1}><PageMeta title={`Page not found — ${portfolio.name}`} description="This page could not be found." noIndex /><Link to="/posts" className="back-link"><Undo2 size={12} /> Writing</Link><h1 className="writing-page-title">This page isn’t here.</h1><p className="writing-intro">The link may have changed, or this article is no longer published.</p><Link to="/" className="more-link">Back to the portfolio →</Link></main>;
}
