import { create } from 'zustand';

interface UIState {
  pendingQueueCount: number;
  setPendingQueueCount: (count: number) => void;
  incrementPendingQueue: () => void;
  decrementPendingQueue: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  pendingQueueCount: 0,
  setPendingQueueCount: (count) => set({ pendingQueueCount: count }),
  incrementPendingQueue: () =>
    set((state) => ({ pendingQueueCount: state.pendingQueueCount + 1 })),
  decrementPendingQueue: () =>
    set((state) => ({
      pendingQueueCount: Math.max(0, state.pendingQueueCount - 1),
    })),
}));