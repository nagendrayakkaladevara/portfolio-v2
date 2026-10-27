import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { contentRepository } from './repository';

export function useRecentPosts() {
  return useQuery({ queryKey: ['writing', 'recent'], queryFn: ({ signal }) => contentRepository.listPosts({ limit: 5, signal }) });
}
export function useWritingArchive() {
  return useInfiniteQuery({
    queryKey: ['writing', 'archive'], initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => contentRepository.listPosts({ limit: 20, cursor: pageParam, signal }),
    getNextPageParam: page => page.pagination.hasMore ? page.pagination.nextCursor ?? undefined : undefined,
  });
}
export function usePost(slug: string) {
  return useQuery({ queryKey: ['writing', 'post', slug], queryFn: ({ signal }) => contentRepository.getPost(slug, signal) });
}
