'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { pad2 } from '../lib/endDigitPattern';
import { TriangleTicket, SameRank, rowsText } from '../lib/trianglePattern';
import { rankOf } from '../lib/connectPredict';
import ConnectGrid, { ticketLabel } from './ConnectGrid';
import { Empty, SummaryBox, Legend, Pager, SmallCard } from './ConnectViews';

/* ═══════════════════════════════ 4단계: 삼각 패턴 ═══════════════════════════════ */
export function TriangleView({ list, total, ticketNo }: { list: TriangleTicket[]; total: number; ticketNo: Map<string, number> }) {
  if (list.length === 0) return <Empty text="같은 번호로 된 삼각 패턴이 있는 복권이 없습니다" />;
  const triCount = list.reduce((a, t) => a + t.triangles.length, 0);
  const numbers = Array.from(new Set(list.flatMap((t) => t.triangles.map((x) => x.number)))).sort((a, b) => a - b);
  const sorted = [...list].sort((a, b) => (ticketNo.get(a.ticket.id) || 0) - (ticketNo.get(b.ticket.id) || 0));
  const subOf = (t: TriangleTicket) => t.triangles.map((x) => `${pad2(x.number)}번 ${rowsText(x.topRow)}`).join(' / ');

  return (
    <div className="flex flex-col gap-3">
      <SummaryBox>
        삼각 패턴이 있는 복권 <span className="text-orange-500">{list.length}장</span> / 전체 {total}장 (삼각형 {triCount}개)
        <br />
        삼각형 번호: <span className="text-orange-500">{numbers.map(pad2).join(' · ')}</span>
      </SummaryBox>
      <p className="text-[11px] text-gray-500 dark:text-zinc-400 break-keep">
        같은 번호 3개가 연속된 3줄에 하나씩 있고, 위·아래는 같은 칸 · 가운데는 바로 옆 칸인 경우(&lt; 또는 &gt; 모양)예요.
      </p>
      <Legend items={[['bg-orange-500', '삼각형'], ['bg-yellow-300', '3줄 안의 동일번호']]} />
      <Pager
        items={sorted}
        renderOne={(t) => (
          <div className="bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/50 rounded-2xl p-3 flex flex-col gap-2">
            <div className="flex justify-between items-center gap-2">
              <span className="text-[13px] font-black text-gray-900 dark:text-zinc-100 truncate">{ticketLabel(t.ticket, ticketNo.get(t.ticket.id))}</span>
              <span className="text-[11px] font-bold text-orange-500 shrink-0">{subOf(t)}</span>
            </div>
            <ConnectGrid
              ticket={t.ticket}
              highlight={t.triangles.flatMap((x) => x.cells)}
              trapped={t.triangles.flatMap((x) => x.same.flatMap((s) => s.cells))}
            />
            {t.triangles.map((x, i) => (
              <div key={i} className="text-[11.5px] font-bold text-gray-700 dark:text-zinc-300 break-keep">
                {pad2(x.number)}번 {x.shape} 모양 · {rowsText(x.topRow)}줄 · 동일번호{' '}
                {x.same.length > 0 ? <span className="text-amber-600 dark:text-amber-400">{x.same.map((s) => pad2(s.number)).join(' · ')}</span> : <span className="text-gray-400">없음</span>}
              </div>
            ))}
          </div>
        )}
        renderSmall={(t) => (
          <SmallCard title={ticketLabel(t.ticket, ticketNo.get(t.ticket.id))} sub={t.triangles.map((x) => pad2(x.number)).join('·')}>
            <ConnectGrid small ticket={t.ticket} highlight={t.triangles.flatMap((x) => x.cells)} trapped={t.triangles.flatMap((x) => x.same.flatMap((s) => s.cells))} />
          </SmallCard>
        )}
      />
    </div>
  );
}

