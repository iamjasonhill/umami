import { create } from 'zustand';
import { getItem, setItem, removeItem } from '@/lib/storage';
import { WEBSITE_SELECTION_CONFIG } from '@/lib/constants';

type WebsiteSelectionState = {
  websiteId?: string;
  setWebsiteId: (websiteId?: string) => void;
};

const initialWebsiteId = getItem(WEBSITE_SELECTION_CONFIG) as string | undefined;

const useWebsiteSelectionStore = create<WebsiteSelectionState>(set => ({
  websiteId: initialWebsiteId,
  setWebsiteId: websiteId => {
    if (websiteId) {
      setItem(WEBSITE_SELECTION_CONFIG, websiteId);
    } else {
      removeItem(WEBSITE_SELECTION_CONFIG);
    }

    set({ websiteId });
  },
}));

export default useWebsiteSelectionStore;
