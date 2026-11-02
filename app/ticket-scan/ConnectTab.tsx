'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Ticket as TicketIcon, Sparkles, RotateCcw, PencilLine } from 'lucide-react';
import { useTicketStore, Ticket } from '../store/useTicketStore';
import { ticketToGrid, pad2 } from '../lib/endDigitPattern';
import { runFourSteps, analyzeTicket, cellName, Enclosure, TicketResult, OffMap, AddMap, GridCell } from '../lib/connectPattern';

type Step = 1 | 2 | 3 | 4;
const MIN_OPTIONS = [3, 4, 5, 6]; // 구역을 막는 같은 끝수 번호(벽)의 최소 개수
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

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

// 💡 회차별 '선택 해제한 벽 번호'와 '직접 연결한 번호' (이 휴대폰에만 저장)
const offKey = (round: number) => `lotto-connect-off-${round}`;
const addKey = (round: number) => `lotto-connect-add-${round}`;
const readJson = <T,>(k: string): T | null => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
};
const writeJson = (k: string, value: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(value));
  } catch {
    /* 저장이 안 되는 환경이면 무시 */
  }
};
// 비어 있는 복권은 빼고 순서를 맞춰 정리 (비교·저장용)
const cleanOff = (map: OffMap): OffMap => {
  const out: OffMap = {};
  Object.keys(map).sort().forEach((id) => {
    if (map[id].length > 0) out[id] = [...map[id]].sort();
  });
  return out;
};
const cleanAdd = (map: AddMap): AddMap => {
  const out: AddMap = {};
  Object.keys(map).sort().forEach((id) => {
    const keys = Object.keys(map[id]).sort();
    if (keys.length === 0) return;
    out[id] = {};
    keys.forEach((k) => (out[id][k] = map[id][k]));
  });
  return out;
};

// 💡 단계별 색 (1·2단계: 남색 벽, 3·4단계: 보라 벽, 갇힌 칸: 모든 단계 노란색, 열린 칸: 주황 테두리)
const STEP_STYLE = {
  wall12: 'bg-[#1E3A8A] text-white',
  trap12: 'bg-yellow-300 text-gray-900',
  wall34: 'bg-violet-600 text-white',
  trap34: 'bg-yellow-300 text-gray-900',
  gap: 'bg-white dark:bg-zinc-900 text-orange-500 ring-[3px] ring-inset ring-orange-500',
};