/* ═══════════════════════════════ 5단계: 동일번호 ═══════════════════════════════ */
export function SameNumberView({ ranks, triTickets, ticketNo }: { ranks: SameRank[]; triTickets: number; ticketNo: Map<string, number> }) {
  const [selected, setSelected] = useState<number | null>(ranks[0]?.number ?? null);
  const [showList, setShowList] = useState(false);
  if (triTickets === 0) return <Empty text="4단계 삼각 패턴이 있는 복권이 없습니다" />;
  if (ranks.length === 0) return <Empty text={`삼각 패턴 복권 ${triTickets}장의 3줄 안에 동일번호가 없습니다`} />;
  const countOf = new Map(ranks.map((d) => [d.number, d.count]));
  const rk = rankOf(ranks);
  const max = ranks[0].count;
  const sel = ranks.find((d) => d.number === selected);
  const hits = sel ? [...sel.hits].sort((a, b) => (ticketNo.get(a.ticket.id) || 0) - (ticketNo.get(b.ticket.id) || 0)) : [];

  return (
    <div className="flex flex-col gap-3">
      <SummaryBox>
        삼각 패턴 복권 {triTickets}장에서 뽑은 동일번호 <span className="text-orange-500">{ranks.length}개</span>
        <br />
        {ranks.map((d) => `${pad2(d.number)}번 ${d.count}장`).join(' · ')}
      </SummaryBox>
      <p className="text-[11px] text-gray-500 dark:text-zinc-400 break-keep">
        삼각형이 있는 3줄 안에서 2줄 이상에 나온 번호예요(삼각형 번호 제외). 노란 번호를 누르면 그 번호가 나온 복권이 아래에 나와요. 작은 숫자는 복권 수예요.
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
                    ? 'bg-yellow-300 text-gray-900 ring-[3px] ring-orange-400 scale-105'
                    : 'bg-yellow-300 text-gray-900'
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
        순위 목록 보기 ({ranks.length}개)
        {showList ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {showList && (
        <div className="flex flex-col gap-1">
          {ranks.map((d) => (
            <button
              key={d.number}
              onClick={() => setSelected(d.number)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-left ${selected === d.number ? 'bg-orange-50 dark:bg-orange-500/10' : ''}`}
            >
              <span className={`w-8 text-[11.5px] font-black text-right ${(rk.get(d.number) || 99) <= 3 ? 'text-orange-500' : 'text-gray-400'}`}>{rk.get(d.number)}위</span>
              <span className="w-7 h-7 rounded-full bg-yellow-300 text-gray-900 text-[11px] font-black flex items-center justify-center shrink-0">{pad2(d.number)}</span>
              <div className="flex-1 h-2.5 rounded-full bg-gray-200 dark:bg-zinc-700 overflow-hidden">
                <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${(d.count / max) * 100}%` }} />
              </div>
              <span className="text-[12px] font-black text-gray-900 dark:text-zinc-100 w-9 text-right">{d.count}장</span>
            </button>
          ))}
        </div>
      )}

      {sel && (
        <div className="flex flex-col gap-2.5">
          <div className="text-[12.5px] font-black text-gray-900 dark:text-zinc-100">
            <span className="text-amber-600 dark:text-amber-400">{pad2(sel.number)}번</span>이 동일번호인 복권 {sel.count}장
          </div>
          <Legend items={[['bg-orange-500', '삼각형'], ['bg-yellow-300', '동일번호'], ['bg-yellow-300 ring-2 ring-orange-400', '이 번호']]} />
          <Pager
            key={sel.number}
            items={hits}
            renderOne={(h) => (
              <div key={`${h.ticket.id}-${h.tri.topRow}-${h.tri.number}`} className="bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/50 rounded-2xl p-3 flex flex-col gap-2">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[13px] font-black text-gray-900 dark:text-zinc-100 truncate">{ticketLabel(h.ticket, ticketNo.get(h.ticket.id))}</span>
                  <span className="text-[11px] font-bold text-orange-500 shrink-0">
                    삼각형 {pad2(h.tri.number)}번 · {rowsText(h.tri.topRow)}줄
                  </span>
                </div>
                <ConnectGrid ticket={h.ticket} highlight={h.tri.cells} trapped={h.tri.same.flatMap((s) => s.cells)} mark={h.same.cells} />
              </div>
            )}
            renderSmall={(h) => (
              <SmallCard title={ticketLabel(h.ticket, ticketNo.get(h.ticket.id))} sub={`${pad2(h.tri.number)} ${rowsText(h.tri.topRow)}`}>
                <ConnectGrid small ticket={h.ticket} highlight={h.tri.cells} trapped={h.tri.same.flatMap((s) => s.cells)} mark={h.same.cells} />
              </SmallCard>
            )}
          />
        </div>
      )}
    </div>
  );
}