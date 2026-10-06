'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Home, Search, Settings, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

// 공식 로또 색상 반환 함수
const getBallColor = (num: number) => {
  if (num <= 10) return 'bg-[#fbc400] text-gray-900 shadow-yellow-500/30'; // 노랑
  if (num <= 20) return 'bg-[#69c8f2] text-gray-900 shadow-blue-500/30';   // 파랑
  if (num <= 30) return 'bg-[#ff7272] text-white shadow-red-500/30';      // 빨강
  if (num <= 40) return 'bg-[#aaa] text-white shadow-gray-500/30';         // 회색
  return 'bg-[#b0d840] text-gray-900 shadow-green-500/30';                 // 초록
};

export default function HistoryPage() {
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // 📁 public/data/lotto-history.json 파일에서 실제 데이터 불러오기
  useEffect(() => {
    fetch('/data/lotto-history.json')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setHistoryList(data);
        }
      })
      .catch((err) => console.error('데이터를 불러오지 못했습니다:', err));
  }, []);

  const currentDraw = historyList.length > 0 ? historyList[currentIndex] : null;

  // 이전 회차 보기 (더 과거로 이동)
  const handlePrev = () => {
    if (currentIndex < historyList.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // 다음 회차 보기 (더 최신으로 이동)
  const handleNext = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // 회차 검색 및 이동 핸들러
  const handleSearch = () => {
    const targetNo = parseInt(searchQuery, 10);
    const foundIndex = historyList.findIndex((item) => item.drawNo === targetNo);
    if (foundIndex !== -1) {
      setCurrentIndex(foundIndex);
      setSearchQuery('');
    } else {
      alert('해당 회차 데이터가 존재하지 않습니다. (1~1140)');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-black flex items-center justify-center sm:p-4 transition-colors duration-300">
      <div className="w-full max-w-[400px] sm:aspect-[9/16] bg-white dark:bg-zinc-900 relative flex flex-col shadow-2xl sm:rounded-[3rem] overflow-hidden h-screen sm:h-auto border-[6px] border-white dark:border-zinc-800 transition-colors duration-300">
        
        {/* 상단 하이라이트 영역 */}
        <div className="pt-8 pb-6 px-4 flex flex-col items-center shrink-0">
          <h1 className="text-3xl font-black bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent tracking-tight mb-1">
            제 {currentDraw ? currentDraw.drawNo : '---'}회 당첨 번호
          </h1>
          <p className="text-sm font-medium text-gray-400">
            추첨일: {currentDraw ? currentDraw.date : '불러오는 중...'}
          </p>
        </div>

        {/* 메인 당첨 번호 볼 영역 */}
        <div className="w-full px-4 mb-6 shrink-0 flex items-center justify-center gap-1.5 sm:gap-2">
          {currentDraw ? (
            <>
              {currentDraw.numbers.map((num: number, idx: number) => (
                <div 
                  key={idx} 
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-bold text-lg sm:text-xl shadow-lg border border-white/20 ${getBallColor(num)}`}
                >
                  {num}
                </div>
              ))}
              <div className="flex flex-col items-center justify-center px-1">
                <Plus size={16} className="text-gray-400" />
              </div>
              <div 
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-bold text-lg sm:text-xl shadow-lg border border-white/20 ${getBallColor(currentDraw.bonus)}`}
              >
                {currentDraw.bonus}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400">데이터를 로드하는 중입니다...</p>
          )}
        </div>

        {/* 당첨금 상세 정보 카드 */}
        <div className="w-full px-5 mb-6 shrink-0">
          <div className="bg-gray-50 dark:bg-zinc-800/80 rounded-2xl p-4 border border-gray-200 dark:border-zinc-700/50 shadow-sm flex flex-col items-center justify-center gap-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <p className="text-sm text-gray-500 dark:text-zinc-400 font-medium">
              1등 당첨 정보 (총 {currentDraw ? currentDraw.winners : 0}명)
            </p>
            <p className="text-2xl font-black text-gray-900 dark:text-zinc-100 tracking-tight">
              {currentDraw ? currentDraw.prizePerWinner : '0'} <span className="text-base font-bold text-amber-500">원</span>
            </p>
          </div>
        </div>

        {/* 회차 검색 및 이동 컨트롤러 */}
        <div className="w-full px-5 mb-4 shrink-0 flex items-center justify-between gap-2">
          <button 
            type="button" 
            onClick={handlePrev}
            className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors shrink-0"
          >
            <ChevronLeft size={24} />
          </button>
          
          <div className="flex-1 relative flex items-center gap-2">
            <div className="relative flex-1">
              <input 
                type="number" 
                placeholder="회차 입력..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                className="w-full h-12 bg-gray-100 dark:bg-zinc-800 border-none rounded-2xl px-3 pl-9 text-center font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/50 transition-all placeholder:font-normal placeholder:text-gray-400 text-sm"
              />
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            <button 
              type="button"
              onClick={handleSearch}
              className="px-3.5 h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-2xl transition-all shadow-md shrink-0 text-xs"
            >
              이동
            </button>
          </div>

          <button 
            type="button" 
            onClick={handleNext}
            className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors shrink-0"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* 하단 요약 리스트 (스크롤) */}
        <div className="flex-1 overflow-y-auto px-5 pb-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <h3 className="text-xs font-bold text-gray-400 dark:text-zinc-500 mb-3 ml-1 uppercase tracking-wider">이전 회차 요약</h3>
          <div className="flex flex-col gap-2">
            {historyList.map((history, idx) => (
              <div 
                key={history.drawNo} 
                onClick={() => setCurrentIndex(idx)}
                className={`w-full bg-white dark:bg-zinc-900 border rounded-xl p-3 flex items-center justify-between shadow-sm cursor-pointer transition-all ${
                  currentIndex === idx 
                    ? 'border-amber-500 bg-amber-500/5' 
                    : 'border-gray-100 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700'
                }`}
              >
                <span className="font-bold text-gray-700 dark:text-zinc-300 text-sm">{history.drawNo}회</span>
                <div className="flex items-center gap-1">
                  {history.numbers.map((num: number, i: number) => (
                    <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${getBallColor(num)}`}>
                      {num}
                    </div>
                  ))}
                  <span className="text-gray-300 dark:text-zinc-600 text-xs mx-0.5">+</span>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${getBallColor(history.bonus)}`}>
                    {history.bonus}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 하단 네비게이션 */}
        <div className="w-full bg-white dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800 flex justify-around items-center pt-3 pb-5 sm:pb-6 z-40 shrink-0 shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.3)] transition-colors duration-300">
          <Link href="/" className="flex flex-col items-center text-gray-500 dark:text-zinc-400 w-16 gap-1.5 group">
            <div className="bg-gray-100 dark:bg-black group-hover:text-amber-500 p-2 rounded-xl w-full flex justify-center shadow-sm transition-all duration-300 group-active:scale-95">
              <Home size={20} />
            </div>
            <span className="text-[11px] font-bold leading-none group-hover:text-amber-500 transition-colors">홈</span>
          </Link>
          
          <button className="flex flex-col items-center text-amber-500 w-16 gap-1.5 group">
            <div className="bg-amber-50 dark:bg-amber-500/10 p-2 rounded-xl w-full flex justify-center shadow-sm transition-all duration-300">
              <Search size={20} />
            </div>
            <span className="text-[11px] font-bold leading-none">조회</span>
          </button>

          <button onClick={() => alert('향후 추가될 기능입니다.')} className="flex flex-col items-center text-gray-500 dark:text-zinc-400 w-16 gap-1.5 group">
            <div className="bg-gray-100 dark:bg-black group-hover:text-amber-500 p-2 rounded-xl w-full flex justify-center shadow-sm transition-all duration-300 group-active:scale-95">
              <Settings size={20} />
            </div>
            <span className="text-[11px] font-bold leading-none group-hover:text-amber-500 transition-colors">설정</span>
          </button>
        </div>

      </div>
    </div>
  );
}