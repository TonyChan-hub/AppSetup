import { create } from 'zustand';
import { getMmkvStorage } from '@/services/mmkvStorage';

type TemplateState = {
  count: number;
  increment: () => void;
  hydrate: () => void;
};

const storage = getMmkvStorage('template-store');
const KEY = 'template-count';

export const useTemplateStore = create<TemplateState>((set, get) => ({
  count: 0,
  increment: () => {
    const next = get().count + 1;
    storage.set(KEY, String(next));
    set({ count: next });
  },
  hydrate: () => {
    const raw = storage.getString(KEY);
    const parsed = raw ? Number(raw) : 0;
    set({ count: Number.isFinite(parsed) ? parsed : 0 });
  },
}));

export function getTemplateCount(): number {
  return useTemplateStore.getState().count;
}
