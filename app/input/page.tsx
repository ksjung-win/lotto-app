'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Home, Search, Settings, ChevronLeft, ChevronRight, X, Eraser, MousePointer2, Layers } from 'lucide-react';
import { useLottoStore } from '../store/useLottoStore';

export default function InputPage() {
  const { boards, focusedCell, setFocusedCell, setCellColor, setCellNumber, resetBoard } = useLottoStore();
  
  const [activeBoardIdx, setActiveBoardIdx] = useState(0);
  const [selectedBrush, setSelectedBrush] = useState<string | null>(null); 
  const [isNumberModalOpen, setIsNumberModalOpen] = useState(false);
  const [pendingCell, setPendingCell] = useState<{ boardIdx: number; cellIdx: number } | null>(null);

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [matchedBoards, setMatchedBoards] = useState<number[]>([]);
  const [matchPageIndex, setMatchPageIndex] = useState(0);

  const numbers1to45 = Array.from({ length: 45 }, (_, i) => i + 1);
  
  const colors = [
    { id: 'red', value: 'bg-red-300' },
    { id: 'orange', value: 'bg-orange-300' },
    { id: 'yellow', value: 'bg-yellow-300' },
    { id: 'green', value: 'bg-green-300' },
    { id: 'blue', value: 'bg-blue-300' },
    { id: 'brown', value: 'bg-[#5D4037]' },
    { id: 'navy', value: 'bg-[#1E3A8A]' },
  ];

  const getMatchedBoardsForCurrentBoard = () => {
    const currentBoardData = boards[activeBoardIdx] || [];
    const endDigitCounts = new Array(10).fill(0);
    
    currentBoardData.forEach(c => {
      if (c && c.number !== null) {
        endDigitCounts[c.number % 10]++;
      }
    });

    const targetDigit = endDigitCounts.findIndex(count => count >= 3);
    if (targetDigit === -1) return [];

    const matches: number[] = [];
    for (let idx = 0; idx < 200; idx++) {
      if (idx === activeBoardIdx) continue;
      const boardToScan = boards[idx];
      if (!boardToScan) continue;
      
      let count = 0;
      boardToScan.forEach(c => {
        if (c && c.number !== null && (c.number % 10) === targetDigit) {
          count++;
        }
      });
      
      if (count >= 3) {
        matches.push(idx);
      }
    }
    return matches;
  };

  const currentMatched = getMatchedBoardsForCurrentBoard();
  const hasPattern = currentMatched.length > 0;

  const handleCellClick = (cellIdx: number) => {
    if (selectedBrush === null) {
      setPendingCell({ boardIdx: activeBoardIdx, cellIdx });
      setFocusedCell(activeBoardIdx, cellIdx);
      setIsNumberModalOpen(true);
    } else if (selectedBrush === 'eraser') {
      setCellColor(activeBoardIdx, cellIdx, null);
    } else {
      setCellColor(activeBoardIdx, cellIdx, selectedBrush);
    }
  };

  const handleNumberSelect = (num: number | null) => {
    if (num !== null) {
      setCellNumber(num);
      setTimeout(() => {
        const matches = getMatchedBoardsForCurrentBoard();
        if (matches.length > 0) {
          setMatchedBoards(matches);
          setMatchPageIndex(0);
          setIsMatchModalOpen(true);
        } else {
          setIsMatchModalOpen(false);
        }
      }, 50);
    } else {
      setCellNumber(0);
      setIsMatchModalOpen(false);
    }
    setIsNumberModalOpen(false);
    setPendingCell(null);
    setFocusedCell(null, null);
  };

  const handleReset = () => {
    if (window.confirm(`${activeBoardIdx + 1}번 표의 입력 내용을 지우시겠습니까?`)) {
      resetBoard(activeBoardIdx);
      setIsMatchModalOpen(false);
    }
  };

  const handlePrevBoard = () => {
    setActiveBoardIdx(prev => Math.max(0, prev - 1));
    setIsMatchModalOpen(false);
  };
  const handleNextBoard = () => {
    setActiveBoardIdx(prev => Math.min(199, prev + 1));
    setIsMatchModalOpen(false);
  };

  const handleSearch = () => {
    const targetNum = parseInt(searchQuery, 10);
    if (!isNaN(targetNum) && targetNum >= 1 && targetNum <= 200) {
      setActiveBoardIdx(targetNum - 1);
      setIsSearchModalOpen(false);
      setSearchQuery('');
      setIsMatchModalOpen(false);
    } else {
      alert('1에서 200 사이의 숫자를 입력해 주세요.');
      setSearchQuery('');
    }
  };

  const activeBoard = boards[activeBoardIdx] || Array.from({ length: 30 }, () => ({ number: null, color: null }));

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-black flex items-center justify-center sm:p-4 transition-colors duration-300">
      <div 
        className={`
          w-full max-w-[400px] sm:aspect-[9/16] bg-white dark:bg-zinc-900 relative flex flex-col 
          shadow-2xl sm:rounded-[3rem] overflow-hidden h-screen sm:h-auto border-[6px] 
          border-white dark:border-zinc-800 transition-colors duration-300
        `}
      >
        
        {/* 상단 밀어내기 팝업 모달 */}
        {isMatchModalOpen && matchedBoards.length > 0 && (
          <div className="w-full px-2 pt-3 shrink-0 flex flex-col items-center animate-in slide-in-from-top-4 duration-300 z-50">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-md border-2 border-amber-500/60 p-2 w-full max-w-[360px] flex flex-col relative">
              
              <button 
                onClick={() => setIsMatchModalOpen(false)} 
                className="absolute top-1.5 right-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white bg-gray-100 dark:bg-zinc-800 rounded-full p-1 transition-colors z-10"
              >
                <X size={12} />
              </button>

              <div className="flex justify-center gap-2 w-full mt-1">
                {matchedBoards.slice(matchPageIndex, matchPageIndex + 3).map((boardIdx) => (
                  <div key={boardIdx} className="flex flex-col items-center w-[100px]">
                    <button 
                      onClick={() => {
                        setActiveBoardIdx(boardIdx);
                        setIsMatchModalOpen(false);
                      }}
                      className="text-[10px] font-black text-gray-800 dark:text-zinc-200 hover:text-amber-500 dark:hover:text-amber-500 transition-colors mb-1.5 cursor-pointer border-b border-amber-500/50 pb-0.5"
                    >
                      제 {boardIdx + 1}번 표
                    </button>
                    
                    <div className="grid grid-cols-6 border-l border-t border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 w-full shadow-sm">
                      {(boards[boardIdx] || Array(30).fill({number: null, color: null})).map((c, cellI) => {
                        const isDarkBg = c.color === 'bg-[#5D4037]' || c.color === 'bg-[#1E3A8A]';
                        const textColorClass = c.color ? (isDarkBg ? 'text-white' : 'text-gray-900') : 'text-gray-300 dark:text-zinc-600';
                        return (
                          <div key={cellI} className={`aspect-square border-r border-b border-gray-300 dark:border-zinc-600 flex items-center justify-center text-[9px] font-bold transition-colors ${c.color || 'bg-white dark:bg-zinc-900'} ${textColorClass}`}>
                            {c.number !== null ? c.number : ''}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {matchedBoards.length > 3 && (
                <div className="flex justify-center items-center gap-3 mt-2 mb-0.5">
                  <button 
                    disabled={matchPageIndex === 0} 
                    onClick={() => setMatchPageIndex(p => p - 3)} 
                    className="p-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 disabled:opacity-30 transition-colors text-gray-700 dark:text-gray-300"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="font-bold text-[10px] text-gray-500 dark:text-zinc-400">
                    <span className="text-amber-500">{Math.floor(matchPageIndex / 3) + 1}</span> / {Math.ceil(matchedBoards.length / 3)}
                  </span>
                  <button 
                    disabled={matchPageIndex + 3 >= matchedBoards.length} 
                    onClick={() => setMatchPageIndex(p => p + 3)} 
                    className="p-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 disabled:opacity-30 transition-colors text-gray-700 dark:text-gray-300"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 💡 상단 타이틀 영역 (여백 최적화: pt-6 -> pt-4, pb-4 -> pb-3) */}
        <div className={`${isMatchModalOpen ? 'pt-2' : 'pt-4'} pb-3 px-3 flex justify-between items-center shrink-0 gap-1 overflow-hidden transition-all duration-300`}>
          <h1 className="text-[15px] sm:text-lg font-black bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent tracking-tight whitespace-nowrap shrink">
            당첨 번호 입력 스튜디오
          </h1>
          <div className="flex items-center gap-1.5 shrink-0">
            <button 
              onClick={() => {
                const matches = getMatchedBoardsForCurrentBoard();
                if (matches.length > 0) {
                  setMatchedBoards(matches);
                  setMatchPageIndex(0);
                  setIsMatchModalOpen(true);
                } else {
                  alert('현재 표에 3개 이상 일치하는 동일 끝수 패턴이 없습니다.');
                }
              }}
              className={`text-[11px] sm:text-xs px-2 py-1.5 rounded-md font-bold transition-all shadow-sm flex items-center gap-1 whitespace-nowrap ${
                hasPattern 
                  ? 'bg-amber-500 text-white hover:bg-amber-600 active:scale-95 shadow-amber-500/30' 
                  : 'bg-gray-200 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 hover:bg-gray-300 dark:hover:bg-zinc-700'
              }`}
            >
              <Layers size={12} />
              동일 패턴
            </button>
            <button 
              onClick={handleReset} 
              className="text-[11px] sm:text-xs bg-red-50 dark:bg-zinc-900/50 text-red-500 border border-red-500/30 px-2 py-1.5 rounded-md font-bold hover:bg-red-100 dark:hover:bg-red-950/50 active:scale-95 transition-all shadow-sm whitespace-nowrap"
            >
              표 지우기
            </button>
          </div>
        </div>

        {/* 💡 스크롤 되는 중앙 영역 (오직 팔레트와 표만 스크롤 됨) */}
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col items-center w-full pb-2">
          
          {/* 팔레트 영역 (mb-6 -> mb-4로 여백 축소) */}
          <div className="w-[90%] bg-gray-50 dark:bg-zinc-800/80 rounded-2xl p-2.5 mb-4 border border-gray-200 dark:border-zinc-700/50 shadow-sm shrink-0 transition-colors duration-300">
            <div className="flex justify-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setSelectedBrush(null)}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                  selectedBrush === null 
                    ? 'border-amber-500 bg-white shadow-md scale-110' 
                    : 'border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-200'
                }`}
              >
                <MousePointer2 className={selectedBrush === null ? "text-amber-500" : "text-gray-700"} size={14} />
              </button>

              <button
                onClick={() => setSelectedBrush('eraser')}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                  selectedBrush === 'eraser' 
                    ? 'border-amber-500 bg-white shadow-md scale-110' 
                    : 'border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-200'
                }`}
              >
                <Eraser className="text-gray-700" size={14} />
              </button>
              
              {colors.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedBrush(c.value)}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 transition-all ${c.value} ${
                    selectedBrush === c.value 
                      ? 'border-amber-500 shadow-md scale-110' 
                      : 'border-transparent'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* 메인 6x5 표 (mb-6 -> mb-2로 하단 여백 대폭 축소) */}
          <div className="w-full px-4 mb-2 shrink-0">
            <div className="grid grid-cols-6 border-l border-t border-gray-300 dark:border-zinc-500 bg-white dark:bg-zinc-900 shadow-sm w-full transition-colors duration-300">
              {activeBoard.map((cell, cellIdx) => {
                const isFocused = focusedCell?.boardIdx === activeBoardIdx && focusedCell?.cellIdx === cellIdx;
                const isDarkBg = cell.color === 'bg-[#5D4037]' || cell.color === 'bg-[#1E3A8A]';
                const textColorClass = cell.color ? (isDarkBg ? 'text-white' : 'text-gray-900') : 'text-gray-900 dark:text-white';

                return (
                  <div
                    key={cellIdx}
                    onClick={() => handleCellClick(cellIdx)}
                    className={`
                      aspect-square border-r border-b border-gray-300 dark:border-zinc-500 flex items-center justify-center font-bold text-xl cursor-pointer transition-colors duration-200
                      ${cell.color ? cell.color : 'bg-white dark:bg-zinc-900'} 
                      ${textColorClass}
                      ${isFocused ? 'ring-inset ring-[3px] ring-amber-500 z-10' : ''}
                    `}
                  >
                    {cell.number !== null ? cell.number : ''}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 💡 하단에 찰싹 고정된(Sticky) 이동 버튼! 스크롤 영역 바깥으로 빼내어 절대 안 사라짐 */}
        <div className="w-full px-4 flex justify-center shrink-0 mb-3 relative z-20">
          <div className="flex items-center justify-center w-full max-w-[200px] bg-white dark:bg-zinc-800 rounded-full shadow-sm border border-gray-200 dark:border-zinc-700 p-1 transition-colors duration-300">
            <button 
              onClick={handlePrevBoard}
              disabled={activeBoardIdx === 0}
              className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 active:bg-gray-200 dark:active:bg-zinc-600 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="font-black text-amber-500 text-base flex-1 text-center">
              {activeBoardIdx + 1} <span className="text-gray-400 dark:text-zinc-500 text-sm font-medium">/ 200</span>
            </span>
            <button 
              onClick={handleNextBoard}
              disabled={activeBoardIdx === 199}
              className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 active:bg-gray-200 dark:active:bg-zinc-600 disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* 최하단 메뉴바 */}
        <div 
          className={`
            w-full bg-white dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800 
            flex justify-around items-center pt-3 pb-5 sm:pb-6 z-40 shrink-0 
            shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.3)] 
            transition-colors duration-300
          `}
        >
          <Link className="flex flex-col items-center text-gray-500 dark:text-zinc-400 w-16 gap-1.5 group" href="/">
            <div className="bg-gray-100 dark:bg-black group-hover:text-amber-500 p-2 rounded-xl w-full flex justify-center shadow-sm transition-all duration-300 group-active:scale-95">
              <Home size={20} />
            </div>
            <span className="text-[11px] font-bold leading-none group-hover:text-amber-500 transition-colors">홈</span>
          </Link>
          
          <button 
            onClick={() => setIsSearchModalOpen(true)} 
            className="flex flex-col items-center text-gray-500 dark:text-zinc-400 w-16 gap-1.5 group"
          >
            <div className="bg-gray-100 dark:bg-black group-hover:text-amber-500 p-2 rounded-xl w-full flex justify-center shadow-sm transition-all duration-300 group-active:scale-95">
              <Search size={20} />
            </div>
            <span className="text-[11px] font-bold leading-none group-hover:text-amber-500 transition-colors">검색</span>
          </button>

          <button 
            onClick={() => alert('향후 추가될 기능입니다.')} 
            className="flex flex-col items-center text-gray-500 dark:text-zinc-400 w-16 gap-1.5 group"
          >
            <div className="bg-gray-100 dark:bg-black group-hover:text-amber-500 p-2 rounded-xl w-full flex justify-center shadow-sm transition-all duration-300 group-active:scale-95">
              <Settings size={20} />
            </div>
            <span className="text-[11px] font-bold leading-none group-hover:text-amber-500 transition-colors">설정</span>
          </button>
        </div>

        {isSearchModalOpen && (
          <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-[280px] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="bg-gray-50 dark:bg-zinc-800 p-3 border-b dark:border-zinc-700 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 dark:text-zinc-200 ml-2 text-sm">표 이동하기</h3>
                <button 
                  onClick={() => setIsSearchModalOpen(false)} 
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700 active:bg-gray-300 dark:active:bg-zinc-600 transition-colors"
                >
                  <X size={18} className="text-gray-600 dark:text-zinc-300" />
                </button>
              </div>
              <div className="p-5 flex flex-col gap-4 bg-gray-100 dark:bg-zinc-950">
                <input
                  type="number"
                  placeholder="번호 입력 (1~200)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full border border-gray-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white rounded-xl px-4 py-3 text-center text-sm font-medium outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all duration-300 shadow-inner"
                  autoFocus
                />
                <button
                  onClick={handleSearch}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 active:scale-95 transition-all duration-300 shadow-lg shadow-amber-500/25"
                >
                  이동
                </button>
              </div>
            </div>
          </div>
        )}

        {isNumberModalOpen && (
          <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-[340px] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="bg-gray-50 dark:bg-zinc-800 p-2 border-b dark:border-zinc-700 flex justify-end items-center">
                <button 
                  onClick={() => setIsNumberModalOpen(false)} 
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700 active:bg-gray-300 dark:active:bg-zinc-600 transition-colors"
                >
                  <X size={20} className="text-gray-600 dark:text-zinc-300" />
                </button>
              </div>
              <div className="p-4 bg-gray-100 dark:bg-zinc-950">
                <div className="grid grid-cols-6 border-l border-t border-gray-300 dark:border-zinc-500 bg-white dark:bg-zinc-900">
                  {numbers1to45.map(num => (
                    <div
                      key={num}
                      onClick={() => handleNumberSelect(num)}
                      className="aspect-square border-r border-b border-gray-300 dark:border-zinc-500 flex items-center justify-center font-bold text-lg text-gray-900 dark:text-white cursor-pointer hover:bg-amber-500/10 dark:hover:bg-amber-500/20 active:bg-amber-500/30 dark:active:bg-amber-500/40 transition-colors"
                    >
                      {num}
                    </div>
                  ))}
                  <div className="aspect-square border-r border-b border-gray-300 dark:border-zinc-500 bg-gray-100 dark:bg-zinc-800/50"></div>
                  <div className="aspect-square border-r border-b border-gray-300 dark:border-zinc-500 bg-gray-100 dark:bg-zinc-800/50"></div>
                  <div className="aspect-square border-r border-b border-gray-300 dark:border-zinc-500 bg-gray-100 dark:bg-zinc-800/50"></div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}