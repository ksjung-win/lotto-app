// 💡 끝자리 벽 · 갇힌 구역 4단계 분석 도구
import type { Ticket } from '../store/useTicketStore';
import { ticketToGrid } from './endDigitPattern';

type Grid = (number | null)[][];

export type GridCell = { row: number; col: number; number: number };

// 💡 연결(벽)로 막힌 구역 1개
export type Enclosure = {
  digit: number;          // 벽을 만든 끝수
  walls: GridCell[];      // 구역을 막고 있는 같은 끝수 번호 (벽)
  gap: GridCell | null;   // 열린 칸 (1개까지 닫힌 것으로 봄). 없으면 null
  cells: GridCell[];      // 갇힌 번호 (막힌 구역 안의 번호 전체)
};

const N4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];                                    // 구역이 퍼지는 방향 (상하좌우)
const N8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]; // 벽이 이어지는 방향 (대각선 포함)

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
 * 💡 열린 칸이 될 수 있는 자리인지 확인
 * 같은 끝수 번호 두 개 사이에 끼어 있는 한 칸만 인정 (가로·세로·대각선, 예: 24·27·34)
 * 벽과 표 끝 사이의 빈자리는 열린 칸이 아님
 */
const isGapCandidate = (walls: Set<string>, r: number, c: number) =>
  N8.some(([dy, dx]) => walls.has(key(r - dy, c - dx)) && walls.has(key(r + dy, c + dx)));

/**
 * 💡 한 끝수(digit)로 막힌 구역 찾기
 * 1) 같은 끝수 번호를 벽으로 놓고, 표가 둘 이상으로 나뉘면 가장 큰 구역을 뺀 나머지가 '막힌 구역'
 * 2) 열린 칸 1개를 벽으로 채웠을 때 새로 막히는 구역도 인정 (같은 끝수 벽을 가장 많이 쓰는 것, 같으면 더 촘촘한 것 우선)
 * 3) 구역을 막는 같은 끝수 번호가 minWall개 이상이어야 함
 */
export const findEnclosures = (grid: Grid, digit: number, minWall: number): Enclosure[] => {
  const R = grid.length;
  const C = grid[0].length;
  const walls = new Set<string>();
  for (let r = 0; r < R; r++)
    for (let c = 0; c < C; c++) {
      const n = grid[r][c];
      if (n !== null && n % 10 === digit) walls.add(key(r, c));
    }

  const toCell = (k: string): GridCell => {
    const [r, c] = k.split(',').map(Number);
    return { row: r, col: c, number: grid[r][c] as number };
  };

  // 벽 배치에서 막힌 구역 목록 계산
  const enclosedBy = (wallSet: Set<string>) => {
    const regions = splitRegions(R, C, wallSet).sort((a, b) => b.length - a.length);
    const result: { area: Set<string>; walls: string[]; cells: string[] }[] = [];
    regions.slice(1).forEach((region) => {
      const cells = region.filter((k) => grid[Number(k.split(',')[0])][Number(k.split(',')[1])] !== null);
      const border = new Set<string>();
      region.forEach((k) => {
        const [r, c] = k.split(',').map(Number);
        N8.forEach(([dy, dx]) => {
          const nk = key(r + dy, c + dx);
          if (walls.has(nk)) border.add(nk);
        });
      });
      if (cells.length > 0 && border.size >= minWall) {
        result.push({ area: new Set(region), walls: Array.from(border), cells });
      }
    });
    return result;
  };

  const sortCells = (list: GridCell[]) => list.sort((p, q) => p.row - q.row || p.col - q.col);

  // 1) 끊김 없이 막힌 구역
  const closed = enclosedBy(walls);
  const closedArea = new Set(closed.flatMap((e) => Array.from(e.area)));
  const out: Enclosure[] = closed.map((e) => ({
    digit,
    walls: sortCells(e.walls.map(toCell)),
    gap: null,
    cells: sortCells(e.cells.map(toCell)),
  }));

  // 2) 열린 칸 1개로 막힌 구역
  const candidates: { area: Set<string>; walls: string[]; cells: string[]; gap: string }[] = [];
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      const k = key(r, c);
      if (walls.has(k) || grid[r][c] === null || closedArea.has(k)) continue;
      if (!isGapCandidate(walls, r, c)) continue;
      enclosedBy(new Set([...walls, k])).forEach((e) => {
        if (Array.from(e.area).some((a) => closedArea.has(a))) return;
        candidates.push({ ...e, gap: k });
      });
    }
  }
  candidates.sort((a, b) => b.walls.length - a.walls.length || a.area.size - b.area.size);
  const used = new Set<string>();
  candidates.forEach((e) => {
    if (Array.from(e.area).some((a) => used.has(a))) return;
    e.area.forEach((a) => used.add(a));
    out.push({
      digit,
      walls: sortCells(e.walls.map(toCell)),
      gap: toCell(e.gap),
      cells: sortCells(e.cells.map(toCell)),
    });
  });

  return out;
};

// 복권 1장의 모든 막힌 구역 (digits를 주면 그 끝수만)
export const analyzeTicket = (ticket: Ticket, minWall: number, digits?: Set<number>): Enclosure[] => {
  const grid = ticketToGrid(ticket);
  const result: Enclosure[] = [];
  for (let d = 0; d <= 9; d++) {
    if (digits && !digits.has(d)) continue;
    result.push(...findEnclosures(grid, d, minWall));
  }
  return result;
};

export type TicketResult = { ticket: Ticket; enclosures: Enclosure[] };

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
export const runFourSteps = (tickets: Ticket[], minWall: number): FourStepResult => {
  const step1: TicketResult[] = [];
  tickets.forEach((ticket) => {
    const enclosures = analyzeTicket(ticket, minWall);
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
    const enclosures = analyzeTicket(ticket, minWall, digits);
    if (enclosures.length > 0) step3.push({ ticket, enclosures });
  });
  const step4Numbers = uniqueNumbers(step3);

  return { step1, step2Numbers, step3Digits, step3, step4Numbers };
};