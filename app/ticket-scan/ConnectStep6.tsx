'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { pad2 } from '../lib/endDigitPattern';
import { WallRank, rankOf } from '../lib/connectPredict';
import ConnectGrid, { ticketLabel } from './ConnectGrid';
import { Empty, SummaryBox, Legend, Pager, SmallCard } from './ConnectViews';

// 💡 어떤 번호가 벽(연결 번호)이었던 복권들
function WallTicketsFor({ item, ticketNo }: { item: WallRank; ticketNo: Map<string, number> }) {
  const hits = [...item.hits].sort(
    (a, b) => (ticketNo.get(a.ticket.id) || 0) - (ticketNo.get(b.ticket.id) || 0) || a.enc.digit - b.enc.digit
  );
  const markOf = (h: (typeof hits)[number]) => h.enc.walls.filter((w) => w.number === item.number);
  return (
    <div className="flex flex-col gap-2.5">
      <div className="text-[12.5px] font-black text-gray-900 dark:text-zinc-100">
        <span className="text-[#1E3A8A] dark:text-blue-300">{pad2(item.number)}번</span>이 연결 번호(벽)인 복권 {item.count}장
      </div>
      <Legend items={[['bg-[#1E3A8A]', '연결(벽)'], ['bg-yellow-300', '갇힌 번호'], ['bg-[#1E3A8A] ring-2 ring-orange-400', '이 번호']]} />
      <Pager
        key={item.number}
        items={hits}
        renderOne={(h) => (
          <div key={`${h.ticket.id}-${h.enc.digit}`} className="bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/50 rounded-2xl p-3 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-[13px] font-black text-gray-900 dark:text-zinc-100">{ticketLabel(h.ticket, ticketNo.get(h.ticket.id))}</span>
              <span className="text-[11px] font-bold text-amber-500">끝수 {h.enc.digit} 연결 {h.enc.walls.length}개</span>
            </div>
            <ConnectGrid ticket={h.ticket} walls={h.enc.walls} trapped={h.enc.cells} mark={markOf(h)} />
          </div>
        )}
        renderSmall={(h) => (
          <SmallCard title={ticketLabel(h.ticket, ticketNo.get(h.ticket.id))} sub={`끝${h.enc.digit}`}>
            <ConnectGrid small ticket={h.ticket} walls={h.enc.walls} trapped={h.enc.cells} mark={markOf(h)} />
          </SmallCard>
        )}
      />
    </div>
  );
}

/* ═══════════════════════════════ 6단계: 연결 번호 순위 ═══════════════════════════════ */
export default function Step6View({ walls, ticketNo }: { walls: WallRank[]; ticketNo: Map<string, number> }) {
  const [selected, setSelected] = useState<number | null>(walls[0]?.number ?? null);
  const [showList, setShowList] = useState(false);
  if (walls.length === 0) return <Empty text="1단계 연결 번호가 없습니다" />;
  const countOf = new Map(walls.map((d) => [d.number, d.count]));
  const ranks = rankOf(walls);
  const max = walls[0].count;
  const sel = walls.find((d) => d.number === selected);

  return (
    <div className="flex flex-col gap-3">
      <SummaryBox>
        1단계에서 벽(연결 번호)으로 쓰인 번호 <span className="text-[#1E3A8A] dark:text-blue-300">{walls.length}개</span>
        <br />
        가장 많이: <span className="text-orange-500">{walls.filter((d) => d.count === max).map((d) => `${pad2(d.number)}번`).join(', ')}</span> ({max}장)
      </SummaryBox>
      <p className="text-[11px] text-gray-500 dark:text-zinc-400 break-keep">
        남색 번호를 누르면 그 번호가 연결 번호였던 복권이 아래에 나와요. 작은 숫자는 복권 수예요.
      </p>

      {/* 1~45 번호판 */}
      <div className="grid grid-cols-9 gap-1">
        {Array.from({ length: 45 }, (_, i) => i + 1).map((n) => {
          const c = countOf.get(n);
          const on = c !== undefined;
          const isSel = selected === n;
          return (
            <button
              key={n}
              disabled={!on}
              onClick={() => setSelected(n)}
              className={`relative aspect-square rounded-lg flex items-center justify-center text-[13px] font-black transition-all ${
                on
                  ? isSel
                    ? 'bg-[#1E3A8A] text-white ring-[3px] ring-orange-400 scale-105'
                    : 'bg-[#1E3A8A] text-white'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-300 dark:text-zinc-600'
              }`}
            >
              {pad2(n)}
              {on && (
                <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-orange-500 text-white text-[9px] font-black flex items-center justify-center">
                  {c}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 순위 목록 (펼치기) */}
      <button
        onClick={() => setShowList(!showList)}
        className="flex items-center justify-between px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 text-[12px] font-bold text-gray-700 dark:text-zinc-200"
      >
        순위 목록 보기 ({walls.length}개)
        {showList ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {showList && (
        <div className="flex flex-col gap-1">
          {walls.map((d) => (
            <button
              key={d.number}
              onClick={() => setSelected(d.number)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-left ${selected === d.number ? 'bg-orange-50 dark:bg-orange-500/10' : ''}`}
            >
              <span className={`w-8 text-[11.5px] font-black text-right ${(ranks.get(d.number) || 99) <= 3 ? 'text-orange-500' : 'text-gray-400'}`}>
                {ranks.get(d.number)}위
              </span>
              <span className="w-7 h-7 rounded-full bg-[#1E3A8A] text-white text-[11px] font-black flex items-center justify-center shrink-0">{pad2(d.number)}</span>
              <div className="flex-1 h-2.5 rounded-full bg-gray-200 dark:bg-zinc-700 overflow-hidden">
                <div className="h-full bg-[#1E3A8A] dark:bg-blue-500 rounded-full" style={{ width: `${(d.count / max) * 100}%` }} />
              </div>
              <span className="text-[12px] font-black text-gray-900 dark:text-zinc-100 w-9 text-right">{d.count}장</span>
            </button>
          ))}
        </div>
      )}

      {sel && <WallTicketsFor item={sel} ticketNo={ticketNo} />}
    </div>
  );
}