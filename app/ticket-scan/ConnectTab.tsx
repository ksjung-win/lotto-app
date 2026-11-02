'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Ticket as TicketIcon, Sparkles } from 'lucide-react';
import { useTicketStore, Ticket } from '../store/useTicketStore';
import { ticketToGrid, pad2 } from '../lib/endDigitPattern';
import { runFourSteps, cellName, Enclosure, TicketResult } from '../lib/connectPattern';

type Step = 1 | 2 | 3 | 4;
const MIN_OPTIONS = [3, 4, 5, 6]; // 구역을 막는 같은 끝수 번호(벽)의 최소 개수

// 회차별 '마지막으로 확인한 시각' (새로 추가된 복권 표시용, 이 휴대폰에만 저장)
const seenKey = (round: number) => `lotto-connect-seen-${round}`;
const readSeen = (round: number): number | null => {
  try {
    const v = localStorage.getItem(seenKey(round));
    return v ? Number(v) : null;
  } catch {
    return null;
  }
};
const writeSeen = (round: number, time: number) => {
  try {
    localStorage.setItem(seenKey(round), String(time));
  } catch {
    /* 저장이 안 되는 환경이면 무시 */
  }
};

// 💡 단계별 색 (1·2단계: 남색 벽/노란 구역, 3·4단계: 보라 벽/빨간 구역, 열린 칸: 주황 테두리)
const STEP_STYLE = {
  wall12: 'bg-[#1E3A8A] text-white',
  trap12: 'bg-yellow-300 text-gray-900',
  wall34: 'bg-violet-600 text-white',
  trap34: 'bg-red-400 text-white',
  gap: 'bg-white dark:bg-zinc-900 text-orange-500 ring-[3px] ring-inset ring-orange-500',
};

// 💡 복권 1장 표 (벽, 열린 칸, 갇힌 구역 색칠)
function ConnectGrid({ ticket, enclosures, showTrapped, phase }: { ticket: Ticket; enclosures: Enclosure[]; showTrapped: boolean; phase: 'early' | 'late' }) {
  const grid = ticketToGrid(ticket);
  const wallSet = new Set(enclosures.flatMap((e) => e.walls.map((p) => `${p.row},${p.col}`)));
  const gapSet = new Set(enclosures.filter((e) => e.gap).map((e) => `${e.gap!.row},${e.gap!.col}`));
  const trapSet = new Set(showTrapped ? enclosures.flatMap((e) => e.cells.map((p) => `${p.row},${p.col}`)) : []);
  const wallCls = phase === 'early' ? STEP_STYLE.wall12 : STEP_STYLE.wall34;
  const trapCls = phase === 'early' ? STEP_STYLE.trap12 : STEP_STYLE.trap34;

  return (
    <div className="grid grid-cols-6 border-l border-t border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900">
      {grid.map((row, r) =>
        row.map((n, c) => {
          const key = `${r},${c}`;
          const cls = trapSet.has(key)
            ? trapCls
            : gapSet.has(key)
            ? STEP_STYLE.gap
            : wallSet.has(key)
            ? wallCls
            : 'text-gray-400 dark:text-zinc-500';
          return (
            <div key={key} className={`aspect-square border-r border-b border-gray-300 dark:border-zinc-600 flex items-center justify-center font-bold text-[15px] ${cls}`}>
              {n !== null ? pad2(n) : ''}
            </div>
          );
        })
      )}
    </div>
  );
}

