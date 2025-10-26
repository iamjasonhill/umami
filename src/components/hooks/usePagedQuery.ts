import { UseQueryOptions } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { PageResult, PageParams, PagedQueryResult } from '@/lib/types';
import { useApi } from './useApi';
import { useNavigation } from './useNavigation';

export function usePagedQuery<T = any>({
  queryKey,
  queryFn,
  ...options
}: Omit<UseQueryOptions, 'queryFn'> & { queryFn: (params?: object) => any }): PagedQueryResult<T> {
  const { query: queryParams } = useNavigation();
  const [params, setParams] = useState<PageParams>({
    search: '',
    page: +queryParams.page || 1,
  });

  useEffect(() => {
    const nextPage = Number.parseInt(queryParams.page as string, 10);
    const normalizedPage = Number.isNaN(nextPage) || nextPage < 1 ? 1 : nextPage;

    setParams(prev => {
      const currentPage = typeof prev.page === 'string' ? Number(prev.page) : prev.page;
      if (currentPage === normalizedPage) {
        return prev;
      }

      return {
        ...prev,
        page: normalizedPage,
      } as PageParams;
    });
  }, [queryParams.page]);

  const { useQuery } = useApi();
  const { data, ...query } = useQuery({
    queryKey: [{ ...queryKey, ...params }],
    queryFn: () => queryFn(params as any),
    ...options,
  });

  return {
    result: data as PageResult<T>,
    query,
    params,
    setParams,
  };
}

export default usePagedQuery;
