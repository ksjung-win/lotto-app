// 💡 끝자리 연결(벽) · 갇힌 번호 분석 도구 (1~5단계)
import type { Ticket } from '../store/useTicketStore';
import { ticketToGrid } from './endDigitPattern';

type Grid = (number | null)[][];

export type GridCell = { row: number; col: number; number: number };

// 💡 연결(벽)로 막힌 구역 1개
export type Enclosure = {
  digit: number;          // 벽을 만든 끝수
  walls: GridCell[];      // 구역을 막고 있는 같은 끝수 번호 (벽)
  gap: GridCell | null;   // 열린 칸 (지금은 사용하지 않음: 완전히 막힌 것만 인정)
  cells: GridCell[];      // 갇힌 번호 (막힌 구역 안의 번호 전체)
};

const N4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];                                    // 구역이 퍼지는 방향 (상하좌우)
const N8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]; // 벽 주변 확인 방향 (대각선 포함)

const ROW_LABELS = ['A', 'B', 'C', 'D', 'E'];
export const cellName = (row: number, col: number) => `${ROW_LABELS[row]}${col + 1}`;

const key = (r: number, c: number) => `${r},${c}`;

// 벽이 아닌 칸들을 상하좌우로 이어서 구역으로 나눔
const splitRegions = (R: number, C: number, wall: Set<string>): string[][] => {
  const seen = new Set<string>();
  const regions: string[][] = [];
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      if (wall.has(key(r, c)) || seen.has(key(r, c))) continue;
      const stack = [[r, c]];
      const region: string[] = [];
      seen.add(key(r, c));
      while (stack.length > 0) {
        const [y, x] = stack.pop()!;
        region.push(key(y, x));
        for (const [dy, dx] of N4) {
          const ny = y + dy;
          const nx = x + dx;
          const k = key(ny, nx);
          if (ny < 0 || ny >= R || nx < 0 || nx >= C || wall.has(k) || seen.has(k)) continue;
          seen.add(k);
          stack.push([ny, nx]);
        }
      }
      regions.push(region);
    }
  }
  return regions;
};

/**
 * 💡 한 끝수(digit)로 막힌 구역 찾기
 * 1) 같은 끝수 번호를 벽으로 놓고, 표가 둘 이상으로 나뉘면 가장 큰 구역을 뺀 나머지가 '막힌 구역'
 * 2) 끝자리가 다른 번호가 하나라도 끼어 끊긴 벽은 제외 (완전히 막힌 것만 인정)
 * 3) 벽은 '이어진 벽 전체'로 셈: 같은 벽이 막은 구역들은 하나로 묶어서 보여줌
 * 4) 이어진 벽(같은 끝수 번호)이 minWall개 이상이어야 함
 *    (예외: 표 모서리 칸 1개를 대각선 2개가 막은 경우는 2개도 인정)
 * 5) off: 사용자가 '선택 해제'한 칸("행,열") → 벽에서 빼고 일반 칸으로 계산
 * 6) add: 사용자가 '직접 연결'한 칸("행,열" → 끝수) → 그 끝수의 벽으로 계산
 */
