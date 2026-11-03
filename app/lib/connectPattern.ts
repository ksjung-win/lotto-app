// 💡 끝자리 연결(벽) · 갇힌 번호 분석 도구 (1~3단계)
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

  // ④ 이어진 벽 전체 개수가 minWall 이상인 것만
  return merged
    .map((m) => ({
      digit,
      walls: sortCells(Array.from(m.groups).flatMap((g) => wallGroups[g]).map(toCell)),
      gap: null,
      cells: sortCells(m.cells.map(toCell)),
    }))
    .filter((e) => e.walls.length >= minWall);
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

// 💡 3단계: 2단계에서 갇힌 번호별 중복 (몇 장의 복권에서 갇혔는지)
export type DupNumber = { number: number; count: number; hits: Step2Hit[] };

export type ConnectResult = {
  step1: TicketResult[];   // 1단계: 같은 끝자리로 연결(벽)되어 막힌 구역이 있는 복권
  step2: Step2Hit[];       // 2단계: 한 복권의 연결 번호가 다른 복권의 구역 안에 갇힌 경우
  step2Numbers: number[];  // 2단계에서 뽑힌 번호 (중복 없이)
  step3: DupNumber[];      // 3단계: 많이 갇힌 순서
};

/**
 * 💡 1~3단계 한 번에 계산 (회차의 모든 복권 기준)
 * 1단계: 복권별로 끝자리가 같은 번호로 연결된 패턴 (선택 해제 · 직접 연결 반영)
 * 2단계: A 복권의 연결 번호가, 다른 B 복권의 1단계 막힌 구역 안에 갇혀 있으면 그 번호를 뽑음
 * 3단계: 2단계에서 뽑힌 번호가 몇 장의 복권에서 갇혔는지 세어 많은 순서로 정렬
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
  const step2Numbers = Array.from(new Set(step2.flatMap((h) => h.cells.map((c) => c.number)))).sort((a, b) => a - b);

  // 3단계
  const dup = new Map<number, { targets: Set<string>; hits: Step2Hit[] }>();
  step2.forEach((h) => {
    new Set(h.cells.map((c) => c.number)).forEach((n) => {
      const cur = dup.get(n) || { targets: new Set<string>(), hits: [] };
      cur.targets.add(h.target.id);
      cur.hits.push(h);
      dup.set(n, cur);
    });
  });
  const step3: DupNumber[] = Array.from(dup.entries())
    .map(([number, v]) => ({ number, count: v.targets.size, hits: v.hits }))
    .sort((a, b) => b.count - a.count || a.number - b.number);

  return { step1, step2, step2Numbers, step3 };
};

export type FourStepResult = {
  step1: TicketResult[];                 // 1·2단계: 벽으로 막힌 구역이 있는 복권
  step2Numbers: number[];                // 2단계: 갇힌 번호 모음 (중복 없이)
  step3Digits: Map<number, number[]>;    // 3단계에 쓰는 끝수 → 그 끝수를 만든 갇힌 번호들
  step3: TicketResult[];                 // 3·4단계: 갇힌 번호의 끝수로 막힌 구역이 있는 복권
  step4Numbers: number[];                // 4단계: 갇힌 번호 모음 (중복 없이)
};

const uniqueNumbers = (list: TicketResult[]) =>
  Array.from(new Set(list.flatMap((s) => s.enclosures.flatMap((e) => e.cells.map((c) => c.number))))).sort((a, b) => a - b);

/**
 * 💡 1~4단계 한 번에 계산 (회차의 모든 복권 기준)
 * 복권이 새로 등록될 때마다 다시 계산되므로, 월~토 추가 복권이 자동으로 반영됨
 */
export type OffMap = Record<string, string[]>;                 // 복권 id → 선택 해제한 칸 목록 ("행,열")
export type AddMap = Record<string, Record<string, number>>;   // 복권 id → 직접 연결한 칸 ("행,열" → 끝수)

export const runFourSteps = (tickets: Ticket[], minWall: number, offMap: OffMap = {}, addMap: AddMap = {}): FourStepResult => {
  const offOf = (t: Ticket) => new Set(offMap[t.id] || []);
  const addOf = (t: Ticket) => addMap[t.id] || {};
  const step1: TicketResult[] = [];
  tickets.forEach((ticket) => {
    const enclosures = analyzeTicket(ticket, minWall, undefined, offOf(ticket), addOf(ticket));
    if (enclosures.length > 0) step1.push({ ticket, enclosures });
  });
  const step2Numbers = uniqueNumbers(step1);

  const step3Digits = new Map<number, number[]>();
  step2Numbers.forEach((n) => {
    const d = n % 10;
    step3Digits.set(d, [...(step3Digits.get(d) || []), n]);
  });

  const digits = new Set(step3Digits.keys());
  const step3: TicketResult[] = [];
  tickets.forEach((ticket) => {
    const enclosures = analyzeTicket(ticket, minWall, digits, offOf(ticket), addOf(ticket));
    if (enclosures.length > 0) step3.push({ ticket, enclosures });
  });
  const step4Numbers = uniqueNumbers(step3);

  return { step1, step2Numbers, step3Digits, step3, step4Numbers };
};