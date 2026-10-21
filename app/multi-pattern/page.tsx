"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Home, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLottoStore } from '../store/useLottoStore';

export default function MultiPatternPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const totalItems = 200;
  const itemsPerPage = 6;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const { boards } = useLottoStore();

  const [isMounted, setIsMounted] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSearchSubmit = () => {
    const targetNum = parseInt(searchInput, 10);
    
    if (isNaN(targetNum) || targetNum < 1 || targetNum > totalItems) {
      setSearchError(`1부터 ${totalItems} 사이의 숫자만 입력 가능합니다.`);
      return;
    }
    
    const targetPage = Math.ceil(targetNum / itemsPerPage);
    setCurrentPage(targetPage);
    setIsSearchModalOpen(false);
    setSearchInput('');
    setSearchError('');
  };

  const renderGrid = (index: number) => {
    const patternNumber = (currentPage - 1) * itemsPerPage + index + 1;
    const targetBoard = boards[patternNumber - 1] || [];

    return (
      <div key={index} className="flex flex-col bg-zinc-800/40 p-2.5 rounded-xl border border-zinc-700/50 h-full justify-between">
        <div className="text-[12px] font-bold text-zinc-300 mb-2 pl-1">
          #{patternNumber} 패턴
        </div>
        <div className="grid grid-cols-6 gap-1 w-full flex-1">
          {Array.from({ length: 30 }).map((_, i) => {
            // 💡 초강력 방어: 데이터가 비어있을 수 있는 모든 경우의 수를 완벽 차단
            const cell = targetBoard[i] || { number: null, color: null };
            const cellColor = cell.color;
            const cellNumber = cell.number;
            
            const isDarkBg = cellColor === 'bg-[#5D4037]' || cellColor === 'bg-[#1E3A8A]';
            const textColorClass = cellColor ? (isDarkBg ? 'text-white' : 'text-gray-900') : 'text-gray-900 dark:text-white';

            // 💡 강제 출력: 숫자가 존재하기만 하면 무조건 문자로 렌더링
            const displayText = (cellNumber !== null && cellNumber !== undefined) ? String(cellNumber) : '';

            return (
              <div 
                key={i} 
                className={`w-full h-full min-h-[16px] rounded-[3px] flex items-center justify-center text-[10px] font-bold transition-colors ${cellColor ? cellColor : 'bg-zinc-700/30'} ${textColorClass}`}
              >
                {displayText}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-black flex items-center justify-center sm:p-4 transition-colors duration-300">
      <div className="w-full max-w-[400px] sm:aspect-[9/16] bg-white dark:bg-zinc-900 relative flex flex-col shadow-2xl sm:rounded-[3rem] overflow-hidden h-screen sm:h-auto border-[6px] border-white dark:border-zinc-800">
        
        <header className="flex items-center justify-between p-4 border-b border-zinc-800/50 shrink-0 bg-zinc-900 z-10">
          <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-zinc-800 text-zinc-400 transition-colors">
            <Home size={20} />
          </Link>
          {/* 💡 함정 수사: 이 글자가 휴대폰에 뜨면 업데이트가 정상적으로 된 것입니다 */}
          <h1 className="text-[15px] font-black text-amber-500">당첨 패턴 모아보기 (동기화)</h1>
          <button 
            onClick={() => setIsSearchModalOpen(true)} 
            className="p-2 -mr-2 rounded-full hover:bg-zinc-800 text-zinc-400 transition-colors"
          >
            <Search size={18} />
          </button>
        </header>

        <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/90 border-b border-zinc-800/50 shrink-0 z-10">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-[13px] font-medium transition-colors disabled:opacity-30 disabled:hover:bg-zinc-800"
            disabled={currentPage === 1}
          >
            <ChevronLeft size={16} /> 이전
          </button>
          <div className="text-[13px] font-bold text-amber-500">
            {(currentPage - 1) * itemsPerPage + 1} ~ {Math.min(currentPage * itemsPerPage, totalItems)} <span className="text-zinc-500 font-normal">/ 200</span>
          </div>
          <button 
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-[13px] font-medium transition-colors disabled:opacity-30 disabled:hover:bg-zinc-800"
            disabled={currentPage === totalPages}
          >
            다음 <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex-1 p-3 bg-zinc-950 overflow-hidden">
          <div className="grid grid-cols-2 grid-rows-3 gap-3 h-full">
            {Array.from({ length: 6 }).map((_, index) => renderGrid(index))}
          </div>
        </div>

        {isSearchModalOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
            <div className="w-full max-w-[300px] bg-zinc-900 border border-zinc-700 rounded-2xl p-5 shadow-2xl">
              <h3 className="text-white font-bold mb-2">패턴 번호 검색</h3>
              <p className="text-zinc-400 text-[12px] mb-4">조회하실 패턴 번호(1~200)를 입력하세요.</p>
              
              <input 
                type="number" 
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setSearchError(''); 
                }}
                className="w-full bg-zinc-800 border border-zinc-600 text-white rounded-lg px-3 py-2.5 focus:outline-none focus:border-amber-500 mb-2 transition-colors"
                placeholder="예: 10"
                autoFocus
              />
              
              {searchError && (
                <p className="text-red-400 text-[12px] mb-2">{searchError}</p>
              )}

              <div className="flex gap-2 mt-5">
                <button 
                  onClick={() => {
                    setIsSearchModalOpen(false);
                    setSearchInput('');
                    setSearchError('');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-[14px] font-medium hover:bg-zinc-700 transition-colors"
                >
                  취소
                </button>
                <button 
                  onClick={handleSearchSubmit}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-[14px] font-bold hover:bg-amber-600 transition-colors"
                >
                  이동
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}