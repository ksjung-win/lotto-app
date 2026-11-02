// 💡 끝자리 연결 · 갇힌 번호 4단계 분석 도구
import type { Ticket } from '../store/useTicketStore';
import { ticketToGrid } from './endDigitPattern';

type Grid = (number | null)[][];

export type GridCell = { row: number; col: number; number: number };

// 연결 묶음: 끝자리가 같은 번호들이 맞닿거나 한 칸 떨어져 이어진 것
export type Chain = { digit: number; cells: GridCell[] };

// 갇힌 번호: 같은 연결 묶음의 번호가 양쪽에서 막고 있는 칸
export type Trap = GridCell & {
  digits: number[];  // 이 칸을 가둔 연결의 끝수 (여러 개일 수 있음)
  dirs: string[];    // 막힌 방향 (가로, 세로, 대각↘, 대각↙)
};

// 8방향 (가로·세로·대각선)
const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

// 양쪽을 확인하는 4가지 축
const AXES: { a: number[]; b: number[]; name: string }[] = [
  { a: [0, -1], b: [0, 1], name: '가로' },
  { a: [-1, 0], b: [1, 0], name: '세로' },
  { a: [-1, -1], b: [1, 1], name: '대각↘' },
  { a: [-1, 1], b: [1, -1], name: '대각↙' },
];

const ROW_LABELS = ['A', 'B', 'C', 'D', 'E'];
export const cellName = (row: number, col: number) => `${ROW_LABELS[row]}${col + 1}`;

/**
 * 💡 1단계 규칙: 연결 찾기
 * - 끝자리가 같은 번호가 맞닿아 있거나(1칸), 한 칸 떨어져 있으면(2칸) 연결 (가로·세로·대각선 모두)
 * - 이어진 묶음이 minLen개 이상이면 '연결'
 */
export const findChains = (grid: Grid, minLen: number): Chain[] => {
  const R = grid.length;
  const C = grid[0].length;
  const seen = new Set<string>();
  const chains: Chain[] = [];

  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      const start = grid[r][c];
      if (start === null || seen.has(`${r},${c}`)) continue;
      const digit = start % 10;
      const stack = [[r, c]];
      const cells: GridCell[] = [];
      seen.add(`${r},${c}`);

      while (stack.length > 0) {
        const [y, x] = stack.pop()!;
        cells.push({ row: y, col: x, number: grid[y][x]! });
        for (const [dy, dx] of DIRS) {
          for (const step of [1, 2]) {
            const ny = y + dy * step;
            const nx = x + dx * step;
            if (ny < 0 || ny >= R || nx < 0 || nx >= C) continue;
            const n = grid[ny][nx];
            if (n === null || n % 10 !== digit || seen.has(`${ny},${nx}`)) continue;
            seen.add(`${ny},${nx}`);
            stack.push([ny, nx]);
          }
        }
      }

      if (cells.length >= minLen) {
        cells.sort((p, q) => p.row - q.row || p.col - q.col);
        chains.push({ digit, cells });
      }
    }
  }
  return chains;
};

/**
 * 💡 2단계 규칙: 갇힌 번호 찾기
 * - 연결에 속하지 않은 칸 중, 같은 연결 묶음의 번호가 양쪽(가로·세로·대각선 중 하나)에서 막고 있는 칸
 * - 여러 연결에 동시에 갇히면 한 번만 표시하고 끝수를 모두 기록
 */
export const findTraps = (grid: Grid, chains: Chain[]): Trap[] => {
  const traps = new Map<string, Trap>();
  chains.forEach((chain) => {
    const inChain = new Set(chain.cells.map((p) => `${p.row},${p.col}`));
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[0].length; c++) {
        const n = grid[r][c];
        if (n === null || inChain.has(`${r},${c}`)) continue;
        const dirs = AXES.filter(
          ({ a, b }) => inChain.has(`${r + a[0]},${c + a[1]}`) && inChain.has(`${r + b[0]},${c + b[1]}`)
        ).map((ax) => ax.name);
        if (dirs.length === 0) continue;

        const key = `${r},${c}`;
        const prev = traps.get(key);
        if (prev) {
          if (!prev.digits.includes(chain.digit)) prev.digits.push(chain.digit);
          dirs.forEach((d) => !prev.dirs.includes(d) && prev.dirs.push(d));
        } else {
          traps.set(key, { row: r, col: c, number: n, digits: [chain.digit], dirs });
        }
      }
    }
  });
  return Array.from(traps.values()).sort((p, q) => p.row - q.row || p.col - q.col);
};

export type TicketChains = { ticket: Ticket; chains: Chain[]; traps: Trap[] };

export type FourStepResult = {
  step1: TicketChains[];                 // 1단계: 연결이 있는 복권 (+ 2단계 갇힌 번호)
  step2Numbers: number[];                // 2단계: 갇힌 번호 모음 (중복 없이)
  step3Digits: Map<number, number[]>;    // 3단계에 쓰는 끝수 → 그 끝수를 만든 갇힌 번호들
  step3: TicketChains[];                 // 3단계: 갇힌 번호의 끝수로 연결된 복권 (+ 4단계 갇힌 번호)
  step4Numbers: number[];                // 4단계: 갇힌 번호 모음 (중복 없이)
};

/**
 * 💡 1~4단계 한 번에 계산 (회차의 모든 복권 기준)
 * 복권이 새로 등록될 때마다 다시 계산되므로, 월~토 추가 복권이 자동으로 반영됨
 */
export const runFourSteps = (tickets: Ticket[], minLen: number): FourStepResult => {
  const grids = tickets.map((t) => ({ ticket: t, grid: ticketToGrid(t) }));

  // 1·2단계
  const step1: TicketChains[] = [];
  grids.forEach(({ ticket, grid }) => {
    const chains = findChains(grid, minLen);
    if (chains.length > 0) step1.push({ ticket, chains, traps: findTraps(grid, chains) });
  });
  const step2Numbers = Array.from(new Set(step1.flatMap((s) => s.traps.map((t) => t.number)))).sort((a, b) => a - b);

  // 3단계에 쓸 끝수
  const step3Digits = new Map<number, number[]>();
  step2Numbers.forEach((n) => {
    const d = n % 10;
    step3Digits.set(d, [...(step3Digits.get(d) || []), n]);
  });

  // 3·4단계: 같은 회차 모든 복권에서, 갇힌 번호의 끝수로 된 연결만 사용
  const step3: TicketChains[] = [];
  grids.forEach(({ ticket, grid }) => {
    const chains = findChains(grid, minLen).filter((ch) => step3Digits.has(ch.digit));
    if (chains.length > 0) step3.push({ ticket, chains, traps: findTraps(grid, chains) });
  });
  const step4Numbers = Array.from(new Set(step3.flatMap((s) => s.traps.map((t) => t.number)))).sort((a, b) => a - b);

  return { step1, step2Numbers, step3Digits, step3, step4Numbers };
};