export const findEnclosures = (grid: Grid, digit: number, minWall: number, off?: Set<string>, add?: Record<string, number>): Enclosure[] => {
  const R = grid.length;
  const C = grid[0].length;
  const walls = new Set<string>();
  for (let r = 0; r < R; r++)
    for (let c = 0; c < C; c++) {
      const n = grid[r][c];
      if (n === null) continue;
      const k = key(r, c);
      const added = add?.[k];
      // 직접 연결한 칸은 고른 끝수의 벽으로만, 나머지는 끝수가 같고 선택 해제하지 않은 칸만 벽
      const isWall = added !== undefined ? added === digit : n % 10 === digit && !off?.has(k);
      if (isWall) walls.add(k);
    }

  const toCell = (k: string): GridCell => {
    const [r, c] = k.split(',').map(Number);
    return { row: r, col: c, number: grid[r][c] as number };
  };
  const sortCells = (list: GridCell[]) => list.sort((p, q) => p.row - q.row || p.col - q.col);

  // ① 벽 번호들을 가로·세로·대각선으로 이어서 '이어진 벽' 묶음으로 나눔
  const wallGroupOf = new Map<string, number>();
  const wallGroups: string[][] = [];
  walls.forEach((start) => {
    if (wallGroupOf.has(start)) return;
    const id = wallGroups.length;
    const group: string[] = [];
    const stack = [start];
    wallGroupOf.set(start, id);
    while (stack.length > 0) {
      const k = stack.pop()!;
      group.push(k);
      const [r, c] = k.split(',').map(Number);
      N8.forEach(([dy, dx]) => {
        const nk = key(r + dy, c + dx);
        if (walls.has(nk) && !wallGroupOf.has(nk)) {
          wallGroupOf.set(nk, id);
          stack.push(nk);
        }
      });
    }
    wallGroups.push(group);
  });

  // ② 벽이 아닌 칸을 구역으로 나누고, 가장 큰 구역을 뺀 나머지 = 막힌 구역
  const pockets = splitRegions(R, C, walls)
    .sort((a, b) => b.length - a.length)
    .slice(1)
    .map((region) => {
      const touched = new Set<number>(); // 이 구역을 막고 있는 '이어진 벽' 번호
      region.forEach((k) => {
        const [r, c] = k.split(',').map(Number);
        N8.forEach(([dy, dx]) => {
          const g = wallGroupOf.get(key(r + dy, c + dx));
          if (g !== undefined) touched.add(g);
        });
      });
      const cells = region.filter((k) => grid[Number(k.split(',')[0])][Number(k.split(',')[1])] !== null);
      return { touched, cells };
    })
    .filter((p) => p.cells.length > 0);

  // ③ 같은 벽을 공유하는 막힌 구역들을 하나로 묶기
  const merged: { groups: Set<number>; cells: string[] }[] = [];
  pockets.forEach((p) => {
    const hits = merged.filter((m) => Array.from(p.touched).some((g) => m.groups.has(g)));
    const into = { groups: new Set(p.touched), cells: [...p.cells] };
    hits.forEach((h) => {
      h.groups.forEach((g) => into.groups.add(g));
      into.cells.push(...h.cells);
      merged.splice(merged.indexOf(h), 1);
    });
    merged.push(into);
  });

  // ④ 이어진 벽 전체 개수가 minWall 이상인 것만 (모서리 예외 포함)
  return merged
    .map((m) => ({
      digit,
      walls: sortCells(Array.from(m.groups).flatMap((g) => wallGroups[g]).map(toCell)),
      gap: null,
      cells: sortCells(m.cells.map(toCell)),
    }))
    .filter((e) => e.walls.length >= minWall || isCornerPair(e, R, C));
};

// 💡 모서리 예외: 표 네 모서리의 칸 1개를 대각선 2개(같은 끝수)가 막으면 연결로 인정
const isCornerPair = (e: { walls: GridCell[]; cells: GridCell[] }, R: number, C: number) => {
  if (e.walls.length !== 2 || e.cells.length !== 1) return false;
  const { row, col } = e.cells[0];
  return (row === 0 || row === R - 1) && (col === 0 || col === C - 1);
};

// 복권 1장의 모든 막힌 구역 (digits를 주면 그 끝수만)
export const analyzeTicket = (ticket: Ticket, minWall: number, digits?: Set<number>, off?: Set<string>, add?: Record<string, number>): Enclosure[] => {
  const grid = ticketToGrid(ticket);
  const result: Enclosure[] = [];
  for (let d = 0; d <= 9; d++) {
    if (digits && !digits.has(d)) continue;
    result.push(...findEnclosures(grid, d, minWall, off, add));
  }
  return result;
};

export type TicketResult = { ticket: Ticket; enclosures: Enclosure[] };

