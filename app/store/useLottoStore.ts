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
  resetBoard: (boardIdx: number) => void; // 현재 표 1개만 초기화하는 기능 추가
}

const initialBoards = Array.from({ length: 50 }, () =>
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
      
      // 현재 표 1개만 비워주는 기능 구현
      resetBoard: (boardIdx) => set((state) => {
        const newBoards = [...state.boards];
        newBoards[boardIdx] = Array.from({ length: 30 }, () => ({ number: null, color: null }));
        return { boards: newBoards, focusedCell: null };
      }),
    }),
    {
      name: 'lotto-storage',
    }
  )
);