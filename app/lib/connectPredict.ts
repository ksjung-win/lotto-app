// 💡 6단계(연결 번호 순위) · 7단계(예측 · 당첨 대입) 계산
import type { Ticket } from '../store/useTicketStore';
import { ConnectResult, Enclosure, Combo } from './connectPattern';

/* ═══════════════ 6단계: 연결 번호 순위 ═══════════════ */
// 벽(연결 번호)으로 쓰인 번호: 몇 장의 복권에서 벽이었는지
export type WallHit = { ticket: Ticket; enc: Enclosure };
export type WallRank = { number: number; count: number; hits: WallHit[] };

export const wallRanking = (result: ConnectResult): WallRank[] => {
  const map = new Map<number, { tickets: Set<string>; hits: WallHit[] }>();
  result.step1.forEach(({ ticket, enclosures }) =>
    enclosures.forEach((enc) =>
      new Set(enc.walls.map((w) => w.number)).forEach((n) => {
        const cur = map.get(n) || { tickets: new Set<string>(), hits: [] };
        cur.tickets.add(ticket.id);
        cur.hits.push({ ticket, enc });
        map.set(n, cur);
      })
    )
  );
  return Array.from(map.entries())
    .map(([number, v]) => ({ number, count: v.tickets.size, hits: v.hits }))
    .sort((a, b) => b.count - a.count || a.number - b.number);
};

// 같은 장수는 같은 순위
export const rankOf = (list: { number: number; count: number }[]) => {
  const out = new Map<number, number>();
  list.forEach((d) => out.set(d.number, 1 + list.filter((x) => x.count > d.count).length));
  return out;
};

/* ═══════════════ 7단계: 예측 번호 (방식 A·B·C) ═══════════════ */
export type MethodKey = 'A' | 'B' | 'C';
export const METHODS: { key: MethodKey; label: string; desc: string }[] = [
  { key: 'A', label: 'A. 갇힌 번호 중심', desc: '6단계 중복 순위가 높은 번호 (7단계 추천 방식)' },
  { key: 'B', label: 'B. 연결 번호 중심', desc: '8단계 연결 번호 순위가 높은 번호' },
  { key: 'C', label: 'C. 혼합', desc: 'A와 B를 함께 반영' },
];

// 번호 점수: 핵심 장수 × 100 + 보조 횟수 × 10 + 이번 회차 복권에 나온 횟수
export const methodScores = (result: ConnectResult, tickets: Ticket[], method: MethodKey) => {
  const scores = new Map<number, number>();
  const add = (n: number, v: number) => scores.set(n, (scores.get(n) || 0) + v);
  const useTrap = method === 'A' || method === 'C';
  const useWall = method === 'B' || method === 'C';
  if (useTrap) {
    result.step4.forEach((d) => add(d.number, d.count * 100));
    result.step1.forEach((s) => s.enclosures.forEach((e) => e.cells.forEach((c) => add(c.number, 10))));
  }
  if (useWall) {
    wallRanking(result).forEach((d) => add(d.number, d.count * 100));
    result.step1.forEach((s) => s.enclosures.forEach((e) => e.walls.forEach((c) => add(c.number, 10))));
  }
  tickets.forEach((t) => t.games.forEach((g) => g.numbers.forEach((n) => n > 0 && add(n, 1)))); // 0 = 빈칸
  return scores;
};

// 점수 높은 번호 순서 (같으면 작은 번호 먼저)
export const topNumbers = (scores: Map<number, number>, n = 10) =>
  Array.from(scores.entries())
    .filter(([, s]) => s >= 10) // 패턴에 한 번도 안 나온 번호(출현 점수만 있는 번호)는 제외
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, n)
    .map(([num]) => num);

// 점수 높은 번호 15개 안에서 6개 조합 (합계 점수 순, 5개 이상 겹치는 조합은 건너뜀)
export const makeCombos = (scores: Map<number, number>, count = 5): Combo[] => {
  const pool = Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, 15)
    .map(([n]) => n);
  if (pool.length < 6) return [];
  const all: Combo[] = [];
  const pick = (start: number, chosen: number[]) => {
    if (chosen.length === 6) {
      all.push({ numbers: [...chosen].sort((a, b) => a - b), score: chosen.reduce((s, n) => s + (scores.get(n) || 0), 0) });
      return;
    }
    for (let i = start; i < pool.length; i++) pick(i + 1, [...chosen, pool[i]]);
  };
  pick(0, []);
  all.sort((a, b) => b.score - a.score || a.numbers.join(',').localeCompare(b.numbers.join(',')));
  const combos: Combo[] = [];
  for (const c of all) {
    if (combos.length >= count) break;
    if (!combos.some((p) => p.numbers.filter((n) => c.numbers.includes(n)).length >= 5)) combos.push(c);
  }
  return combos;
};

export type Prediction = { method: MethodKey; top10: number[]; combos: Combo[] };
export const predict = (result: ConnectResult, tickets: Ticket[]): Prediction[] =>
  METHODS.map(({ key }) => {
    const scores = methodScores(result, tickets, key);
    return { method: key, top10: topNumbers(scores, 10), combos: makeCombos(scores, 5) };
  });

/* ═══════════════ 7단계: 당첨 번호 대입 ═══════════════ */
export type Draw = { round: number; numbers: number[]; bonus: number; date?: string };