export type OffMap = Record<string, string[]>;                 // 복권 id → 선택 해제한 칸 목록 ("행,열")
export type AddMap = Record<string, Record<string, number>>;   // 복권 id → 직접 연결한 칸 ("행,열" → 끝수)

// 비어 있는 복권은 빼고 순서를 맞춰 정리 (비교·저장용)
export const cleanOff = (map: OffMap): OffMap => {
  const out: OffMap = {};
  Object.keys(map).sort().forEach((id) => {
    if (map[id].length > 0) out[id] = [...map[id]].sort();
  });
  return out;
};
export const cleanAdd = (map: AddMap): AddMap => {
  const out: AddMap = {};
  Object.keys(map).sort().forEach((id) => {
    const keys = Object.keys(map[id]).sort();
    if (keys.length === 0) return;
    out[id] = {};
    keys.forEach((k) => (out[id][k] = map[id][k]));
  });
  return out;
};

// 💡 2단계 결과 1건: source 복권의 연결 번호(벽)가 target 복권의 막힌 구역 안에 갇혀 있는 경우
export type Step2Hit = {
  target: Ticket;        // 번호가 갇혀 있는 복권
  targetEnc: Enclosure;  // 그 복권의 막힌 구역
  source: Ticket;        // 연결 번호를 가진 복권
  sourceEnc: Enclosure;  // 그 복권의 연결(벽)
  cells: GridCell[];     // target 구역 안에 갇힌 번호 중 source 연결 번호와 같은 번호
};

// 💡 2단계에서 추출된 복권 1장 (여러 복권의 번호가 갇혀 있을 수 있음)
export type Step2Ticket = {
  target: Ticket;
  hits: Step2Hit[];      // 어디서 온 번호인지 (출발 복권별)
  walls: GridCell[];     // 번호를 가둔 이 복권의 벽
  cells: GridCell[];     // 갇힌 칸 (주황)
  numbers: number[];     // 갇힌 번호 (중복 없이)
};

// 💡 3·4단계: 갇힌 번호별 중복 (몇 장의 복권에서 갇혔는지)
export type DupNumber = { number: number; count: number; hits: Step2Hit[] };

// 💡 5단계: 추천 조합 1세트
export type Combo = { numbers: number[]; score: number };

export type ConnectResult = {
  step1: TicketResult[];       // 1단계: 같은 끝자리로 연결(벽)되어 막힌 구역이 있는 복권
  step2: Step2Hit[];           // 2단계 (1건씩)
  step2Tickets: Step2Ticket[]; // 2단계: 추출된 복권
  step3: number[];             // 3단계: 갇힌 번호 (작은 순)
  step4: DupNumber[];          // 4단계: 많이 갇힌 순서
};

