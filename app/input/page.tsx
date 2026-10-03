'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Home, Search, Settings, ChevronLeft, ChevronRight, X, Eraser } from 'lucide-react';
import { useLottoStore } from '../store/useLottoStore';

export default function InputPage() {
  // resetBoard 기능을 스토어에서 가져옵니다
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

  // 현재 표만 지우도록 로직 변경
  const handleReset = () => {
    if (window.confirm(`${activeBoardIdx + 1}번 표의 입력 내용을 모두 지우시겠습니까?`)) {
      resetBoard(activeBoardIdx);
    }
  };

  const handlePrevBoard = () => setActiveBoardIdx(prev => Math.max(0, prev - 1));
  const handleNextBoard = () => setActiveBoardIdx(prev => Math.min(49, prev + 1));

  const activeBoard = boards[activeBoardIdx];

  return (
    <div className="min-h-screen bg-gray-200 flex items-center justify-center sm:p-4">
      <div className="w-full max-w-[400px] sm:aspect-[9/16] bg-white relative flex flex-col shadow-2xl sm:rounded-[2.5rem] overflow-hidden h-screen sm:h-auto border-[6px] border-white">
        
        <div className="pt-6 pb-4 px-4 flex justify-between items-center shrink-0">
          <h1 className="text-lg font-black text-gray-800 tracking-tight">당첨 번호 입력 스튜디오</h1>
          {/* 버튼 이름 변경: 현재 표 지우기 */}
          <button onClick={handleReset} className="text-xs bg-red-500 text-white px-2.5 py-1.5 rounded-md font-bold active:bg-red-600 shadow-sm">
            현재 표 지우기
          </button>
        </div>

        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col items-center w-full">
          
          <div className="w-[90%] bg-gray-100 rounded-lg p-3 mb-6 border border-gray-200 shadow-sm shrink-0">
            {/* 불필요한 텍스트 제거 완료 */}
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setSelectedBrush('bg-white')}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 transition-all ${selectedBrush === 'bg-white' || selectedBrush === null ? 'border-gray-800 bg-white shadow-md' : 'border-gray-300 bg-white'}`}
              >
                <Eraser size={14} className="text-gray-600"/>
              </button>
              {colors.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedBrush(c.value)}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 transition-all ${c.value} ${selectedBrush === c.value ? 'border-gray-800 shadow-md scale-110' : 'border-transparent'}`}
                />
              ))}
            </div>
          </div>

          <div className="w-full px-4 mb-6 shrink-0">
            <div className="grid grid-cols-6 border-l border-t border-black bg-white shadow-sm w-full">
              {activeBoard.map((cell, cellIdx) => {
                const isFocused = focusedCell?.boardIdx === activeBoardIdx && focusedCell?.cellIdx === cellIdx;
                return (
                  <div
                    key={cellIdx}
                    onClick={() => handleCellClick(cellIdx)}
                    className={`
                      aspect-square border-r border-b border-black flex items-center justify-center font-bold text-xl cursor-pointer
                      ${cell.color || 'bg-white'} 
                      ${isFocused ? 'ring-inset ring-4 ring-blue-600' : ''}
                    `}
                  >
                    {cell.number !== null ? cell.number : ''}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-center w-full max-w-[200px] mb-8 bg-white rounded-full shadow-sm border p-1 shrink-0">
            <button 
              onClick={handlePrevBoard}
              disabled={activeBoardIdx === 0}
              className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="font-black text-blue-600 text-base flex-1 text-center">
              {activeBoardIdx + 1} <span className="text-gray-400 text-sm font-medium">/ 50</span>
            </span>
            <button 
              onClick={handleNextBoard}
              disabled={activeBoardIdx === 49}
              className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>

        </div>

        <div className="w-full bg-white border-t flex justify-around items-center pt-3 pb-5 sm:pb-6 z-40 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <Link href="/" className="flex flex-col items-center text-gray-600 w-16 gap-1">
            <div className="bg-[#0092E4] text-white p-2 rounded-md w-full flex justify-center shadow-sm">
              <Home size={20} />
            </div>
            <span className="text-[11px] font-bold leading-none">홈</span>
          </Link>
          <button onClick={() => alert('향후 추가될 기능입니다.')} className="flex flex-col items-center text-gray-600 w-16 gap-1">
            <div className="bg-[#0092E4] text-white p-2 rounded-md w-full flex justify-center shadow-sm">
              <Search size={20} />
            </div>
            <span className="text-[11px] font-bold leading-none">검색</span>
          </button>
          <button onClick={() => alert('향후 추가될 기능입니다.')} className="flex flex-col items-center text-gray-600 w-16 gap-1">
            <div className="bg-[#0092E4] text-white p-2 rounded-md w-full flex justify-center shadow-sm">
              <Settings size={20} />
            </div>
            <span className="text-[11px] font-bold leading-none">설정</span>
          </button>
        </div>

        {isNumberModalOpen && (
          <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-[340px] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
              
              {/* 모달 텍스트 제거 및 닫기 버튼 우측 정렬 유지 */}
              <div className="bg-gray-50 p-2 border-b flex justify-end items-center">
                <button onClick={() => setIsNumberModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 active:bg-gray-300 transition-colors">
                  <X size={20} className="text-gray-600"/>
                </button>
              </div>
              
              <div className="p-4 bg-gray-100">
                <div className="grid grid-cols-6 border-l border-t border-black bg-white">
                  {numbers1to45.map(num => (
                    <div
                      key={num}
                      onClick={() => handleNumberSelect(num)}
                      className="aspect-square border-r border-b border-black flex items-center justify-center font-bold text-lg cursor-pointer hover:bg-blue-50 active:bg-blue-200 transition-colors"
                    >
                      {num}
                    </div>
                  ))}
                  <div className="aspect-square border-r border-b border-black bg-gray-200"></div>
                  <div className="aspect-square border-r border-b border-black bg-gray-200"></div>
                  <div className="aspect-square border-r border-b border-black bg-gray-200"></div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}