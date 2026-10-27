'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Search, Ticket as TicketIcon } from 'lucide-react';
import { useTicketStore, Ticket } from '../store/useTicketStore';
import {
  ZONE_SETS, ZoneSetKey, PatternFinding, analyzeTicket, ticketToGrid, DIGIT_COLORS, pad2,
} from '../lib/endDigitPattern';

const CIRCLED = ['①', '②', '③', '④'];
const MIN_OPTIONS = [3, 4, 5];

// 💡 복권 1장의 6×5 표 + 선택한 패턴 표시 (구역 테두리, 같은 끝수 칸 색칠)
function PatternGrid({ ticket, finding }: { ticket: Ticket; finding: PatternFinding | null }) {
  const grid = ticketToGrid(ticket);
  const zone = finding?.zone;
  const isInZone = (r: number, c: number) =>
    !!zone && r >= zone.row && r < zone.row + zone.rows && c >= zone.col && c < zone.col + zone.cols;
  const isHit = (r: number, c: number) => !!finding && finding.cells.some((x) => x.row === r && x.col === c);

  return (
    <div className="relative mt-4">
      <div className="grid grid-cols-6 border-l border-t border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900">
        {grid.map((row, r) =>
          row.map((n, c) => {
            const hit = isHit(r, c);
            const inZone = isInZone(r, c);
            return (
              <div
                key={`${r}-${c}`}
                className={`aspect-square border-r border-b border-gray-300 dark:border-zinc-600 flex items-center justify-center font-bold text-[15px] transition-colors ${
                  hit && finding
                    ? DIGIT_COLORS[finding.digit]
                    : inZone
                    ? 'bg-amber-50 dark:bg-amber-500/10 text-gray-900 dark:text-white'
                    : 'text-gray-400 dark:text-zinc-500'
                }`}
              >
                {n !== null ? pad2(n) : ''}
              </div>
            );
          })
        )}
      </div>
      {/* 구역 테두리 */}
      {zone && (
        <div
          className="absolute border-[3px] border-amber-500 rounded-sm pointer-events-none"
          style={{
            left: `${(zone.col / 6) * 100}%`,
            top: `${(zone.row / 5) * 100}%`,
            width: `${(zone.cols / 6) * 100}%`,
            height: `${(zone.rows / 5) * 100}%`,
          }}
        >
          <span className="absolute -top-[19px] -left-[3px] bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-t-md whitespace-nowrap">
            구역{CIRCLED[zone.id - 1]}
          </span>
        </div>
      )}
    </div>
  );
}