const uniqCells = (list: GridCell[]) => {
  const seen = new Set<string>();
  return list.filter((c) => {
    const k = key(c.row, c.col);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

/**
 * 💡 1~4단계 한 번에 계산 (회차의 모든 복권 기준)
 * 1단계: 복권별로 끝자리가 같은 번호로 연결된 패턴 (선택 해제 · 직접 연결 반영)
 * 2단계: A 복권의 연결 번호가, 다른 B 복권의 연결 패턴 안에 갇혀 있으면 B 복권을 추출
 * 3단계: 2단계에서 추출한 복권의 갇힌 번호 (A의 연결 번호와 같은 번호만)
 * 4단계: 그 번호가 몇 장의 복권에서 갇혔는지 세어 많은 순서로 정렬
 * 복권이 새로 등록될 때마다 다시 계산되므로, 월~토 추가 복권이 자동으로 반영됨
 */
export const runConnectAnalysis = (tickets: Ticket[], minWall: number, offMap: OffMap = {}, addMap: AddMap = {}): ConnectResult => {
  // 1단계
  const step1: TicketResult[] = [];
  tickets.forEach((ticket) => {
    const enclosures = analyzeTicket(ticket, minWall, undefined, new Set(offMap[ticket.id] || []), addMap[ticket.id] || {});
    if (enclosures.length > 0) step1.push({ ticket, enclosures });
  });

  // 2단계
  const step2: Step2Hit[] = [];
  step1.forEach(({ ticket: target, enclosures: targetEncs }) => {
    targetEncs.forEach((targetEnc) => {
      step1.forEach(({ ticket: source, enclosures: sourceEncs }) => {
        if (source.id === target.id) return; // 다른 복권끼리만
        sourceEncs.forEach((sourceEnc) => {
          const wallNumbers = new Set(sourceEnc.walls.map((w) => w.number));
          const cells = targetEnc.cells.filter((c) => wallNumbers.has(c.number));
          if (cells.length > 0) step2.push({ target, targetEnc, source, sourceEnc, cells });
        });
      });
    });
  });
  const step2Tickets: Step2Ticket[] = [];
  step2.forEach((h) => {
    let t = step2Tickets.find((x) => x.target.id === h.target.id);
    if (!t) {
      t = { target: h.target, hits: [], walls: [], cells: [], numbers: [] };
      step2Tickets.push(t);
    }
    t.hits.push(h);
    t.walls = uniqCells([...t.walls, ...h.targetEnc.walls]);
    t.cells = uniqCells([...t.cells, ...h.cells]);
    t.numbers = Array.from(new Set(t.cells.map((c) => c.number))).sort((a, b) => a - b);
  });

  // 3단계
  const step3 = Array.from(new Set(step2Tickets.flatMap((t) => t.numbers))).sort((a, b) => a - b);

  // 4단계
  const dup = new Map<number, { targets: Set<string>; hits: Step2Hit[] }>();
  step2.forEach((h) => {
    new Set(h.cells.map((c) => c.number)).forEach((n) => {
      const cur = dup.get(n) || { targets: new Set<string>(), hits: [] };
      cur.targets.add(h.target.id);
      cur.hits.push(h);
      dup.set(n, cur);
    });
  });
  const step4: DupNumber[] = Array.from(dup.entries())
    .map(([number, v]) => ({ number, count: v.targets.size, hits: v.hits }))
    .sort((a, b) => b.count - a.count || a.number - b.number);

  return { step1, step2, step2Tickets, step3, step4 };
};

/**
 * 💡 5단계: 패턴 점수 순 추천 (6개 조합 20세트)
 * 번호 점수 = 4단계 중복 장수 × 100 + 1단계에서 갇힌 횟수 × 10 + 이번 회차 복권에 나온 횟수
 * → 점수 높은 번호 15개 안에서 6개 조합을 모두 만들어 합계 점수 순으로 고르되,
 *   비슷한 조합만 나오지 않게 이미 고른 조합과 5개 이상 겹치면 건너뜀
 */
export const recommendCombos = (result: ConnectResult, tickets: Ticket[], count = 20): { combos: Combo[]; scores: Map<number, number> } => {
  const scores = new Map<number, number>();
  const add = (n: number, v: number) => scores.set(n, (scores.get(n) || 0) + v);
  result.step4.forEach((d) => add(d.number, d.count * 100));
  result.step1.forEach((s) => s.enclosures.forEach((e) => e.cells.forEach((c) => add(c.number, 10))));
  tickets.forEach((t) => t.games.forEach((g) => g.numbers.forEach((n) => add(n, 1))));
  if (result.step4.length === 0) return { combos: [], scores };

  const pool = Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, 15)
    .map(([n]) => n);
  if (pool.length < 6) return { combos: [], scores };

  // 6개 조합 모두 만들기 (15개 중 6개 = 5,005가지)
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
    const tooSimilar = combos.some((p) => p.numbers.filter((n) => c.numbers.includes(n)).length >= 5);
    if (!tooSimilar) combos.push(c);
  }
  // 겹침 조건 때문에 20개가 안 되면 남은 조합으로 채움
  for (const c of all) {
    if (combos.length >= count) break;
    if (!combos.includes(c)) combos.push(c);
  }
  return { combos, scores };
};