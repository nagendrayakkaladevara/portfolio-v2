import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';
import type { Root } from 'mdast';
import type { ArticleMedia } from './contracts';

export function headingId(text: string) {
  return `section-${text.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-') || 'heading'}`;
}
function annotateHeadings(tree: Root) {
  const used = new Set<string>();
  const headings: { id: string; text: string }[] = [];
  visit(tree, 'heading', node => {
    if (node.depth !== 2) return;
    const text = toString(node);
    const base = headingId(text);
    let id = base;
    let suffix = 2;
    while (used.has(id)) id = `${base}-${suffix++}`;
    used.add(id);
    node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id } };
    headings.push({ id, text });
  });
  return headings;
}
export function getHeadings(markdown: string) { return annotateHeadings(unified().use(remarkParse).use(remarkGfm).parse(markdown)); }
function remarkHeadingIds() { return (tree: Root) => { annotateHeadings(tree); }; }

export function ArticleBody({ markdown, media }: { markdown: string; media: ArticleMedia[] }) {
  return <article className="article-prose"><Markdown remarkPlugins={[remarkGfm, remarkHeadingIds]} skipHtml components={{
    // Markdown h1s are deliberately demoted: the page owns its only h1.
    h1: ({ children }) => <h2>{children}</h2>,
    a: ({ href, children }) => <a href={href} {...(href?.startsWith('https://') || href?.startsWith('http://') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{children}</a>,
    img: ({ src, alt }) => {
      const asset = media.find(item => item.url === src);
      // Article images must be declared in the validated media list.
      return asset ? <span className="article-image"><img src={asset.url} alt={asset.alt || alt || ''} width={asset.width} height={asset.height} loading="lazy" decoding="async" />{asset.caption && <span className="image-caption">{asset.caption}</span>}</span> : <span className="image-unavailable">Image unavailable{alt ? `: ${alt}` : ''}</span>;
    },
  }}>{markdown}</Markdown></article>;
}
