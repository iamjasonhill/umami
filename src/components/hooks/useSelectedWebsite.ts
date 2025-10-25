import { useCallback } from 'react';
import useWebsiteSelectionStore from '@/store/websiteSelection';

export function useSelectedWebsite() {
  const websiteId = useWebsiteSelectionStore(state => state.websiteId);
  const setWebsiteId = useWebsiteSelectionStore(state => state.setWebsiteId);

  const clearWebsiteId = useCallback(() => {
    setWebsiteId(undefined);
  }, [setWebsiteId]);

  return {
    websiteId,
    setWebsiteId,
    clearWebsiteId,
  };
}

export default useSelectedWebsite;
