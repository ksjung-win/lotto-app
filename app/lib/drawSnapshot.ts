// 💡 지난 회차 기록 자동 확정 (추첨 결과가 나온 뒤 앱을 처음 열 때 한 번)
import type { Ticket } from '../store/useTicketStore';
import { useTicketStore } from '../store/useTicketStore';
import { useSnapshotStore, Snapshot, WallSnap } from '../store/useSnapshotStore';
import { runConnectAnalysis } from './connectPattern';
import { verifyConnect } from './connectVerify';
import { readEdits } from './editsStore';
import { Draw, predict, checkDraw, scorePredictions, wallRanking, rankOf, loadDraws } from './connectPredict';
import { useSyncStatus } from './cloudSync';

export const WALL_OPTIONS = [3, 4, 5, 6];

// 회차 기록 만들기 (최소 벽 3·4·5·6개 모두)
export const buildSnapshot = (round: number, allTickets: Ticket[], draw: Draw): Snapshot => {
  const tickets = allTickets.filter((t) => t.round === round).sort((a, b) => a.createdAt - b.createdAt);
  const e = readEdits(round);
  const byWall: Record<string, WallSnap> = {};
  WALL_OPTIONS.forEach((mw) => {
    const result = runConnectAnalysis(tickets, mw, e.off, e.add, e.flip);
    const preds = predict(result, tickets);
    const toObj = (m: Map<number, number>) => Object.fromEntries(Array.from(m.entries()).map(([n, r]) => [String(n), r]));
    byWall[mw] = {
      check: checkDraw(result, tickets, draw),
      rank4: toObj(rankOf(result.step4)),
      rank6: toObj(rankOf(wallRanking(result))),
      preds,
      scores: scorePredictions(preds, draw),
      verified: verifyConnect(tickets, mw, result, e.off, e.add).ok,
    };
  });
  return { round, frozenAt: Date.now(), draw, ticketCount: tickets.length, byWall };
};

let started = false;
let running = false;
let lastLoad = 0;

// 💡 확정할 회차가 있으면 확정 (연동 중이면 첫 연동이 끝난 뒤에)
const run = async () => {
  if (running) return;
  const sync = useSyncStatus.getState();
  if (!sync.checked) return;                       // 로그인 상태 확인 전
  if (sync.email && sync.lastSync === null) return; // 로그인했는데 아직 첫 연동 전
  const tickets = useTicketStore.getState().tickets;
  const snaps = useSnapshotStore.getState().snapshots;
  const rounds = Array.from(new Set(tickets.map((t) => t.round))).filter((r) => !snaps[r]);
  if (rounds.length === 0) return;
  running = true;
  try {
    const force = Date.now() - lastLoad > 30 * 60 * 1000; // 30분마다 당첨 번호 자료 새로 받기
    const draws = await loadDraws(force);
    lastLoad = Date.now();
    rounds.forEach((r) => {
      const d = draws.get(r);
      if (d && !useSnapshotStore.getState().snapshots[r]) useSnapshotStore.getState().put(buildSnapshot(r, useTicketStore.getState().tickets, d));
    });
  } catch {
    /* 자료를 못 받으면 다음 기회에 */
  } finally {
    running = false;
  }
};

export const startAutoFreeze = () => {
  if (started || typeof window === 'undefined') return;
  started = true;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const later = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(run, 1500);
  };
  useSyncStatus.subscribe(later);
  useTicketStore.subscribe(later);
  later();
};