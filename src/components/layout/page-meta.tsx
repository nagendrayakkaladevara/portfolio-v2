import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function PageMeta({ title, description, noIndex = false }: { title: string; description: string; noIndex?: boolean }) {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = title;
    const set = (selector: string, attribute: string, value: string) => document.querySelector(selector)?.setAttribute(attribute, value);
    set('meta[name="description"]', 'content', description);
    set('meta[property="og:title"]', 'content', title);
    set('meta[property="og:description"]', 'content', description);
    set('meta[property="og:url"]', 'content', `${window.location.origin}${pathname}`);
    set('meta[name="robots"]', 'content', noIndex ? 'noindex, nofollow' : 'index, follow');
    set('link[rel="canonical"]', 'href', `${window.location.origin}${pathname}`);
  }, [title, description, noIndex, pathname]);
  return null;
}