export default function ConnectTab({ onGoToInput }: { onGoToInput: () => void }) {
  const { tickets } = useTicketStore();
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [minLen, setMinLen] = useState(4); // 기본: 벽 4개 이상
  const [step, setStep] = useState<Step>(1);
  const [numberFilter, setNumberFilter] = useState<number | null>(null); // 갇힌 번호로 골라 보기
  const [lastSeen, setLastSeen] = useState<number | null>(null);

  const roundList = useMemo(() => {
    const map = new Map<number, number>();
    tickets.forEach((t) => map.set(t.round, (map.get(t.round) || 0) + 1));
    return Array.from(map.entries()).map(([round, count]) => ({ round, count })).sort((a, b) => b.round - a.round);
  }, [tickets]);

  useEffect(() => {
    if (!roundList.some((r) => r.round === selectedRound)) {
      setSelectedRound(roundList.length > 0 ? roundList[0].round : null);
    }
  }, [roundList, selectedRound]);

  // 💡 회차를 열 때: 지난번 확인 시각을 읽어 두고(NEW 표시용), 지금 시각으로 갱신
  const handledRound = useRef<number | null>(null);
  useEffect(() => {
    if (selectedRound === null || handledRound.current === selectedRound) return;
    handledRound.current = selectedRound;
    setLastSeen(readSeen(selectedRound));
    writeSeen(selectedRound, Date.now());
  }, [selectedRound]);

  useEffect(() => setNumberFilter(null), [step, selectedRound, minLen]);

  const roundTickets = useMemo(
    () => tickets.filter((t) => t.round === selectedRound).sort((a, b) => a.createdAt - b.createdAt),
    [tickets, selectedRound]
  );
  const ticketNo = useMemo(() => new Map(roundTickets.map((t, i) => [t.id, i + 1])), [roundTickets]);
  const isNew = (t: Ticket) => lastSeen !== null && t.createdAt > lastSeen;
  const newCount = roundTickets.filter(isNew).length;

  // 💡 1~4단계 계산 (등록 복권이 늘어나면 자동으로 다시 계산)
  const result = useMemo(() => runFourSteps(roundTickets, minLen), [roundTickets, minLen]);

  // 새 복권에서 나온 갇힌 번호 (빨간 점 표시용)
  const newTrapNumbers = (list: TicketResult[]) =>
    new Set(list.filter((s) => isNew(s.ticket)).flatMap((s) => s.enclosures.flatMap((e) => e.cells.map((c) => c.number))));
  const hasNumber = (s: TicketResult, n: number) => s.enclosures.some((e) => e.cells.some((c) => c.number === n));

  if (roundList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 px-6 gap-3">
        <div className="w-14 h-14 bg-gray-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-gray-400">
          <TicketIcon size={26} />
        </div>
        <h2 className="text-base font-bold text-gray-800 dark:text-zinc-200">분석할 복권이 없습니다</h2>
        <p className="text-xs text-gray-500 dark:text-zinc-400 break-keep">먼저 입력 탭에서 복권을 등록해 주세요.</p>
        <button onClick={onGoToInput} className="mt-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold rounded-xl shadow-md">
          복권 등록하러 가기
        </button>
      </div>
    );
  }

  const chipBase = 'shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors';
  const chipOn = 'bg-amber-500 text-white border-amber-500';
  const chipOff = 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 border-gray-200 dark:border-zinc-700';

  const STEPS: { key: Step; title: string; value: string }[] = [
    { key: 1, title: '① 벽', value: `${result.step1.length}장` },
    { key: 2, title: '② 갇힌', value: `${result.step2Numbers.length}개` },
    { key: 3, title: '③ 벽', value: `${result.step3.length}장` },
    { key: 4, title: '④ 갇힌', value: `${result.step4Numbers.length}개` },
  ];

  const isEarly = step === 1 || step === 2;
  const list = isEarly ? result.step1 : result.step3;
  const showTraps = step === 2 || step === 4;
  const trapNumbers = step === 2 ? result.step2Numbers : result.step4Numbers;
  const newTraps = newTrapNumbers(list);

  // 갇힌 번호로 골라 보기
  const visible = list.filter((s) => numberFilter === null || hasNumber(s, numberFilter));

  return (
    <div className="flex flex-col gap-3 pb-4">
      {/* 💡 회차 선택 */}
      <div className="flex gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] -mx-1 px-1">
        {roundList.map(({ round, count }) => (
          <button key={round} onClick={() => setSelectedRound(round)} className={`${chipBase} rounded-full ${selectedRound === round ? chipOn : chipOff}`}>
            {round}회 <span className="opacity-75">({count}장)</span>
          </button>
        ))}
      </div>

      {/* 💡 최소 벽 개수 */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 mr-1">최소 벽</span>
        {MIN_OPTIONS.map((m) => (
          <button key={m} onClick={() => setMinLen(m)} className={`${chipBase} ${minLen === m ? chipOn : chipOff}`}>
            {m}개
          </button>
        ))}
        <span className="ml-auto text-[10.5px] text-gray-400 dark:text-zinc-500">누적 {roundTickets.length}장 기준</span>
      </div>

      {/* 💡 새로 추가된 복권 안내 */}
      {newCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/30 text-[12px] font-bold text-emerald-700 dark:text-emerald-400">
          <Sparkles size={14} /> 마지막 확인 이후 +{newCount}장 추가 · 결과에 반영됨
        </div>
      )}

      {/* 💡 단계 버튼 */}
      <div className="grid grid-cols-4 gap-1.5">
        {STEPS.map((s) => (
          <button
            key={s.key}
            onClick={() => setStep(s.key)}
            className={`flex flex-col items-center py-2 rounded-xl border transition-colors ${
              step === s.key
                ? s.key <= 2 ? 'bg-[#1E3A8A] border-[#1E3A8A] text-white' : 'bg-violet-600 border-violet-600 text-white'
                : 'bg-gray-50 dark:bg-zinc-800/60 border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300'
            }`}
          >
            <span className="text-[11px] font-bold">{s.title}</span>
            <span className="text-[13px] font-black">{s.value}</span>
          </button>
        ))}
      </div>

      {/* 💡 단계 설명 */}
      <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed break-keep">
        {step === 1 && '끝자리가 같은 번호가 벽처럼 이어져 한 구역을 막은 복권입니다. 주황 테두리는 열린 칸(1개까지 닫힌 것으로 봄)이에요.'}
        {step === 2 && '벽이 막은 구역 안의 번호가 갇힌 번호입니다. 번호를 누르면 그 번호가 나온 복권만 보여줘요.'}
        {step === 3 &&
          (result.step3Digits.size > 0
            ? `②의 갇힌 번호 끝자리 ${Array.from(result.step3Digits.keys()).sort((a, b) => a - b).join(', ')}(으)로 벽이 만들어진 복권입니다.`
            : '②에서 갇힌 번호가 나오지 않아 찾을 끝자리가 없습니다.')}
        {step === 4 && '③의 벽이 막은 구역 안의 최종 갇힌 번호입니다.'}
      </p>

      {/* 💡 갇힌 번호 모음 (②, ④) */}
      {showTraps && trapNumbers.length > 0 && (
        <div className={`rounded-xl p-3 border ${step === 2 ? 'border-yellow-500/40 bg-yellow-50/60 dark:bg-yellow-500/5' : 'border-red-500/30 bg-red-50/60 dark:bg-red-500/5'}`}>
          <div className="text-[12px] font-black text-gray-900 dark:text-zinc-100 mb-2">
            {step === 4 ? '🎯 최종 갇힌 번호' : '갇힌 번호 모음'} ({trapNumbers.length}개)
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setNumberFilter(null)} className={`${chipBase} py-1 ${numberFilter === null ? chipOn : chipOff}`}>전체</button>
            {trapNumbers.map((n) => {
              const cnt = list.filter((s) => hasNumber(s, n)).length;
              return (
                <button
                  key={n}
                  onClick={() => setNumberFilter(numberFilter === n ? null : n)}
                  className={`${chipBase} py-1 relative ${numberFilter === n ? chipOn : chipOff}`}
                >
                  {pad2(n)} <span className="opacity-70">· {cnt}장</span>
                  {newTraps.has(n) && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white dark:border-zinc-900" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 💡 복권별 결과 */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center text-center py-10 gap-2 text-gray-500 dark:text-zinc-400">
          <Search size={28} className="text-gray-300 dark:text-zinc-600" />
          <p className="text-sm font-bold">이 단계에 해당하는 복권이 없습니다</p>
          <p className="text-[11px] break-keep">복권이 더 등록되면 자동으로 다시 분석돼요.</p>
        </div>
      ) : (
        visible.map(({ ticket, enclosures }) => {
          const trShort = ticket.tr ? `TR …${ticket.tr.slice(0, 10).slice(-4)}` : '직접 입력';
          // 번호로 골라 볼 때는 그 번호가 갇힌 구역만 표시
          const shown = numberFilter === null ? enclosures : enclosures.filter((e) => e.cells.some((c) => c.number === numberFilter));
          const trappedCount = shown.reduce((sum, e) => sum + e.cells.length, 0);
          return (
            <div key={ticket.id} className="bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/50 rounded-2xl p-3 flex flex-col gap-2.5">
              <div className="flex justify-between items-center">
                <span className="text-[13px] font-black text-gray-900 dark:text-zinc-100 flex items-center gap-1.5">
                  {ticketNo.get(ticket.id)}. {trShort}
                  {isNew(ticket) && <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-black">NEW</span>}
                </span>
                <span className="text-[11px] font-bold text-amber-500">
                  {showTraps ? `갇힌 ${trappedCount}개` : `벽 ${shown.length}개`}
                </span>
              </div>

              <ConnectGrid ticket={ticket} enclosures={shown} showTrapped={showTraps} phase={isEarly ? 'early' : 'late'} />

              <div className="flex flex-col gap-2 text-[12px]">
                {shown.map((e, i) => (
                  <div key={i} className="flex flex-col gap-0.5">
                    {/* 벽 설명 */}
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-sm shrink-0 ${isEarly ? 'bg-[#1E3A8A]' : 'bg-violet-600'}`} />
                      <span className="font-bold text-gray-900 dark:text-zinc-100 shrink-0">끝수 {e.digit} 벽 {e.walls.length}개</span>
                      <span className="text-[11px] text-gray-500 dark:text-zinc-400 truncate">({e.walls.map((p) => pad2(p.number)).join('·')})</span>
                      {!isEarly && (
                        <span className="ml-auto text-[10px] text-violet-600 dark:text-violet-400 font-bold shrink-0">
                          ← 갇힌 {(result.step3Digits.get(e.digit) || []).map(pad2).join('·')}
                        </span>
                      )}
                    </div>
                    {/* 열린 칸 */}
                    <div className="flex items-center gap-2 pl-5 text-[11px] text-gray-500 dark:text-zinc-400">
                      {e.gap ? (
                        <>
                          <span className="w-3 h-3 rounded-sm shrink-0 ring-2 ring-inset ring-orange-500" />
                          열린 칸 {cellName(e.gap.row, e.gap.col)} · {pad2(e.gap.number)}
                        </>
                      ) : (
                        '끊김 없이 막힘'
                      )}
                    </div>
                    {/* 갇힌 번호 */}
                    {showTraps && (
                      <div className="flex items-center gap-2 pl-5">
                        <span className={`w-3 h-3 rounded-sm shrink-0 ${step === 2 ? 'bg-yellow-300' : 'bg-red-400'}`} />
                        <span className="font-bold text-gray-900 dark:text-zinc-100">
                          갇힌 {e.cells.length}개: {e.cells.map((p) => pad2(p.number)).join('·')}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}