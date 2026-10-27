import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Section } from '@/src/components/section';
import { useRecentPosts } from './queries';
import type { PostSummary } from './contracts';

export function formatPostDate(value: string, long = false) {
  return new Intl.DateTimeFormat('en-US', { month: long ? 'long' : 'short', ...(long ? { day: 'numeric' as const } : {}), year: 'numeric', timeZone: 'UTC' }).format(new Date(value));
}
export function PostList({ posts, variant = 'archive' }: { posts: PostSummary[]; variant?: 'home' | 'archive' }) {
  return <ul className={`writing-list writing-list-${variant}`}>{posts.map(post => <li key={post.id}><Link to={`/posts/${post.slug}`} className="writing-row"><span className="writing-title">{post.title}</span><span className="writing-leader" aria-hidden="true" /><time dateTime={post.publishedAt}>{formatPostDate(post.publishedAt)}</time></Link></li>)}</ul>;
}
export function ContentState({ loading, error, onRetry }: { loading?: boolean; error?: boolean; onRetry?: () => void }) {
  if (loading) return <div className="writing-loading" role="status" aria-label="Loading articles">{[0, 1, 2].map(n => <span key={n} />)}<span className="sr-only">Loading articles…</span></div>;
  if (error) return <p className="writing-state" role="alert">Unable to load writing. <button className="text-link" onClick={onRetry}>Try again</button>.</p>;
  return <p className="writing-state">Nothing published yet. More soon.</p>;
}
export function RecentWriting() {
  const query = useRecentPosts();
  return <Section id="writing" title="Writing">
    {query.isPending ? <ContentState loading /> : query.isError ? <ContentState error onRetry={() => void query.refetch()} /> : query.data.data.length ? <PostList posts={query.data.data} variant="home" /> : <ContentState />}
    <Link className="more-link" to="/posts">All writing <ArrowRight size={13} aria-hidden="true" /></Link>
    {query.data?.data.some(p => p.isDemo) && <p className="sample-note">Sample articles for the portfolio preview.</p>}
  </Section>;
}