const C = (n: number, k: number) => {
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return r;
};
// 45개 중 N개를 골랐을 때 당첨 번호가 k개 이상 들어갈 확률 (무작위 기준)
export const chanceAtLeast = (N: number, k: number) => {
  let p = 0;
  for (let x = k; x <= 6; x++) p += (C(N, x) * C(45 - N, 6 - x)) / C(45, 6);
  return p;
};

export type DrawCheck = {
  appear: number;      // 당첨 번호가 이 회차 표에 나온 횟수
  wall: number;        // 그중 벽(연결 번호)이었던 횟수
  trap: number;        // 그중 갇힌 번호였던 횟수
  cellsAll: number;    // 전체 칸 수
  cellsWall: number;   // 전체 벽 칸 수
  cellsTrap: number;   // 전체 갇힌 칸 수
  perNumber: { number: number; appear: number; wall: number; trap: number }[];
  wallSet: number[];   // 벽으로 쓰인 번호 종류
  step3: number[];
  step3Hit: number[];
  step3Chance: number; // 3단계 적중이 무작위로 나올 확률
  wallHit: number[];
  wallChance: number;  // 벽 번호 종류 안에 당첨 번호가 이만큼 들어갈 확률 (무작위)
};

export const checkDraw = (result: ConnectResult, tickets: Ticket[], draw: Draw): DrawCheck => {
  const W = draw.numbers;
  const appearOf = new Map<number, number>();
  tickets.forEach((t) => t.games.forEach((g) => g.numbers.forEach((n) => n > 0 && appearOf.set(n, (appearOf.get(n) || 0) + 1)))); // 0 = 빈칸
  const per = new Map(W.map((n) => [n, { number: n, appear: appearOf.get(n) || 0, wall: 0, trap: 0 }]));
  let cellsWall = 0;
  let cellsTrap = 0;
  const wallSet = new Set<number>();
  result.step1.forEach((s) =>
    s.enclosures.forEach((e) => {
      e.walls.forEach((w) => {
        cellsWall++;
        wallSet.add(w.number);
        const p = per.get(w.number);
        if (p) p.wall++;
      });
      e.cells.forEach((c) => {
        cellsTrap++;
        const p = per.get(c.number);
        if (p) p.trap++;
      });
    })
  );
  const perNumber = W.map((n) => per.get(n)!);
  const step3Hit = W.filter((n) => result.step3.includes(n));
  const wallHit = W.filter((n) => wallSet.has(n));
  return {
    appear: perNumber.reduce((a, p) => a + p.appear, 0),
    wall: perNumber.reduce((a, p) => a + p.wall, 0),
    trap: perNumber.reduce((a, p) => a + p.trap, 0),
    cellsAll: tickets.reduce((a, t) => a + t.games.reduce((b, g) => b + g.numbers.filter((n) => n > 0).length, 0), 0), // 빈칸 제외
    cellsWall,
    cellsTrap,
    perNumber,
    wallSet: Array.from(wallSet).sort((a, b) => a - b),
    step3: result.step3,
    step3Hit,
    step3Chance: chanceAtLeast(result.step3.length, step3Hit.length),
    wallHit,
    wallChance: chanceAtLeast(wallSet.size, wallHit.length),
  };
};

// 예측 방식별 성적 (상위 10개에 든 당첨 번호 수, 5세트 중 최고 적중)
export type MethodScore = { method: MethodKey; top10Hit: number; bestCombo: number };
export const scorePredictions = (preds: Prediction[], draw: Draw): MethodScore[] =>
  preds.map((p) => ({
    method: p.method,
    top10Hit: p.top10.filter((n) => draw.numbers.includes(n)).length,
    bestCombo: Math.max(0, ...p.combos.map((c) => c.numbers.filter((n) => draw.numbers.includes(n)).length)),
  }));

/* ═══════════════ 당첨 번호 불러오기 (역대 당첨 번호 조회와 같은 자료) ═══════════════ */
let drawsPromise: Promise<Map<number, Draw>> | null = null;
export const loadDraws = (force = false): Promise<Map<number, Draw>> => {
  if (!drawsPromise || force) {
    drawsPromise = fetch('https://smok95.github.io/lotto/results/all.json')
      .then((res) => res.json())
      .then((data: { draw_no: number; numbers: number[]; bonus_no: number; date?: string }[]) => {
        const map = new Map<number, Draw>();
        if (Array.isArray(data))
          data.forEach((d) => {
            if (d && Array.isArray(d.numbers) && d.numbers.length >= 6)
              map.set(d.draw_no, { round: d.draw_no, numbers: d.numbers.slice(0, 6).map(Number), bonus: Number(d.bonus_no), date: d.date });
          });
        return map;
      })
      .catch((e) => {
        drawsPromise = null; // 다음에 다시 시도
        throw e;
      });
  }
  return drawsPromise;
};

// 직접 입력한 당첨 번호 (자료를 못 불러올 때만, 이 기기에 저장)
const manualKey = (round: number) => `lotto-draw-manual-${round}`;
export const readManualDraw = (round: number): Draw | null => {
  try {
    const v = localStorage.getItem(manualKey(round));
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
};
export const saveManualDraw = (draw: Draw) => {
  try {
    localStorage.setItem(manualKey(draw.round), JSON.stringify(draw));
  } catch {
    /* 무시 */
  }
};