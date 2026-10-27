import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CellData } from './useLottoStore';

// 💡 회차별 로또 번호 분석: 저장된 표 1개의 모양
export type SavedRound = {
  id: string;             // 내부 고유 번호 (겹치지 않게 자동 생성)
  round: number;          // 추첨 회차 (예: 1247)
  date: string;           // 저장한 날짜 (예: 20261025)
  seq: number;            // 같은 회차 안에서의 순번 (1, 2, 3...)
  name: string;           // 저장 이름 (예: 1247_20261025_01)
  sourceBoardIdx: number; // 원본 표 번호 (0부터 시작, 화면에는 +1 해서 표시)
  savedAt: number;        // 저장 시각 (밀리초)
  cells: CellData[];      // 저장 시점의 표 30칸 복사본 (숫자 + 색상)
};

interface RoundStore {
  savedRounds: SavedRound[];
  // 스튜디오로 불러온 뒤 자동으로 이동할 표 번호 (저장하지 않는 임시 값)
  jumpToBoard: number | null;
  addRound: (round: number, sourceBoardIdx: number, cells: CellData[]) => SavedRound;
  deleteRound: (id: string) => void;
  setJumpToBoard: (boardIdx: number | null) => void;
}

// 오늘 날짜를 YYYYMMDD 형태로 만들어 주는 함수
export const getTodayString = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
};

// 같은 회차의 다음 순번 계산 (지금까지 가장 큰 순번 + 1)
export const getNextSeq = (savedRounds: SavedRound[], round: number) => {
  const seqs = savedRounds.filter((r) => r.round === round).map((r) => r.seq);
  return seqs.length > 0 ? Math.max(...seqs) + 1 : 1;
};

// 저장 이름 만들기: 회차_날짜_순번(2자리)
export const makeRoundName = (round: number, date: string, seq: number) =>
  `${round}_${date}_${String(seq).padStart(2, '0')}`;

// 오늘 기준 가장 최근에 추첨된 회차 계산 (1회차: 2002-12-07 토요일 20:45, 매주 1회)
export const getLatestDrawNo = () => {
  const firstDraw = new Date('2002-12-07T20:45:00+09:00').getTime();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  return Math.floor((Date.now() - firstDraw) / weekMs) + 1;
};

export const useRoundStore = create<RoundStore>()(
  persist(
    (set, get) => ({
      savedRounds: [],
      jumpToBoard: null,

      addRound: (round, sourceBoardIdx, cells) => {
        const date = getTodayString();
        const seq = getNextSeq(get().savedRounds, round);
        const newItem: SavedRound = {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          round,
          date,
          seq,
          name: makeRoundName(round, date, seq),
          sourceBoardIdx,
          savedAt: Date.now(),
          // 표를 통째로 복사해서 저장 (나중에 스튜디오에서 고쳐도 저장본은 그대로)
          cells: cells.map((c) => ({ number: c.number, color: c.color })),
        };
        set((state) => ({ savedRounds: [...state.savedRounds, newItem] }));
        return newItem;
      },

      deleteRound: (id) =>
        set((state) => ({ savedRounds: state.savedRounds.filter((r) => r.id !== id) })),

      setJumpToBoard: (boardIdx) => set({ jumpToBoard: boardIdx }),
    }),
    {
      name: 'lotto-round-storage',
      // 저장 목록만 휴대폰에 보관하고, 임시 이동 값은 보관하지 않음
      partialize: (state) => ({ savedRounds: state.savedRounds }),
    }
  )
);