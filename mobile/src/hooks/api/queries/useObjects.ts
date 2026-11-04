import { useQuery } from '@tanstack/react-query';

import { request } from '../../../lib/request';

async function fetchObjects(): Promise<string[]> {
  const { objects } = await request<{ objects: string[] }>('/api/objects');
  return objects;
}

/** The objects players can be asked to find. The list is fixed on the backend, so fetch it once. */
export function useObjects() {
  const { isLoading, data, isError, error, refetch } = useQuery({ queryKey: ['objects'], queryFn: fetchObjects, staleTime: Infinity });
  return {
    isLoading,
    data,
    isError,
    error,
    refetch,
  };
}
