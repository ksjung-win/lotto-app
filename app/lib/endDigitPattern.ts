// 💡 끝수 구역 패턴 분석 도구
import type { Ticket } from '../store/useTicketStore';

export type ZoneSetKey = '3x3' | '4x4' | '3x5';

export type Zone = {
  id: number;   // 구역 번호 (1부터)
  row: number;  // 시작 줄 (0 = A게임)
  col: number;  // 시작 열 (0 = 1열)
  rows: number; // 세로 줄 수
  cols: number; // 가로 칸 수
};

// 💡 표(가로 6칸 × 세로 5줄)를 나누는 방식
export const ZONE_SETS: Record<ZoneSetKey, { label: string; defaultMin: number; zones: Zone[] }> = {
  // 3×3 4개: 네 모서리, C줄 겹침
  '3x3': {
    label: '3×3 (4구역)',
    defaultMin: 3,
    zones: [
      { id: 1, row: 0, col: 0, rows: 3, cols: 3 },
      { id: 2, row: 0, col: 3, rows: 3, cols: 3 },
      { id: 3, row: 2, col: 0, rows: 3, cols: 3 },
      { id: 4, row: 2, col: 3, rows: 3, cols: 3 },
    ],
  },
  // 4×4 4개: 네 모서리
  '4x4': {
    label: '4×4 (4구역)',
    defaultMin: 4,
    zones: [
      { id: 1, row: 0, col: 0, rows: 4, cols: 4 },
      { id: 2, row: 0, col: 2, rows: 4, cols: 4 },
      { id: 3, row: 1, col: 0, rows: 4, cols: 4 },
      { id: 4, row: 1, col: 2, rows: 4, cols: 4 },
    ],
  },
  // 3×5 2개: 왼쪽 절반, 오른쪽 절반
  '3x5': {
    label: '3×5 (2구역)',
    defaultMin: 4,
    zones: [
      { id: 1, row: 0, col: 0, rows: 5, cols: 3 },
      { id: 2, row: 0, col: 3, rows: 5, cols: 3 },
    ],
  },
};

export type PatternCell = { row: number; col: number; number: number };

export type PatternFinding = {
  zone: Zone;
  digit: number;        // 끝수 (0~9)
  cells: PatternCell[]; // 해당 칸들
};

// 복권 → 6×5 표 (A~E게임이 1~5줄, 번호는 작은 순서로 1~6열). 빈 칸은 null
export const ticketToGrid = (ticket: Ticket): (number | null)[][] =>
  Array.from({ length: 5 }, (_, r) => {
    const game = ticket.games[r];
    return Array.from({ length: 6 }, (_, c) => (game ? game.numbers[c] ?? null : null));
  });

// 💡 복권 1장 분석: 각 구역에서 끝수가 같은 번호가 minCount개 이상인 경우를 찾음
export const analyzeTicket = (ticket: Ticket, setKey: ZoneSetKey, minCount: number): PatternFinding[] => {
  const grid = ticketToGrid(ticket);
  const findings: PatternFinding[] = [];

  ZONE_SETS[setKey].zones.forEach((zone) => {
    const byDigit: PatternCell[][] = Array.from({ length: 10 }, () => []);
    for (let r = zone.row; r < zone.row + zone.rows; r++) {
      for (let c = zone.col; c < zone.col + zone.cols; c++) {
        const n = grid[r][c];
        if (n !== null) byDigit[n % 10].push({ row: r, col: c, number: n });
      }
    }
    byDigit.forEach((cells, digit) => {
      if (cells.length >= minCount) findings.push({ zone, digit, cells });
    });
  });

  return findings;
};

// 💡 끝수별 표시 색 (0~9)
export const DIGIT_COLORS = [
  'bg-slate-300 text-gray-900',
  'bg-red-300 text-gray-900',
  'bg-orange-300 text-gray-900',
  'bg-yellow-300 text-gray-900',
  'bg-lime-300 text-gray-900',
  'bg-emerald-300 text-gray-900',
  'bg-cyan-300 text-gray-900',
  'bg-blue-300 text-gray-900',
  'bg-violet-300 text-gray-900',
  'bg-pink-300 text-gray-900',
];

// 💡 공식 로또 공 색상
export const getBallColor = (num: number) => {
  if (num <= 10) return 'bg-[#fbc400] text-gray-900';
  if (num <= 20) return 'bg-[#69c8f2] text-gray-900';
  if (num <= 30) return 'bg-[#ff7272] text-white';
  if (num <= 40) return 'bg-[#aaa] text-white';
  return 'bg-[#b0d840] text-gray-900';
};

// 숫자를 두 자리로 표시 (예: 8 → 08)
export const pad2 = (n: number) => String(n).padStart(2, '0');