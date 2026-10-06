import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CellData = {
  number: number | null;
  color: string | null;
};

interface LottoStore {
  boards: CellData[][];
  focusedCell: { boardIdx: number; cellIdx: number } | null;
  setFocusedCell: (boardIdx: number | null, cellIdx: number | null) => void;
  setCellColor: (boardIdx: number, cellIdx: number, color: string | null) => void;
  setCellNumber: (num: number) => void;
  resetBoards: () => void;
  resetBoard: (boardIdx: number) => void;
}

// 1. 표의 개수를 50개에서 200개로 대폭 확장
const initialBoards = Array.from({ length: 200 }, () =>
  Array.from({ length: 30 }, () => ({ number: null, color: null }))
);

export const useLottoStore = create<LottoStore>()(
  persist(
    (set) => ({
      boards: initialBoards,
      focusedCell: null,
      
      setFocusedCell: (boardIdx, cellIdx) => {
        if (boardIdx === null || cellIdx === null) {
          set({ focusedCell: null });
        } else {
          set({ focusedCell: { boardIdx, cellIdx } });
        }
      },
      
      setCellColor: (boardIdx, cellIdx, color) => set((state) => {
        const newBoards = [...state.boards];
        newBoards[boardIdx] = [...newBoards[boardIdx]];
        newBoards[boardIdx][cellIdx] = { ...newBoards[boardIdx][cellIdx], color };
        return { boards: newBoards };
      }),
      
      setCellNumber: (num) => set((state) => {
        if (!state.focusedCell) return state;
        
        const { boardIdx, cellIdx } = state.focusedCell;
        const newBoards = [...state.boards];
        newBoards[boardIdx] = [...newBoards[boardIdx]];
        newBoards[boardIdx][cellIdx] = { ...newBoards[boardIdx][cellIdx], number: num };
        
        return { boards: newBoards, focusedCell: null };
      }),

      resetBoards: () => set({ boards: initialBoards, focusedCell: null }),
      
      resetBoard: (boardIdx) => set((state) => {
        const newBoards = [...state.boards];
        newBoards[boardIdx] = Array.from({ length: 30 }, () => ({ number: null, color: null }));
        return { boards: newBoards, focusedCell: null };
      }),
    }),
    {
      name: 'lotto-storage',
      // 2. 마이그레이션 안전장치: 기존 사용자의 50개 데이터를 유지하면서 200개로 자연스럽게 병합
      merge: (persistedState: any, currentState) => {
        if (persistedState?.boards) {
          const mergedBoards = [...currentState.boards];
          persistedState.boards.forEach((board: any, index: number) => {
            if (index < 200) mergedBoards[index] = board;
          });
          return { ...currentState, ...persistedState, boards: mergedBoards };
        }
        return { ...currentState, ...persistedState };
      }
    }
  )
);