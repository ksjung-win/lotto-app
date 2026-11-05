'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ticket as TicketIcon, Sparkles, RotateCcw, ChevronRight, LayoutList, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useTicketStore, Ticket } from '../store/useTicketStore';
import { pad2 } from '../lib/endDigitPattern';
import { runConnectAnalysis, recommendCombos, OffMap, AddMap, FlipMap } from '../lib/connectPattern';
import { verifyConnect } from '../lib/connectVerify';
import { readEdits, saveEditsLocal, EDITS_REMOTE_EVENT } from '../lib/editsStore';
import ConnectStep1 from './ConnectStep1';
import { TicketsByDate, Step2View, Step3View, Step4View, Step5View } from './ConnectViews';

type View = 'menu' | 'tickets' | 'step1' | 'step2' | 'step3' | 'step4' | 'step5';
const MIN_OPTIONS = [3, 4, 5, 6]; // 구역을 막는 같은 끝수 번호(벽)의 최소 개수

// 회차별 '마지막으로 확인한 시각' (새로 추가된 복권 표시용, 이 휴대폰에만 저장)
const seenKey = (round: number) => `lotto-connect-seen-${round}`;
// 회차별 '직접 수정 내용'(선택 해제·직접 연결·갇힌 쪽 바꾸기)은 editsStore에서 저장 (연동 포함)

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

