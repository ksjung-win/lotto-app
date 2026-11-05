'use client';

import React from 'react';
import { Ticket } from '../store/useTicketStore';
import { ticketToGrid, pad2 } from '../lib/endDigitPattern';
import { GridCell } from '../lib/connectPattern';

// 💡 연결 분석 화면들이 함께 쓰는 도구
export const ticketLabel = (ticket: Ticket, no?: number) =>
  `${no !== undefined ? `${no}. ` : ''}${ticket.tr ? `TR …${ticket.tr.slice(0, 10).slice(-4)}` : '직접 입력'}`;
export const cellKey = (p: { row: number; col: number }) => `${p.row},${p.col}`;
export const numsText = (cells: GridCell[]) => cells.map((c) => pad2(c.number)).join('·');

// 💡 복권 1장 표
// 남색: 연결(벽) · 노란색: 갇힌 번호 · 주황색: 2단계에서 뽑힌 번호 · 주황 테두리: 출처 복권의 그 번호
// (1단계 화면에서는 벽 번호 선택 해제 · 직접 연결도 여기서 처리)
export default function ConnectGrid({
  ticket, walls = [], trapped = [], highlight = [], mark = [], off = [], add = {}, editing = false, editDigit = null, onTap, small = false,
}: {
  ticket: Ticket;
  walls?: GridCell[];              // 남색으로 칠할 벽
  trapped?: GridCell[];            // 노란색으로 칠할 갇힌 번호
  highlight?: GridCell[];          // 주황색으로 칠할 번호
  mark?: GridCell[];               // 주황 테두리를 두를 번호 (출처 복권에서 '이 번호가 갇혔다' 표시)
  off?: string[];                  // 선택 해제한 칸 (점선)
  add?: Record<string, number>;    // 직접 연결한 칸 → 끝수
  editing?: boolean;               // 직접 연결 중이면 아무 칸이나 누를 수 있음
  editDigit?: number | null;       // 직접 연결할 끝수 (같은 끝수 번호를 주황 글씨로 보여줌)
  onTap?: (cellKey: string, isWall: boolean) => void;
  small?: boolean;                 // 작은 표 (두 장을 나란히 볼 때)
}) {
  const grid = ticketToGrid(ticket);
  const wallSet = new Set(walls.map(cellKey));
  const trapSet = new Set(trapped.map(cellKey));
  const hiSet = new Set(highlight.map(cellKey));
  const markSet = new Set(mark.map(cellKey));
  const offSet = new Set(off);

  return (
    <div className="grid grid-cols-6 border-l border-t border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900">
      {grid.map((row, r) =>
        row.map((n, c) => {
          const key = `${r},${c}`;
          const box = `aspect-square border-r border-b border-gray-300 dark:border-zinc-600 flex items-center justify-center font-bold ${small ? 'text-[11px]' : 'text-[15px]'}`;
          if (n === null) return <div key={key} className={box} />;
          const addDigit = add[key];                     // 직접 연결한 칸이면 그 끝수
          const isAdd = addDigit !== undefined;
          const isOff = !isAdd && offSet.has(key);       // 선택 해제한 칸
          const isWall = wallSet.has(key);
          const canTap = !!onTap && (isAdd || isOff || isWall || editing);
          const cls = isAdd
            ? 'bg-[#1E3A8A] text-white ring-[3px] ring-inset ring-orange-400'
            : isOff && trapSet.has(key)
            ? 'bg-yellow-300 text-gray-900 outline-2 outline-dashed -outline-offset-4 outline-gray-600' // 💡 선택 해제해서 갇힌 번호가 된 칸
            : isOff
            ? 'bg-gray-200 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400 outline-2 outline-dashed -outline-offset-4 outline-gray-500 dark:outline-zinc-400'
            : hiSet.has(key)
            ? 'bg-orange-500 text-white'
            : trapSet.has(key)
            ? 'bg-yellow-300 text-gray-900'
            : isWall
            ? 'bg-[#1E3A8A] text-white'
            : editing && n % 10 === editDigit
            ? 'text-orange-500 bg-orange-100 dark:bg-orange-500/20'
            : editing
            ? 'text-gray-500 dark:text-zinc-400 bg-orange-50/60 dark:bg-orange-500/5'
            : 'text-gray-400 dark:text-zinc-500';
          return (
            <div
              key={key}
              onClick={canTap ? () => onTap!(key, isWall) : undefined}
              className={`relative ${box} ${cls} ${markSet.has(key) ? 'ring-[3px] ring-inset ring-orange-400' : ''} ${canTap ? 'cursor-pointer active:scale-95' : ''}`}
            >
              {pad2(n)}
              {isAdd && <span className="absolute top-0.5 right-1 text-[9px] font-black text-orange-300">끝{addDigit}</span>}
            </div>
          );
        })
      )}
    </div>
  );
}