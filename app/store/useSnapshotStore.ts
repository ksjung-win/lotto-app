import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Draw, DrawCheck, Prediction, MethodScore } from '../lib/connectPredict';

// 💡 추첨이 끝난 회차의 '고정 기록' (7단계 당첨 대입 결과 + 그때의 예측)
//    한 번 저장되면 다시 계산하지 않고 이 저장본만 보여줌 → 지난 회차 결과가 바뀌지 않음
export type WallSnap = {
  check: DrawCheck;               // 당첨 번호 대입 결과
  rank4: Record<string, number>;  // 4단계 순위 (번호 → 순위)
  rank6: Record<string, number>;  // 6단계 순위 (번호 → 순위)
  preds: Prediction[];            // 그때의 예측 (A·B·C)
  scores: MethodScore[];          // 예측 성적
  verified: boolean;              // 자동 검증 통과 여부
};
export type Snapshot = {
  round: number;
  frozenAt: number;                 // 확정 시각
  draw: Draw;                       // 당첨 번호
  ticketCount: number;              // 확정 때 복권 수
  byWall: Record<string, WallSnap>; // 최소 벽 3·4·5·6개 결과 모두
};

interface SnapshotStore {
  snapshots: Record<string, Snapshot>;
  put: (s: Snapshot) => void;                         // 없을 때만 저장 (먼저 확정한 것이 기준)
  replaceAll: (snapshots: Record<string, Snapshot>) => void; // 연동으로 맞출 때
}

export const useSnapshotStore = create<SnapshotStore>()(
  persist(
    (set) => ({
      snapshots: {},
      put: (s) =>
        set((state) => {
          const cur = state.snapshots[s.round];
          if (cur && cur.frozenAt <= s.frozenAt) return state;
          return { snapshots: { ...state.snapshots, [s.round]: s } };
        }),
      replaceAll: (snapshots) => set({ snapshots }),
    }),
    { name: 'lotto-snapshots' }
  )
);

// 💡 기록이 확정된(잠긴) 회차인지
export const isRoundLocked = (round: number) => !!useSnapshotStore.getState().snapshots[round];