// 💡 복권 1장 표 (벽, 갇힌 구역 색칠 · 벽 번호를 누르면 선택 해제/선택 · 직접 연결)
function ConnectGrid({ ticket, enclosures, phase, off, add, keepWalls, editing, editDigit, onTap }: {
  ticket: Ticket; enclosures: Enclosure[]; phase: 'early' | 'late';
  off: string[];                  // 선택 해제한 칸
  add: Record<string, number>;    // 직접 연결한 칸 → 끝수
  keepWalls: GridCell[];          // 선택 해제하지 않은 원래 벽 (분석에서 빠졌어도 화면에는 남색으로 유지)
  editing: boolean;               // 직접 연결 중이면 아무 칸이나 누를 수 있음
  editDigit: number | null;       // 직접 연결할 끝수 (같은 끝수 번호를 주황 글씨로 보여줌)
  onTap: (cellKey: string, isWall: boolean) => void;
}) {
  const grid = ticketToGrid(ticket);
  const wallSet = new Set([...enclosures.flatMap((e) => e.walls), ...keepWalls].map((p) => `${p.row},${p.col}`));
  const gapSet = new Set(enclosures.filter((e) => e.gap).map((e) => `${e.gap!.row},${e.gap!.col}`));
  const trapSet = new Set(enclosures.flatMap((e) => e.cells.map((p) => `${p.row},${p.col}`)));
  const wallCls = phase === 'early' ? STEP_STYLE.wall12 : STEP_STYLE.wall34;
  const trapCls = phase === 'early' ? STEP_STYLE.trap12 : STEP_STYLE.trap34;
  const offSet = new Set(off);

  return (
    <div className="grid grid-cols-6 border-l border-t border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900">
      {grid.map((row, r) =>
        row.map((n, c) => {
          const key = `${r},${c}`;
          if (n === null) {
            return <div key={key} className="aspect-square border-r border-b border-gray-300 dark:border-zinc-600" />;
          }
          const addDigit = add[key];                     // 직접 연결한 칸이면 그 끝수
          const isAdd = addDigit !== undefined;
          const isOff = !isAdd && offSet.has(key);       // 선택 해제한 칸
          const isWall = wallSet.has(key);
          const canTap = isAdd || isOff || isWall || editing;
          const cls = isAdd
            ? `${wallCls} ring-[3px] ring-inset ring-orange-400`
            : isOff
            ? 'bg-gray-200 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400 outline-2 outline-dashed -outline-offset-4 outline-gray-500 dark:outline-zinc-400'
            : trapSet.has(key)
            ? trapCls
            : gapSet.has(key)
            ? STEP_STYLE.gap
            : isWall
            ? wallCls
            : editing && n % 10 === editDigit
            ? 'text-orange-500 bg-orange-100 dark:bg-orange-500/20'
            : editing
            ? 'text-gray-500 dark:text-zinc-400 bg-orange-50/60 dark:bg-orange-500/5'
            : 'text-gray-400 dark:text-zinc-500';
          return (
            <div
              key={key}
              onClick={canTap ? () => onTap(key, isWall) : undefined}
              className={`relative aspect-square border-r border-b border-gray-300 dark:border-zinc-600 flex items-center justify-center font-bold text-[15px] ${cls} ${canTap ? 'cursor-pointer active:scale-95' : ''}`}
            >
              {pad2(n)}
              {isAdd && (
                <span className="absolute top-0.5 right-1 text-[9px] font-black text-orange-300">끝{addDigit}</span>
              )}
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
  const [minLen, setMinLen] = useState(3); // 기본: 벽 3개 이상
  const [step, setStep] = useState<Step>(1);
  const [numberFilter, setNumberFilter] = useState<number | null>(null); // 갇힌 번호로 골라 보기
  const [lastSeen, setLastSeen] = useState<number | null>(null);
  const [appliedOff, setAppliedOff] = useState<OffMap>({}); // 💡 적용된 선택 해제 (분석에 반영됨)
  const [draftOff, setDraftOff] = useState<OffMap>({});     // 💡 아직 적용 안 한 선택 해제 (누르는 중)
  const [appliedAdd, setAppliedAdd] = useState<AddMap>({}); // 💡 적용된 직접 연결
  const [draftAdd, setDraftAdd] = useState<AddMap>({});     // 💡 아직 적용 안 한 직접 연결
  const [editId, setEditId] = useState<string | null>(null);       // 직접 연결 중인 복권
  const [editDigit, setEditDigit] = useState<number | null>(null); // 직접 연결할 끝수
  const [showAll, setShowAll] = useState(false);                   // 연결 없는 복권도 보기

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

  // 💡 회차를 열 때: 지난번 확인 시각을 읽어 두고(NEW 표시용), 지금 시각으로 갱신 + 저장된 수정 불러오기
  const handledRound = useRef<number | null>(null);
  useEffect(() => {
    if (selectedRound === null || handledRound.current === selectedRound) return;
    handledRound.current = selectedRound;
    setLastSeen(readSeen(selectedRound));
    writeSeen(selectedRound, Date.now());
    const savedOff = cleanOff(readJson<OffMap>(offKey(selectedRound)) || {});
    const savedAdd = cleanAdd(readJson<AddMap>(addKey(selectedRound)) || {});
    setAppliedOff(savedOff);
    setDraftOff(savedOff);
    setAppliedAdd(savedAdd);
    setDraftAdd(savedAdd);
    setEditId(null);
  }, [selectedRound]);

  useEffect(() => setNumberFilter(null), [step, selectedRound, minLen]);

  const roundTickets = useMemo(
    () => tickets.filter((t) => t.round === selectedRound).sort((a, b) => a.createdAt - b.createdAt),
    [tickets, selectedRound]
  );
  const ticketNo = useMemo(() => new Map(roundTickets.map((t, i) => [t.id, i + 1])), [roundTickets]);
  const isNew = (t: Ticket) => lastSeen !== null && t.createdAt > lastSeen;
  const newCount = roundTickets.filter(isNew).length;

  // 💡 1~4단계 계산 (등록 복권이 늘어나거나, 수정을 적용하면 다시 계산)
  const result = useMemo(
    () => runFourSteps(roundTickets, minLen, appliedOff, appliedAdd),
    [roundTickets, minLen, appliedOff, appliedAdd]
  );

  // 💡 선택 해제 · 직접 연결 · 적용 · 취소
  const isDirty =
    JSON.stringify(cleanOff(draftOff)) !== JSON.stringify(appliedOff) ||
    JSON.stringify(cleanAdd(draftAdd)) !== JSON.stringify(appliedAdd);
  const editCount =
    Object.values(appliedOff).reduce((sum, list) => sum + list.length, 0) +
    Object.values(appliedAdd).reduce((sum, m) => sum + Object.keys(m).length, 0);

  const toggleOff = (ticketId: string, cellKey: string) =>
    setDraftOff((prev) => {
      const cur = prev[ticketId] || [];
      const next = cur.includes(cellKey) ? cur.filter((k) => k !== cellKey) : [...cur, cellKey];
      return { ...prev, [ticketId]: next };
    });
  const setAdd = (ticketId: string, cellKey: string, digit: number | null) =>
    setDraftAdd((prev) => {
      const cur = { ...(prev[ticketId] || {}) };
      if (digit === null) delete cur[cellKey];
      else cur[cellKey] = digit;
      return { ...prev, [ticketId]: cur };
    });

  // 칸을 눌렀을 때: 직접 연결한 칸 → 취소 / 벽·해제 칸 → 해제·선택 / 그 밖의 칸 → (직접 연결 중이면) 벽으로 추가
  const tapCell = (ticketId: string, cellKey: string, isWall: boolean) => {
    if (draftAdd[ticketId]?.[cellKey] !== undefined) return setAdd(ticketId, cellKey, null);
    if (isWall || (draftOff[ticketId] || []).includes(cellKey)) return toggleOff(ticketId, cellKey);
    if (editId !== ticketId) return;
    if (editDigit === null) {
      alert('먼저 위에서 연결할 끝수(0~9)를 골라 주세요.');
      return;
    }
    setAdd(ticketId, cellKey, editDigit);
  };

  const applyEdits = () => {
    const nextOff = cleanOff(draftOff);
    const nextAdd = cleanAdd(draftAdd);
    setAppliedOff(nextOff);
    setDraftOff(nextOff);
    setAppliedAdd(nextAdd);
    setDraftAdd(nextAdd);
    setEditId(null);
    if (selectedRound !== null) {
      writeJson(offKey(selectedRound), nextOff);
      writeJson(addKey(selectedRound), nextAdd);
    }
  };
  const cancelEdits = () => {
    setDraftOff(appliedOff);
    setDraftAdd(appliedAdd);
    setEditId(null);
  };
  const resetEdits = () => {
    if (!window.confirm('선택 해제와 직접 연결을 모두 되돌리시겠습니까?')) return;
    setAppliedOff({});
    setDraftOff({});
    setAppliedAdd({});
    setDraftAdd({});
    setEditId(null);
    if (selectedRound !== null) {
      writeJson(offKey(selectedRound), {});
      writeJson(addKey(selectedRound), {});
    }
  };
  const toggleEdit = (ticketId: string, enclosures: Enclosure[]) => {
    if (editId === ticketId) {
      setEditId(null);
      return;
    }
    setEditId(ticketId);
    setEditDigit(enclosures.length > 0 ? enclosures[0].digit : null);
  };

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
  const baseList = isEarly ? result.step1 : result.step3;
  const stepDigits = isEarly ? null : new Set(result.step3Digits.keys());
  const inStep = (d: number) => stepDigits === null || stepDigits.has(d);

  // 💡 이 단계에 해당하는 선택 해제 · 직접 연결이 있는 복권인지
  const hasOffInStep = (t: Ticket) => {
    const grid = ticketToGrid(t);
    return [...(appliedOff[t.id] || []), ...(draftOff[t.id] || [])].some((k) => {
      const [r, c] = k.split(',').map(Number);
      const n = grid[r]?.[c];
      return n != null && inStep(n % 10);
    });
  };
  const hasAddInStep = (t: Ticket) =>
    [...Object.values(appliedAdd[t.id] || {}), ...Object.values(draftAdd[t.id] || {})].some(inStep);

  // 💡 연결이 없는 복권도 '연결 없음'으로 보여줌 (수정한 복권, 직접 연결 중인 복권, [연결 없는 복권도 보기])
  const extra: TicketResult[] = roundTickets
    .filter((t) => !baseList.some((s) => s.ticket.id === t.id))
    .filter((t) => showAll || editId === t.id || hasOffInStep(t) || hasAddInStep(t))
    .map((t) => ({ ticket: t, enclosures: [] }));
  const list = [...baseList, ...extra].sort((a, b) => (ticketNo.get(a.ticket.id) || 0) - (ticketNo.get(b.ticket.id) || 0));
  const hiddenCount = roundTickets.length - baseList.length;
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

      {/* 💡 수정 안내 · 모두 되돌리기 */}
      <div className="flex items-center gap-2 text-[10.5px] text-gray-500 dark:text-zinc-400">
        <span className="break-keep">벽 번호를 누르면 선택 해제 · [직접 연결]로 벽 추가 → [적용]</span>
        {editCount > 0 && (
          <button onClick={resetEdits} className="ml-auto shrink-0 flex items-center gap-1 px-2 py-1 rounded-md border border-gray-300 dark:border-zinc-600 font-bold text-gray-600 dark:text-zinc-300">
            <RotateCcw size={11} /> 수정 {editCount}개 되돌리기
          </button>
        )}
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
        {step === 1 && '끝자리가 같은 번호가 벽처럼 이어져 한 구역을 완전히 막은 복권입니다. 끝자리가 다른 번호가 하나라도 끼면 제외해요.'}
        {step === 2 && '벽이 막은 구역 안의 번호가 갇힌 번호입니다. 번호를 누르면 그 번호가 나온 복권만 보여줘요.'}
        {step === 3 &&
          (result.step3Digits.size > 0
            ? `②의 갇힌 번호 끝자리 ${Array.from(result.step3Digits.keys()).sort((a, b) => a - b).join(', ')}(으)로 벽이 만들어진 복권입니다.`
            : '②에서 갇힌 번호가 나오지 않아 찾을 끝자리가 없습니다.')}
        {step === 4 && '③의 벽이 막은 구역 안의 최종 갇힌 번호입니다.'}
      </p>

      {/* 💡 연결 없는 복권도 보기 (직접 연결하려고 할 때) */}
      {hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className={`self-start flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${
            showAll ? 'bg-orange-500 text-white border-orange-500' : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-300 border-gray-300 dark:border-zinc-600'
          }`}
        >
          <span className={`w-3.5 h-3.5 rounded-full border-2 ${showAll ? 'bg-white border-white' : 'border-gray-400'}`} />
          연결 없는 복권도 보기 ({hiddenCount}장)
        </button>
      )}

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
          const editing = editId === ticket.id;
          // 번호로 골라 볼 때는 그 번호가 갇힌 구역만 표시
          const shown = numberFilter === null ? enclosures : enclosures.filter((e) => e.cells.some((c) => c.number === numberFilter));
          const trappedCount = shown.reduce((sum, e) => sum + e.cells.length, 0);
          // 💡 선택 해제 전 원래 벽 중, 누르지 않은 번호는 화면에 그대로 유지 (분석에는 반영 안 됨)
          const nowWalls = new Set(enclosures.flatMap((e) => e.walls.map((p) => `${p.row},${p.col}`)));
          const offNow = new Set(appliedOff[ticket.id] || []);
          const keepWalls = numberFilter !== null || offNow.size === 0
            ? []
            : analyzeTicket(ticket, minLen, stepDigits ?? undefined, undefined, appliedAdd[ticket.id])
                .flatMap((e) => e.walls)
                .filter((p) => !nowWalls.has(`${p.row},${p.col}`) && !offNow.has(`${p.row},${p.col}`));
          // 벽이 열려 분석에서 빠진 끝수 (안내 문구용)
          const lostDigits = Array.from(new Set(keepWalls.map((p) => p.number % 10)))
            .filter((d) => !enclosures.some((e) => e.digit === d))
            .sort((a, b) => a - b);
          return (
            <div
              key={ticket.id}
              className={`bg-gray-50 dark:bg-zinc-800/60 border rounded-2xl p-3 flex flex-col gap-2.5 ${
                editing ? 'border-orange-400 ring-1 ring-orange-400' : 'border-gray-200 dark:border-zinc-700/50'
              }`}
            >
              <div className="flex justify-between items-center gap-2">
                <span className="text-[13px] font-black text-gray-900 dark:text-zinc-100 flex items-center gap-1.5">
                  {ticketNo.get(ticket.id)}. {trShort}
                  {isNew(ticket) && <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-black">NEW</span>}
                </span>
                <div className="flex items-center gap-1.5">
                  {enclosures.length === 0 ? (
                    <span className="px-1.5 py-0.5 rounded bg-gray-400 dark:bg-zinc-600 text-white text-[10px] font-black">연결 없음</span>
                  ) : (
                    <span className="text-[11px] font-bold text-amber-500">
                      {showTraps ? `갇힌 ${trappedCount}개` : `벽 ${shown.length}개`}
                    </span>
                  )}
                  <button
                    onClick={() => toggleEdit(ticket.id, enclosures)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] font-bold border ${
                      editing ? 'bg-orange-500 text-white border-orange-500' : 'bg-white dark:bg-zinc-900 text-orange-500 border-orange-400/60'
                    }`}
                  >
                    <PencilLine size={11} /> {editing ? '닫기' : '직접 연결'}
                  </button>
                </div>
              </div>

              {/* 💡 직접 연결: 끝수 고르기 */}
              {editing && (
                <div className="rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-400/40 p-2.5 flex flex-col gap-2">
                  <div className="text-[11px] font-bold text-orange-700 dark:text-orange-300 break-keep">
                    ① 연결할 끝수를 고르고 → ② 벽으로 넣을 번호를 누르세요. 다시 누르면 취소돼요.
                  </div>
                  <div className="grid grid-cols-10 gap-1">
                    {DIGITS.map((d) => (
                      <button
                        key={d}
                        onClick={() => setEditDigit(d)}
                        className={`py-1.5 rounded-md text-[12px] font-black border ${
                          editDigit === d ? 'bg-orange-500 text-white border-orange-500' : 'bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 border-gray-200 dark:border-zinc-700'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <ConnectGrid
                ticket={ticket}
                enclosures={shown}
                phase={isEarly ? 'early' : 'late'}
                off={draftOff[ticket.id] || []}
                add={draftAdd[ticket.id] || {}}
                keepWalls={keepWalls}
                editing={editing}
                editDigit={editDigit}
                onTap={(cellKey, isWall) => tapCell(ticket.id, cellKey, isWall)}
              />
              {enclosures.length === 0 && hasOffInStep(ticket) && (
                <div className="text-[11px] text-gray-500 dark:text-zinc-400 break-keep">
                  선택 해제한 번호 때문에 벽이 열려 분석에서 빠졌어요. 점선 칸을 누르면 다시 선택돼요.
                </div>
              )}
              {enclosures.length > 0 && lostDigits.length > 0 && (
                <div className="text-[11px] text-gray-500 dark:text-zinc-400 break-keep">
                  끝수 {lostDigits.join(', ')}: 선택 해제로 벽이 열려 분석에서 빠졌어요. 점선 칸을 누르면 다시 선택돼요.
                </div>
              )}

              <div className="flex flex-col gap-2 text-[12px]">
                {shown.map((e, i) => {
                  const addedHere = e.walls.filter((p) => appliedAdd[ticket.id]?.[`${p.row},${p.col}`] !== undefined).length;
                  return (
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
                      {/* 열린 칸 · 직접 연결 */}
                      <div className="flex items-center gap-2 pl-5 text-[11px] text-gray-500 dark:text-zinc-400">
                        {e.gap ? (
                          <>
                            <span className="w-3 h-3 rounded-sm shrink-0 ring-2 ring-inset ring-orange-500" />
                            열린 칸 {cellName(e.gap.row, e.gap.col)} · {pad2(e.gap.number)}
                          </>
                        ) : (
                          '끊김 없이 막힘'
                        )}
                        {addedHere > 0 && <span className="text-orange-500 font-bold">· 직접 연결 {addedHere}개 포함</span>}
                      </div>
                      {/* 갇힌 번호 */}
                      {showTraps && (
                        <div className="flex items-center gap-2 pl-5">
                          <span className="w-3 h-3 rounded-sm shrink-0 bg-yellow-300" />
                          <span className="font-bold text-gray-900 dark:text-zinc-100">
                            갇힌 {e.cells.length}개: {e.cells.map((p) => pad2(p.number)).join('·')}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* 💡 적용 / 취소 (바꾼 것이 있을 때만) */}
      {isDirty && (
        <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-white/95 dark:bg-zinc-900/95 border-t border-gray-200 dark:border-zinc-700 grid grid-cols-2 gap-2">
          <button onClick={cancelEdits} className="py-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 text-sm font-bold active:scale-95">
            취소
          </button>
          <button onClick={applyEdits} className="py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold active:scale-95">
            적용
          </button>
        </div>
      )}
    </div>
  );
}