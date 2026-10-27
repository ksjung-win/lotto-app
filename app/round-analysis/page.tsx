'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home, Search, ChevronLeft, ChevronRight, X, Trash2, Download, Square, LayoutGrid, ClipboardList } from 'lucide-react';
import { useLottoStore, CellData } from '../store/useLottoStore';
import { useRoundStore, SavedRound } from '../store/useRoundStore';

const ITEMS_PER_PAGE = 6;

// 진한 배경색(갈색, 남색)이면 글자를 흰색으로
const isDarkColor = (color: string | null) => color === 'bg-[#5D4037]' || color === 'bg-[#1E3A8A]';

// 저장 시각을 보기 좋게 표시 (예: 2026.10.25 14:32)
const formatSavedAt = (ms: number) => {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function RoundAnalysisPage() {
  const router = useRouter();
  const { savedRounds, deleteRound, setJumpToBoard } = useRoundStore();
  const { boards, setBoard } = useLottoStore();

  const [isMounted, setIsMounted] = useState(false);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'single' | 'six'>('single');
  const [singleIdx, setSingleIdx] = useState(0);
  const [sixPage, setSixPage] = useState(0);
  const [searchInput, setSearchInput] = useState('');

  // 불러오기 팝업
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [loadTargetInput, setLoadTargetInput] = useState('');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 💡 저장된 회차 목록 (최신 회차가 앞으로) + 회차별 저장 개수
  const roundList = useMemo(() => {
    const countMap = new Map<number, number>();
    savedRounds.forEach((r) => countMap.set(r.round, (countMap.get(r.round) || 0) + 1));
    return Array.from(countMap.entries())
      .map(([round, count]) => ({ round, count }))
      .sort((a, b) => b.round - a.round);
  }, [savedRounds]);

  // 처음 들어오면(또는 보고 있던 회차가 모두 삭제되면) 가장 최근 회차를 자동 선택
  useEffect(() => {
    if (!isMounted) return;
    const exists = roundList.some((r) => r.round === selectedRound);
    if (!exists) {
      setSelectedRound(roundList.length > 0 ? roundList[0].round : null);
      setSingleIdx(0);
      setSixPage(0);
    }
  }, [isMounted, roundList, selectedRound]);

  // 💡 선택한 회차의 저장 표들 (순번 순서)
  const items: SavedRound[] = useMemo(
    () => savedRounds.filter((r) => r.round === selectedRound).sort((a, b) => a.seq - b.seq),
    [savedRounds, selectedRound]
  );

  // 삭제 등으로 개수가 줄어 범위를 벗어나면 보정
  useEffect(() => {
    if (singleIdx > 0 && singleIdx >= items.length) setSingleIdx(Math.max(0, items.length - 1));
    const maxPage = Math.max(0, Math.ceil(items.length / ITEMS_PER_PAGE) - 1);
    if (sixPage > maxPage) setSixPage(maxPage);
  }, [items.length, singleIdx, sixPage]);

  const currentItem = items[singleIdx];
  const totalSixPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));

  const selectRound = (round: number) => {
    setSelectedRound(round);
    setSingleIdx(0);
    setSixPage(0);
  };

  // 💡 회차 검색
  const handleSearch = () => {
    const round = parseInt(searchInput, 10);
    if (isNaN(round)) {
      alert('회차 번호를 입력해 주세요. (예: 1247)');
      return;
    }
    if (!roundList.some((r) => r.round === round)) {
      alert(`${round}회차로 저장된 표가 없습니다.`);
      return;
    }
    selectRound(round);
    setSearchInput('');
  };

  // 💡 삭제
  const handleDelete = () => {
    if (!currentItem) return;
    if (window.confirm(`'${currentItem.name}' 표를 삭제하시겠습니까?\n삭제하면 되돌릴 수 없습니다.`)) {
      deleteRound(currentItem.id);
    }
  };

  // 💡 불러오기 팝업 열기 (기본값: 원본 표 번호)
  const handleOpenLoad = () => {
    if (!currentItem) return;
    setLoadTargetInput(String(currentItem.sourceBoardIdx + 1));
    setIsLoadModalOpen(true);
  };

  const loadTargetNum = parseInt(loadTargetInput, 10);
  const isLoadTargetValid = !isNaN(loadTargetNum) && loadTargetNum >= 1 && loadTargetNum <= 200;
  const isLoadTargetFilled =
    isLoadTargetValid && (boards[loadTargetNum - 1] || []).some((c) => c && (c.number !== null || c.color !== null));

  // 💡 불러오기 실행: 스튜디오의 해당 표에 덮어쓰고 스튜디오로 이동
  const handleConfirmLoad = () => {
    if (!currentItem) return;
    if (!isLoadTargetValid) {
      alert('1에서 200 사이의 표 번호를 입력해 주세요.');
      return;
    }
    const targetIdx = loadTargetNum - 1;
    setBoard(targetIdx, currentItem.cells);
    setJumpToBoard(targetIdx);
    setIsLoadModalOpen(false);
    router.push('/input');
  };

  // 표 그리기 (크게 / 작게 공용)
  const renderBoard = (cells: CellData[], size: 'large' | 'small') => (
    <div
      className={`grid grid-cols-6 w-full ${
        size === 'large'
          ? 'border-l border-t border-gray-300 dark:border-zinc-500 bg-white dark:bg-zinc-900 shadow-sm'
          : 'gap-1'
      }`}
    >
      {Array.from({ length: 30 }).map((_, i) => {
        const cell = cells[i] || { number: null, color: null };
        const textColor = cell.color
          ? isDarkColor(cell.color) ? 'text-white' : 'text-gray-900'
          : 'text-gray-900 dark:text-white';
        const text = cell.number !== null && cell.number !== undefined ? String(cell.number) : '';
        return size === 'large' ? (
          <div
            key={i}
            className={`aspect-square border-r border-b border-gray-300 dark:border-zinc-500 flex items-center justify-center font-bold text-xl ${cell.color || 'bg-white dark:bg-zinc-900'} ${textColor}`}
          >
            {text}
          </div>
        ) : (
          <div
            key={i}
            className={`w-full h-full min-h-[16px] rounded-[3px] flex items-center justify-center text-[10px] font-bold ${cell.color || 'bg-gray-200 dark:bg-zinc-700/30'} ${textColor}`}
          >
            {text}
          </div>
        );
      })}
    </div>
  );

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-black flex items-center justify-center sm:p-4 transition-colors duration-300">
      <div className="w-full max-w-[400px] sm:aspect-[9/16] bg-white dark:bg-zinc-900 relative flex flex-col shadow-2xl sm:rounded-[3rem] overflow-hidden h-screen sm:h-auto border-[6px] border-white dark:border-zinc-800 transition-colors duration-300">

        {/* 상단 헤더 */}
        <header className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
          <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 transition-colors">
            <Home size={20} />
          </Link>
          <h1 className="text-[16px] font-black bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent tracking-tight">
            회차 별 로또 번호 분석
          </h1>
          <div className="w-9" />
        </header>

        {/* 💡 회차 검색창 */}
        <div className="px-4 pb-2 shrink-0 flex gap-2">
          <div className="relative flex-1">
            <input
              type="number"
              inputMode="numeric"
              placeholder="회차 입력 (예: 1247)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full h-10 bg-gray-100 dark:bg-zinc-800 rounded-xl pl-9 pr-3 text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/50 placeholder:font-normal placeholder:text-gray-400"
            />
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 h-10 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl text-xs shadow-md active:scale-95 transition-all"
          >
            검색
          </button>
        </div>

        {/* 💡 저장된 회차 목록 (누르면 바로 이동) */}
        {roundList.length > 0 && (
          <div className="px-4 pb-2 shrink-0 flex gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {roundList.map(({ round, count }) => (
              <button
                key={round}
                onClick={() => selectRound(round)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${
                  selectedRound === round
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 border-gray-200 dark:border-zinc-700 hover:border-amber-500/50'
                }`}
              >
                {round}회 <span className="opacity-70">({count})</span>
              </button>
            ))}
          </div>
        )}

        {roundList.length === 0 ? (
          /* 💡 저장된 표가 하나도 없을 때 안내 */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-3">
            <div className="w-14 h-14 bg-gray-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-gray-400">
              <ClipboardList size={26} />
            </div>
            <h2 className="text-base font-bold text-gray-800 dark:text-zinc-200">아직 저장된 표가 없습니다</h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed break-keep">
              번호 입력 스튜디오에서 표를 채운 뒤<br />상단의 <strong className="text-emerald-500">[저장]</strong> 버튼을 눌러 회차를 입력해 주세요.
            </p>
            <Link href="/input" className="mt-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold rounded-xl shadow-md active:scale-95 transition-all">
              번호 입력 스튜디오로 가기
            </Link>
          </div>
        ) : (
          <>
            {/* 💡 보기 방식 전환 */}
            <div className="px-4 pb-2 shrink-0 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 dark:text-zinc-400">
                <span className="text-amber-500">{selectedRound}회</span> 저장 표 {items.length}개
              </span>
              <div className="flex bg-gray-100 dark:bg-zinc-800 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('single')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-colors ${
                    viewMode === 'single' ? 'bg-white dark:bg-zinc-900 text-amber-500 shadow-sm' : 'text-gray-500 dark:text-zinc-400'
                  }`}
                >
                  <Square size={12} /> 1개씩
                </button>
                <button
                  onClick={() => setViewMode('six')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-colors ${
                    viewMode === 'six' ? 'bg-white dark:bg-zinc-900 text-amber-500 shadow-sm' : 'text-gray-500 dark:text-zinc-400'
                  }`}
                >
                  <LayoutGrid size={12} /> 6개씩
                </button>
              </div>
            </div>

            {viewMode === 'single' ? (
              /* ───────── 1개씩 보기 ───────── */
              <>
                <div className="flex-1 overflow-y-auto px-4 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {currentItem && (
                    <div className="flex flex-col gap-3">
                      <div className="bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700/50 rounded-xl px-3 py-2.5">
                        <div className="font-black text-gray-900 dark:text-white text-[15px]">{currentItem.name}</div>
                        <div className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                          원본: {currentItem.sourceBoardIdx + 1}번 표 · 저장: {formatSavedAt(currentItem.savedAt)}
                        </div>
                      </div>

                      {renderBoard(currentItem.cells, 'large')}

                      <div className="flex gap-2">
                        <button
                          onClick={handleOpenLoad}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/30 text-xs font-bold active:scale-95 transition-all"
                        >
                          <Download size={14} /> 스튜디오로 불러오기
                        </button>
                        <button
                          onClick={handleDelete}
                          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-zinc-900/50 text-red-500 border border-red-500/30 text-xs font-bold active:scale-95 transition-all"
                        >
                          <Trash2 size={14} /> 삭제
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 이전/다음 */}
                <div className="w-full px-4 flex justify-center shrink-0 mb-5">
                  <div className="flex items-center justify-center w-full max-w-[200px] bg-white dark:bg-zinc-800 rounded-full shadow-sm border border-gray-200 dark:border-zinc-700 p-1">
                    <button
                      onClick={() => setSingleIdx((i) => Math.max(0, i - 1))}
                      disabled={singleIdx === 0}
                      className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <span className="font-black text-amber-500 text-base flex-1 text-center">
                      {items.length > 0 ? singleIdx + 1 : 0} <span className="text-gray-400 dark:text-zinc-500 text-sm font-medium">/ {items.length}</span>
                    </span>
                    <button
                      onClick={() => setSingleIdx((i) => Math.min(items.length - 1, i + 1))}
                      disabled={singleIdx >= items.length - 1}
                      className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* ───────── 6개씩 보기 ───────── */
              <>
                <div className="flex-1 px-3 pb-2 overflow-hidden">
                  <div className="grid grid-cols-2 grid-rows-3 gap-2.5 h-full">
                    {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => {
                      const itemIdx = sixPage * ITEMS_PER_PAGE + i;
                      const item = items[itemIdx];
                      if (!item) {
                        return <div key={i} className="rounded-xl border border-dashed border-gray-200 dark:border-zinc-800" />;
                      }
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setSingleIdx(itemIdx);
                            setViewMode('single');
                          }}
                          className="flex flex-col bg-gray-50 dark:bg-zinc-800/40 p-2 rounded-xl border border-gray-200 dark:border-zinc-700/50 hover:border-amber-500/50 text-left active:scale-[0.98] transition-all min-h-0"
                        >
                          <div className="text-[10.5px] font-bold text-gray-700 dark:text-zinc-300 mb-1.5 pl-0.5 truncate w-full">
                            {item.name}
                          </div>
                          <div className="flex-1 w-full min-h-0">{renderBoard(item.cells, 'small')}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between px-4 pb-5 pt-1 shrink-0">
                  <button
                    onClick={() => setSixPage((p) => Math.max(0, p - 1))}
                    disabled={sixPage === 0}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 text-[13px] font-medium disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft size={16} /> 이전
                  </button>
                  <span className="text-[13px] font-bold text-amber-500">
                    {sixPage + 1} <span className="text-gray-400 dark:text-zinc-500 font-normal">/ {totalSixPages}</span>
                  </span>
                  <button
                    onClick={() => setSixPage((p) => Math.min(totalSixPages - 1, p + 1))}
                    disabled={sixPage >= totalSixPages - 1}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 text-[13px] font-medium disabled:opacity-30 transition-colors"
                  >
                    다음 <ChevronRight size={16} />
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* 💡 스튜디오로 불러오기 팝업 */}
        {isLoadModalOpen && currentItem && (
          <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-[300px] overflow-hidden flex flex-col">
              <div className="bg-gray-50 dark:bg-zinc-800 p-3 border-b dark:border-zinc-700 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 dark:text-zinc-200 ml-2 text-sm">스튜디오로 불러오기</h3>
                <button
                  onClick={() => setIsLoadModalOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  <X size={18} className="text-gray-600 dark:text-zinc-300" />
                </button>
              </div>
              <div className="p-5 flex flex-col gap-3 bg-gray-100 dark:bg-zinc-950">
                <p className="text-xs text-gray-500 dark:text-zinc-400 break-keep">
                  <strong className="text-gray-800 dark:text-zinc-100">{currentItem.name}</strong> 표를 번호 입력 스튜디오의 아래 표 번호에 넣습니다.
                </p>
                <label className="text-xs font-bold text-gray-700 dark:text-zinc-300">넣을 표 번호 (1~200)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={loadTargetInput}
                  onChange={(e) => setLoadTargetInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirmLoad()}
                  className="w-full border border-gray-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white rounded-xl px-4 py-3 text-center text-base font-bold outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  autoFocus
                />
                {isLoadTargetFilled && (
                  <p className="text-[11px] font-bold text-red-500 break-keep">
                    ⚠️ {loadTargetNum}번 표에 이미 내용이 있습니다. 불러오면 기존 내용은 지워집니다.
                  </p>
                )}
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => setIsLoadModalOpen(false)}
                    className="flex-1 py-3 rounded-xl bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 text-sm font-medium"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleConfirmLoad}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold active:scale-95 transition-all shadow-lg shadow-amber-500/25"
                  >
                    불러오기
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
