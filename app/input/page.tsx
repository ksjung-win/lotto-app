'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Home, Search, Settings, ChevronLeft, ChevronRight, X, Eraser } from 'lucide-react';
import { useLottoStore } from '../store/useLottoStore';

export default function InputPage() {
  const { boards, focusedCell, setFocusedCell, setCellColor, setCellNumber, resetBoard } = useLottoStore();
  
  const [activeBoardIdx, setActiveBoardIdx] = useState(0);
  const [selectedBrush, setSelectedBrush] = useState<string | null>(null); 
  const [isNumberModalOpen, setIsNumberModalOpen] = useState(false);
  const [pendingCell, setPendingCell] = useState<{ boardIdx: number; cellIdx: number } | null>(null);

  const numbers1to45 = Array.from({ length: 45 }, (_, i) => i + 1);
  
  const colors = [
    { id: 'red', value: 'bg-red-300' },
    { id: 'orange', value: 'bg-orange-300' },
    { id: 'yellow', value: 'bg-yellow-300' },
    { id: 'green', value: 'bg-green-300' },
    { id: 'blue', value: 'bg-blue-300' },
    { id: 'indigo', value: 'bg-indigo-300' },
    { id: 'purple', value: 'bg-purple-300' },
  ];

  const handleCellClick = (cellIdx: number) => {
    if (selectedBrush !== undefined) {
      setCellColor(activeBoardIdx, cellIdx, selectedBrush === 'bg-white' ? null : selectedBrush);
    }
    setPendingCell({ boardIdx: activeBoardIdx, cellIdx });
    setFocusedCell(activeBoardIdx, cellIdx);
    setIsNumberModalOpen(true);
  };

  const handleNumberSelect = (num: number | null) => {
    if (num !== null) {
      setCellNumber(num);
    } else {
      setCellNumber(0);
    }
    setIsNumberModalOpen(false);
    setPendingCell(null);
    setFocusedCell(null, null);
  };

  const handleReset = () => {
    if (window.confirm(`${activeBoardIdx + 1}번 표의 입력 내용을 모두 지우시겠습니까?`)) {
      resetBoard(activeBoardIdx);
    }
  };

  const handlePrevBoard = () => setActiveBoardIdx(prev => Math.max(0, prev - 1));
  const handleNextBoard = () => setActiveBoardIdx(prev => Math.min(49, prev + 1));

  const activeBoard = boards[activeBoardIdx];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-black flex items-center justify-center sm:p-4 transition-colors duration-300">
      <div className="w-full max-w-[400px] sm:aspect-[9/16] bg-white dark:bg-zinc-900 relative flex flex-col shadow-2xl sm:rounded-[3rem] overflow-hidden h-screen sm:h-auto border-[6px] border-white dark:border-zinc-800 transition-colors duration-300">
        
        <div className="pt-6 pb-4 px-4 flex justify-between items-center shrink-0">
          <h1 className="text-lg font-black bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent tracking-tight">
            당첨 번호 입력 스튜디오
          </h1>
          <button 
            onClick={handleReset} 
            className="text-xs bg-red-50 dark:bg-zinc-900/50 text-red-500 border border-red-500/30 px-2.5 py-1.5 rounded-md font-bold hover:bg-red-100 dark:hover:bg-red-950/50 active:scale-95 transition-all shadow-sm"
          >
            현재 표 지우기
          </button>
        </div>

        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col items-center w-full">
          
          <div className="w-[90%] bg-gray-50 dark:bg-zinc-800/80 rounded-2xl p-3 mb-6 border border-gray-200 dark:border-zinc-700/50 shadow-sm shrink-0 transition-colors duration-300">
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setSelectedBrush('bg-white')}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                  selectedBrush === 'bg-white' || selectedBrush === null 
                    ? 'border-amber-500 bg-white shadow-md scale-110' 
                    : 'border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-200'
                }`}
              >
                <Eraser size={14} className="text-gray-700"/>
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

          <div className="w-full px-4 mb-6 shrink-0">
            {/* 메인 표 윤곽선을 dark:border-zinc-500으로 변경하여 다크모드 시인성 확보 */}
            <div className="grid grid-cols-6 border-l border-t border-gray-300 dark:border-zinc-500 bg-white dark:bg-zinc-900 shadow-sm w-full transition-colors duration-300">
              {activeBoard.map((cell, cellIdx) => {
                const isFocused = focusedCell?.boardIdx === activeBoardIdx && focusedCell?.cellIdx === cellIdx;
                return (
                  <div
                    key={cellIdx}
                    onClick={() => handleCellClick(cellIdx)}
                    className={`
                      aspect-square border-r border-b border-gray-300 dark:border-zinc-500 flex items-center justify-center font-bold text-xl cursor-pointer transition-colors duration-200
                      ${cell.color ? cell.color : 'bg-white dark:bg-zinc-900'} 
                      ${cell.color ? 'text-gray-900' : 'text-gray-900 dark:text-white'}
                      ${isFocused ? 'ring-inset ring-[3px] ring-amber-500 z-10' : ''}
                    `}
                  >
                    {cell.number !== null ? cell.number : ''}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-center w-full max-w-[200px] mb-8 bg-white dark:bg-zinc-800 rounded-full shadow-sm border border-gray-200 dark:border-zinc-700 p-1 shrink-0 transition-colors duration-300">
            <button 
              onClick={handlePrevBoard}
              disabled={activeBoardIdx === 0}
              className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 active:bg-gray-200 dark:active:bg-zinc-600 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="font-black text-amber-500 text-base flex-1 text-center">
              {activeBoardIdx + 1} <span className="text-gray-400 dark:text-zinc-500 text-sm font-medium">/ 50</span>
            </span>
            <button 
              onClick={handleNextBoard}
              disabled={activeBoardIdx === 49}
              className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 active:bg-gray-200 dark:active:bg-zinc-600 disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>

        </div>

        <div className="w-full bg-white dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800 flex justify-around items-center pt-3 pb-5 sm:pb-6 z-40 shrink-0 shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.3)] transition-colors duration-300">
          <Link href="/" className="flex flex-col items-center text-gray-500 dark:text-zinc-400 w-16 gap-1.5 group">
            <div className="bg-gray-100 dark:bg-black group-hover:text-amber-500 p-2 rounded-xl w-full flex justify-center shadow-sm transition-all duration-300 group-active:scale-95">
              <Home size={20} />
            </div>
            <span className="text-[11px] font-bold leading-none group-hover:text-amber-500 transition-colors">홈</span>
          </Link>
          <button onClick={() => alert('향후 추가될 기능입니다.')} className="flex flex-col items-center text-gray-500 dark:text-zinc-400 w-16 gap-1.5 group">
            <div className="bg-gray-100 dark:bg-black group-hover:text-amber-500 p-2 rounded-xl w-full flex justify-center shadow-sm transition-all duration-300 group-active:scale-95">
              <Search size={20} />
            </div>
            <span className="text-[11px] font-bold leading-none group-hover:text-amber-500 transition-colors">검색</span>
          </button>
          <button onClick={() => alert('향후 추가될 기능입니다.')} className="flex flex-col items-center text-gray-500 dark:text-zinc-400 w-16 gap-1.5 group">
            <div className="bg-gray-100 dark:bg-black group-hover:text-amber-500 p-2 rounded-xl w-full flex justify-center shadow-sm transition-all duration-300 group-active:scale-95">
              <Settings size={20} />
            </div>
            <span className="text-[11px] font-bold leading-none group-hover:text-amber-500 transition-colors">설정</span>
          </button>
        </div>

        {isNumberModalOpen && (
          <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-[340px] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
              
              <div className="bg-gray-50 dark:bg-zinc-800 p-2 border-b dark:border-zinc-700 flex justify-end items-center">
                <button 
                  onClick={() => setIsNumberModalOpen(false)} 
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700 active:bg-gray-300 dark:active:bg-zinc-600 transition-colors"
                >
                  <X size={20} className="text-gray-600 dark:text-zinc-300"/>
                </button>
              </div>
              
              <div className="p-4 bg-gray-100 dark:bg-zinc-950">
                {/* 팝업 모달창의 표 윤곽선도 dark:border-zinc-500으로 변경 */}
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