export default function PatternTab({ onGoToInput }: { onGoToInput: () => void }) {
  const { tickets } = useTicketStore();
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [setKey, setSetKey] = useState<ZoneSetKey>('3x3');
  const [minCount, setMinCount] = useState(ZONE_SETS['3x3'].defaultMin);
  const [digitFilter, setDigitFilter] = useState<number | null>(null);
  const [zoneFilter, setZoneFilter] = useState<number | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<Record<string, number>>({}); // 복권별로 선택한 패턴

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

  // 조건이 바뀌면 골라 보기와 선택 초기화
  useEffect(() => {
    setDigitFilter(null);
    setZoneFilter(null);
    setSelectedIdx({});
  }, [selectedRound, setKey, minCount]);

  const changeSet = (key: ZoneSetKey) => {
    setSetKey(key);
    setMinCount(ZONE_SETS[key].defaultMin); // 구역 방식마다 기본 기준 개수
  };

  // 💡 선택한 회차의 모든 복권 분석
  const analyzed = useMemo(
    () =>
      tickets
        .filter((t) => t.round === selectedRound)
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((ticket, idx) => ({ ticket, no: idx + 1, findings: analyzeTicket(ticket, setKey, minCount) })),
    [tickets, selectedRound, setKey, minCount]
  );

  // 💡 요약 (끝수별·구역별 건수)
  const summary = useMemo(() => {
    const byDigit = Array(10).fill(0);
    const byZone: Record<number, number> = {};
    let total = 0;
    let ticketsWithPattern = 0;
    analyzed.forEach(({ findings }) => {
      if (findings.length > 0) ticketsWithPattern++;
      findings.forEach((f) => {
        total++;
        byDigit[f.digit]++;
        byZone[f.zone.id] = (byZone[f.zone.id] || 0) + 1;
      });
    });
    const digitRank = byDigit.map((count, digit) => ({ digit, count })).filter((d) => d.count > 0).sort((a, b) => b.count - a.count || a.digit - b.digit);
    return { total, ticketsWithPattern, digitRank, byZone };
  }, [analyzed]);

  // 💡 골라 보기 적용
  const visible = analyzed
    .map((a) => ({
      ...a,
      shown: a.findings.filter(
        (f) => (digitFilter === null || f.digit === digitFilter) && (zoneFilter === null || f.zone.id === zoneFilter)
      ),
    }))
    .filter((a) => a.shown.length > 0);

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

      {/* 💡 구역 방식 + 기준 개수 */}
      <div className="bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/50 rounded-xl p-2.5 flex flex-col gap-2">
        <div className="grid grid-cols-3 gap-1.5">
          {(Object.keys(ZONE_SETS) as ZoneSetKey[]).map((key) => (
            <button key={key} onClick={() => changeSet(key)} className={`${chipBase} py-2 ${setKey === key ? chipOn : chipOff}`}>
              {ZONE_SETS[key].label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 mr-1">기준</span>
          {MIN_OPTIONS.map((m) => (
            <button key={m} onClick={() => setMinCount(m)} className={`${chipBase} ${minCount === m ? chipOn : chipOff}`}>
              {m}개 이상
            </button>
          ))}
        </div>
      </div>

      {/* 💡 요약 + 골라 보기 */}
      <div className="rounded-xl p-3 border border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/5 flex flex-col gap-2">
        <div className="text-[13px] font-black text-gray-900 dark:text-zinc-100">
          📊 {analyzed.length}장 중 <span className="text-amber-500">{summary.ticketsWithPattern}장</span>에서 패턴 <span className="text-amber-500">{summary.total}건</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10.5px] font-bold text-gray-500 dark:text-zinc-400 w-9">구역</span>
          <button onClick={() => setZoneFilter(null)} className={`${chipBase} py-1 ${zoneFilter === null ? chipOn : chipOff}`}>전체</button>
          {ZONE_SETS[setKey].zones.map((z) => (
            <button key={z.id} onClick={() => setZoneFilter(zoneFilter === z.id ? null : z.id)} className={`${chipBase} py-1 ${zoneFilter === z.id ? chipOn : chipOff}`}>
              {CIRCLED[z.id - 1]} {summary.byZone[z.id] || 0}건
            </button>
          ))}
        </div>

        {summary.digitRank.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10.5px] font-bold text-gray-500 dark:text-zinc-400 w-9">끝수</span>
            <button onClick={() => setDigitFilter(null)} className={`${chipBase} py-1 ${digitFilter === null ? chipOn : chipOff}`}>전체</button>
            {summary.digitRank.map(({ digit, count }) => (
              <button
                key={digit}
                onClick={() => setDigitFilter(digitFilter === digit ? null : digit)}
                className={`${chipBase} py-1 flex items-center gap-1 ${digitFilter === digit ? chipOn : chipOff}`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${DIGIT_COLORS[digit].split(' ')[0]}`} />
                {digit} · {count}건
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 💡 복권별 결과 */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center text-center py-10 gap-2 text-gray-500 dark:text-zinc-400">
          <Search size={28} className="text-gray-300 dark:text-zinc-600" />
          <p className="text-sm font-bold">조건에 맞는 패턴이 없습니다</p>
          <p className="text-[11px] break-keep">기준 개수를 낮추거나 다른 구역 방식을 골라 보세요.</p>
        </div>
      ) : (
        visible.map(({ ticket, no, shown }) => {
          const idx = Math.min(selectedIdx[ticket.id] ?? 0, shown.length - 1);
          const current = shown[idx];
          const trShort = ticket.tr ? `TR …${ticket.tr.slice(0, 10).slice(-4)}` : '직접 입력';
          return (
            <div key={ticket.id} className="bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/50 rounded-2xl p-3 flex flex-col gap-2.5">
              <div className="flex justify-between items-center">
                <span className="text-[13px] font-black text-gray-900 dark:text-zinc-100">{no}. {trShort}</span>
                <span className="text-[11px] font-bold text-amber-500">패턴 {shown.length}건</span>
              </div>

              <PatternGrid ticket={ticket} finding={current} />

              <div className="flex flex-col gap-1">
                {shown.map((f, i) => (
                  <button
                    key={`${f.zone.id}-${f.digit}`}
                    onClick={() => setSelectedIdx((prev) => ({ ...prev, [ticket.id]: i }))}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-colors ${
                      i === idx ? 'border-amber-500 bg-white dark:bg-zinc-900' : 'border-transparent hover:bg-white/60 dark:hover:bg-zinc-900/60'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full shrink-0 ${DIGIT_COLORS[f.digit].split(' ')[0]}`} />
                    <span className="text-[12px] font-bold text-gray-900 dark:text-zinc-100">
                      구역{CIRCLED[f.zone.id - 1]} · 끝수 {f.digit} · {f.cells.length}개
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-zinc-400 truncate">
                      ({f.cells.map((c) => pad2(c.number)).join('·')})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