// 💡 연결 패턴 분석: 메뉴 화면 + 각 화면
export default function ConnectTab({ onGoToInput }: { onGoToInput: () => void }) {
  const { tickets } = useTicketStore();
  const [view, setView] = useState<View>('menu');
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [minLen, setMinLen] = useState(3); // 기본: 벽 3개 이상
  const [lastSeen, setLastSeen] = useState<number | null>(null);
  const [appliedOff, setAppliedOff] = useState<OffMap>({}); // 💡 적용된 선택 해제 (분석에 반영됨)
  const [appliedAdd, setAppliedAdd] = useState<AddMap>({}); // 💡 적용된 직접 연결
  const [appliedFlip, setAppliedFlip] = useState<FlipMap>({}); // 💡 적용된 '갇힌 쪽 바꾸기'
  const [showErrors, setShowErrors] = useState(false); // 검증 실패 내용 펼치기
  const step1Dirty = useRef(false); // 1단계 화면에서 적용 안 한 수정이 있는지
  const onDirtyChange = useCallback((d: boolean) => {
    step1Dirty.current = d;
  }, []);

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
    setLastSeen(readJson<number>(seenKey(selectedRound)));
    writeJson(seenKey(selectedRound), Date.now());
    const e = readEdits(selectedRound);
    setAppliedOff(e.off);
    setAppliedAdd(e.add);
    setAppliedFlip(e.flip);
  }, [selectedRound]);

  // 💡 다른 기기에서 직접 수정한 내용이 연동되어 들어오면 다시 읽기
  useEffect(() => {
    const reload = () => {
      if (selectedRound === null) return;
      const e = readEdits(selectedRound);
      setAppliedOff(e.off);
      setAppliedAdd(e.add);
      setAppliedFlip(e.flip);
    };
    window.addEventListener(EDITS_REMOTE_EVENT, reload);
    return () => window.removeEventListener(EDITS_REMOTE_EVENT, reload);
  }, [selectedRound]);

  const roundTickets = useMemo(
    () => tickets.filter((t) => t.round === selectedRound).sort((a, b) => a.createdAt - b.createdAt),
    [tickets, selectedRound]
  );
  const ticketNo = useMemo(() => new Map(roundTickets.map((t, i) => [t.id, i + 1])), [roundTickets]);
  const isNew = (t: Ticket) => lastSeen !== null && t.createdAt > lastSeen;
  const newCount = roundTickets.filter(isNew).length;

  // 💡 1~4단계 계산 (등록 복권이 늘어나거나, 수정을 적용하면 다시 계산)
  const result = useMemo(
    () => runConnectAnalysis(roundTickets, minLen, appliedOff, appliedAdd, appliedFlip),
    [roundTickets, minLen, appliedOff, appliedAdd, appliedFlip]
  );
  // 💡 자동 검증: 1~4단계 결과를 다른 방법으로 다시 계산해서 맞춰 봄
  const report = useMemo(
    () => verifyConnect(roundTickets, minLen, result, appliedOff, appliedAdd),
    [roundTickets, minLen, result, appliedOff, appliedAdd]
  );
  // 💡 5단계: 추천 조합 20세트
  const combos = useMemo(() => recommendCombos(result, roundTickets).combos, [result, roundTickets]);

  const editCount =
    Object.values(appliedOff).reduce((sum, list) => sum + list.length, 0) +
    Object.values(appliedAdd).reduce((sum, m) => sum + Object.keys(m).length, 0) +
    Object.values(appliedFlip).reduce((sum, list) => sum + list.length, 0);

  const applyEdits = (off: OffMap, add: AddMap, flip: FlipMap) => {
    setAppliedOff(off);
    setAppliedAdd(add);
    setAppliedFlip(flip);
    if (selectedRound !== null) saveEditsLocal(selectedRound, off, add, flip); // 저장 + 연동
  };
  const resetEdits = () => {
    if (!window.confirm('선택 해제 · 직접 연결 · 갇힌 쪽 바꾸기를 모두 되돌리시겠습니까?')) return;
    applyEdits({}, {}, {});
  };

  // 적용하지 않은 수정이 있으면 확인 후 이동
  const leaveCheck = () => !step1Dirty.current || window.confirm('적용하지 않은 수정이 있어요. 수정을 버리고 이동할까요?');
  const goView = (v: View) => {
    if (view === 'step1' && v !== 'step1' && !leaveCheck()) return;
    if (v !== 'step1') step1Dirty.current = false;
    setView(v);
  };

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

  // 💡 메뉴 버튼
  const top = result.step4[0];
  const MENU: { key: View; label: string; desc: string }[] = [
    { key: 'tickets', label: '입력된 복권 보기', desc: `등록한 날짜별 · ${roundTickets.length}장` },
    { key: 'step1', label: '1단계: 연결 복권', desc: `같은 끝자리로 연결된 복권 · ${roundTickets.length}장 중 ${result.step1.length}장` },
    { key: 'step2', label: '2단계: 연결 번호', desc: `1단계에 갇혀 있던 번호가 다른 복권에서는 연결 번호가 된 복권 · ${result.step1.length}장 중 ${result.step2Tickets.length}장` },
    { key: 'step3', label: '3단계: 갇힌 번호', desc: `1단계의 연결 번호가 다른 복권에서 갇힌 번호 · ${result.step3.length}개` },
    { key: 'step4', label: '4단계: 중복 순위', desc: top ? `가장 많이: ${pad2(top.number)}번 · ${top.count}장` : '갇힌 번호 없음' },
    { key: 'step5', label: '5단계: 추천 번호', desc: combos.length > 0 ? `패턴 점수 순 6개 조합 · ${combos.length}세트` : '추천할 번호 부족' },
  ];
  const current = MENU.find((m) => m.key === view);

  return (
    <div className="flex flex-col gap-3 pb-4">
      {/* 💡 회차 선택 */}
      <div className="flex gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] -mx-1 px-1">
        {roundList.map(({ round, count }) => (
          <button
            key={round}
            onClick={() => leaveCheck() && setSelectedRound(round)}
            className={`${chipBase} rounded-full ${selectedRound === round ? chipOn : chipOff}`}
          >
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

      {/* 💡 자동 검증 결과 */}
      {report.ok ? (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
          <ShieldCheck size={14} className="shrink-0" />
          <span className="truncate">검증 완료 · 패턴 {report.patterns}개 · 2단계 {report.links}건 · 4단계 순위 일치</span>
        </div>
      ) : (
        <button
          onClick={() => setShowErrors(!showErrors)}
          className="text-left flex flex-col gap-1 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-500/40 text-[11px] font-bold text-red-700 dark:text-red-400"
        >
          <span className="flex items-center gap-1.5">
            <ShieldAlert size={14} className="shrink-0" /> 검증 실패 {report.errors.length}건 · {showErrors ? '접기' : '눌러서 보기'}
          </span>
          {(showErrors ? report.errors : report.errors.slice(0, 1)).map((e, i) => (
            <span key={i} className="font-medium break-keep">· {e}</span>
          ))}
        </button>
      )}

      {view === 'menu' ? (
        <>
          {/* 💡 새로 추가된 복권 안내 */}
          {newCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/30 text-[12px] font-bold text-emerald-700 dark:text-emerald-400">
              <Sparkles size={14} /> 마지막 확인 이후 +{newCount}장 추가 · 결과에 반영됨
            </div>
          )}
          {editCount > 0 && (
            <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-zinc-400">
              <span>1단계에서 직접 수정한 내용 {editCount}건이 반영돼 있어요.</span>
              <button onClick={resetEdits} className="ml-auto shrink-0 flex items-center gap-1 px-2 py-1 rounded-md border border-gray-300 dark:border-zinc-600 font-bold text-gray-600 dark:text-zinc-300">
                <RotateCcw size={11} /> 되돌리기
              </button>
            </div>
          )}

          {/* 💡 메뉴 버튼 */}
          <div className="flex flex-col gap-2.5">
            {MENU.map((m) => (
              <button
                key={m.key}
                onClick={() => goView(m.key)}
                className="w-full flex items-center gap-2 px-4 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md active:scale-[0.98] transition-transform text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-black">{m.label}</div>
                  <div className="text-[10.5px] font-bold opacity-85 truncate">{m.desc}</div>
                </div>
                <ChevronRight size={18} className="shrink-0" />
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* 💡 화면 제목 + 메뉴로 돌아가기 (오른쪽 큰 버튼) */}
          <div className="flex items-center gap-2">
            <h2 className="flex-1 min-w-0 text-[16px] font-black text-gray-900 dark:text-zinc-100 truncate">{current?.label}</h2>
            <button
              onClick={() => goView('menu')}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[13px] font-black shadow-md active:scale-95 transition-transform"
            >
              <LayoutList size={16} /> 메뉴
            </button>
          </div>

          {view === 'tickets' && <TicketsByDate roundTickets={roundTickets} ticketNo={ticketNo} isNew={isNew} />}
          {view === 'step1' && (
            <ConnectStep1
              key={selectedRound ?? 'none'}
              roundTickets={roundTickets}
              ticketNo={ticketNo}
              step1={result.step1}
              minLen={minLen}
              appliedOff={appliedOff}
              appliedAdd={appliedAdd}
              appliedFlip={appliedFlip}
              isNew={isNew}
              onApply={applyEdits}
              onDirtyChange={onDirtyChange}
            />
          )}
          {view === 'step2' && <Step2View step2Tickets={result.step2Tickets} step1Count={result.step1.length} ticketNo={ticketNo} />}
          {view === 'step3' && <Step3View key={selectedRound} step3={result.step3} step4={result.step4} ticketNo={ticketNo} />}
          {view === 'step4' && <Step4View step4={result.step4} ticketNo={ticketNo} />}
          {view === 'step5' && <Step5View combos={combos} step3={result.step3} />}
        </>
      )}
    </div>
  );
}