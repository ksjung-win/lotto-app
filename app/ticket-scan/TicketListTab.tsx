'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Trash2, LayoutGrid, List, Ticket as TicketIcon } from 'lucide-react';
import { useTicketStore } from '../store/useTicketStore';
import { getBallColor, pad2, ticketToGrid } from '../lib/endDigitPattern';

// 등록 시각 표시 (예: 10/27 13:25)
const formatTime = (ms: number) => {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function TicketListTab({ onGoToInput }: { onGoToInput: () => void }) {
  const { tickets, deleteTicket, deleteRound } = useTicketStore();
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [gridViewIds, setGridViewIds] = useState<string[]>([]); // 표로 보기 중인 복권

  // 💡 회차 목록 (최신 회차가 앞) + 장수·게임 수
  const roundList = useMemo(() => {
    const map = new Map<number, { count: number; games: number }>();
    tickets.forEach((t) => {
      const cur = map.get(t.round) || { count: 0, games: 0 };
      map.set(t.round, { count: cur.count + 1, games: cur.games + t.games.length });
    });
    return Array.from(map.entries()).map(([round, v]) => ({ round, ...v })).sort((a, b) => b.round - a.round);
  }, [tickets]);

  // 처음이거나 선택한 회차가 사라지면 최신 회차 선택
  useEffect(() => {
    if (!roundList.some((r) => r.round === selectedRound)) {
      setSelectedRound(roundList.length > 0 ? roundList[0].round : null);
    }
  }, [roundList, selectedRound]);

  const items = useMemo(
    () => tickets.filter((t) => t.round === selectedRound).sort((a, b) => a.createdAt - b.createdAt),
    [tickets, selectedRound]
  );

  const toggleGridView = (id: string) =>
    setGridViewIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  if (roundList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 px-6 gap-3">
        <div className="w-14 h-14 bg-gray-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-gray-400">
          <TicketIcon size={26} />
        </div>
        <h2 className="text-base font-bold text-gray-800 dark:text-zinc-200">등록된 복권이 없습니다</h2>
        <p className="text-xs text-gray-500 dark:text-zinc-400 break-keep">입력 탭에서 복권 사진을 찍거나 골라 주세요.</p>
        <button onClick={onGoToInput} className="mt-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold rounded-xl shadow-md">
          복권 등록하러 가기
        </button>
      </div>
    );
  }

  const selectedInfo = roundList.find((r) => r.round === selectedRound);

  return (
    <div className="flex flex-col gap-3 pb-4">
      {/* 💡 회차 버튼 */}
      <div className="flex gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] -mx-1 px-1">
        {roundList.map(({ round, count, games }) => (
          <button
            key={round}
            onClick={() => setSelectedRound(round)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${
              selectedRound === round
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 border-gray-200 dark:border-zinc-700'
            }`}
          >
            {round}회 <span className="opacity-75">({count}장·{games}게임)</span>
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-gray-500 dark:text-zinc-400">
          <span className="text-amber-500">{selectedRound}회</span> 복권 {selectedInfo?.count}장 · {selectedInfo?.games}게임
        </span>
        <button
          onClick={() => {
            if (selectedRound !== null && window.confirm(`${selectedRound}회 복권 ${selectedInfo?.count}장을 모두 삭제하시겠습니까?`)) {
              deleteRound(selectedRound);
            }
          }}
          className="text-[11px] font-bold text-red-500 px-2 py-1 rounded-md border border-red-500/30"
        >
          회차 전체 삭제
        </button>
      </div>

      {/* 💡 복권 카드 */}
      {items.map((t, idx) => {
        const isGrid = gridViewIds.includes(t.id);
        const trShort = t.tr ? `TR …${t.tr.slice(0, 10).slice(-4)}` : '직접 입력';
        return (
          <div key={t.id} className="bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/50 rounded-2xl p-3">
            <div className="flex justify-between items-center mb-2.5">
              <div>
                <div className="text-[13px] font-black text-gray-900 dark:text-zinc-100">
                  {idx + 1}. {trShort}
                </div>
                <div className="text-[10.5px] text-gray-500 dark:text-zinc-400">
                  {t.source === 'qr' ? 'QR 등록' : '직접 입력'} · {formatTime(t.createdAt)} · {t.games.length}게임
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => toggleGridView(t.id)}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-[11px] font-bold text-gray-600 dark:text-zinc-300"
                >
                  {isGrid ? <List size={12} /> : <LayoutGrid size={12} />}
                  {isGrid ? '번호로' : '표로'}
                </button>
                <button
                  onClick={() => window.confirm(`${idx + 1}번 복권(${trShort})을 삭제하시겠습니까?`) && deleteTicket(t.id)}
                  className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-red-500/30 text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {isGrid ? (
              /* 6×5 표 모양 (스튜디오와 같은 배치) */
              <div className="grid grid-cols-6 border-l border-t border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900">
                {ticketToGrid(t).flat().map((n, i) => (
                  <div key={i} className="aspect-square border-r border-b border-gray-300 dark:border-zinc-600 flex items-center justify-center font-bold text-base text-gray-900 dark:text-white">
                    {n !== null ? pad2(n) : ''}
                  </div>
                ))}
              </div>
            ) : (
              /* A~E 번호 공 */
              <div className="flex flex-col gap-1.5">
                {t.games.map((g) => (
                  <div key={g.label} className="flex items-center gap-1.5">
                    <span className="w-4 text-[11px] font-black text-gray-400">{g.label}</span>
                    {g.numbers.map((n, i) => (
                      <span key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold shadow-sm ${getBallColor(n)}`}>
                        {pad2(n)}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
