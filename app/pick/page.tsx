'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Sparkles, Home, Search, Settings } from 'lucide-react';

// 공 색상 판별 함수
const getBallColorClass = (num: number, isSelected: boolean) => {
  if (!isSelected) return 'bg-zinc-800 text-zinc-400 border-zinc-700/50 hover:bg-zinc-750';
  
  if (num <= 10) return 'bg-[#fbc400] text-gray-900 shadow-[0_0_12px_rgba(251,196,0,0.4)] border-[#fbc400]';
  if (num <= 20) return 'bg-[#69c8f2] text-gray-900 shadow-[0_0_12px_rgba(105,200,242,0.4)] border-[#69c8f2]';
  if (num <= 30) return 'bg-[#ff7272] text-white shadow-[0_0_12px_rgba(255,114,114,0.4)] border-[#ff7272]';
  if (num <= 40) return 'bg-[#aaa] text-white shadow-[0_0_12px_rgba(170,170,170,0.4)] border-[#aaa]';
  return 'bg-[#b0d840] text-gray-900 shadow-[0_0_12px_rgba(176,216,64,0.4)] border-[#b0d840]';
};

// 상단 슬롯용 색상 함수
const getBallColorClassForSlot = (num: number) => {
  if (num <= 10) return 'bg-[#fbc400] text-gray-900 border-[#fbc400]';
  if (num <= 20) return 'bg-[#69c8f2] text-gray-900 border-[#69c8f2]';
  if (num <= 30) return 'bg-[#ff7272] text-white border-[#ff7272]';
  if (num <= 40) return 'bg-[#aaa] text-white border-[#aaa]';
  return 'bg-[#b0d840] text-gray-900 border-[#b0d840]';
};

export default function PickPage() {
  const router = useRouter();
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);

  // 번호 선택 토글 로직
  const toggleNumber = (num: number) => {
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(selectedNumbers.filter(n => n !== num));
    } else {
      if (selectedNumbers.length < 6) {
        setSelectedNumbers([...selectedNumbers, num].sort((a, b) => a - b));
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#111111] flex items-center justify-center sm:p-2 transition-colors duration-300">
      <div className="w-full max-w-[360px] h-screen sm:h-[720px] bg-[#1a1a1a] relative flex flex-col sm:rounded-[2.5rem] overflow-hidden border-0 sm:border-[4px] border-zinc-800 shadow-2xl">
        
        {/* 헤더 (패딩을 조여 세로 공간 확보) */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80 z-10 shrink-0">
          <div className="flex items-center">
            <button onClick={() => router.back()} className="p-1.5 mr-2 bg-zinc-800/50 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400">
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-[16px] font-black text-white">6/45 추첨 번호</h1>
          </div>
          <button onClick={() => setSelectedNumbers([])} className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1 bg-zinc-800/30 rounded-lg">
            <RefreshCw size={14} />
          </button>
        </div>

        {/* 메인 콘텐츠 (스크롤 완전 불가, 타이트한 여백 설정) */}
        <div className="flex-1 overflow-hidden px-4 py-3 flex flex-col gap-3 relative">
          
          {/* 섹션 1: 나의 마킹 확인 (상단 슬롯, 높이 슬림화) */}
          <div className="bg-[#222222] border border-zinc-800 rounded-xl p-3 shrink-0">
            <div className="flex justify-between items-end mb-2">
              <span className="text-xs font-bold text-zinc-400">나의 마킹 확인</span>
              <span className="text-xs font-black text-amber-500">
                {selectedNumbers.length} <span className="text-zinc-500">/ 6</span>
              </span>
            </div>
            
            <div className="flex justify-between gap-1">
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const num = selectedNumbers[index];
                return (
                  <div 
                    key={index}
                    className={`w-[36px] h-[36px] rounded-full flex items-center justify-center font-black text-[13px] border transition-all duration-300 shadow-inner
                      ${num ? getBallColorClassForSlot(num) : 'bg-[#1a1a1a] border-zinc-800 text-zinc-700'}
                    `}
                  >
                    {num ? num : ''}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 섹션 2: 1~45 OMR 마킹 보드 (간격과 패딩을 조여 45번까지 보장) */}
          <div className="flex-1 bg-[#222222] border border-zinc-800 rounded-2xl px-3 py-2 flex flex-col justify-center min-h-0">
            <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
              {[...Array(45)].map((_, i) => {
                const num = i + 1;
                const isSelected = selectedNumbers.includes(num);
                return (
                  <button
                    key={num}
                    onClick={() => toggleNumber(num)}
                    className={`relative w-full aspect-square rounded-full flex items-center justify-center font-bold text-[13px] sm:text-[14px] transition-all duration-150 border
                      ${getBallColorClass(num, isSelected)}
                      ${isSelected ? 'scale-105 z-10' : ''}
                    `}
                  >
                    {num}
                  </button>
                );
              })}
              {/* 빈칸 3개 */}
              <div className="w-full aspect-square pointer-events-none"></div>
              <div className="w-full aspect-square pointer-events-none"></div>
              <div className="w-full aspect-square pointer-events-none"></div>
            </div>
          </div>

        </div>

        {/* 💡 신규 배치: 6개 선택 시 바텀 탭바 바로 위에 절묘하게 나타나는 팝업 진단 버튼 */}
        {selectedNumbers.length === 6 && (
          <div className="absolute bottom-[56px] left-4 right-4 z-30 transition-all duration-300">
            <button className="w-full py-3 rounded-xl font-black text-[13px] sm:text-[14px] flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90 active:scale-95 shadow-[0_6px_20px_rgba(245,158,11,0.4)] border border-amber-400/20">
              <Sparkles size={16} />
              6/45 선택 조합 즉시 진단하기
            </button>
          </div>
        )}

        {/* 섹션 4: 하단 네비게이션 바 (높이를 최적화하여 OMR판을 압박하지 않음) */}
        <div className="flex justify-around items-center bg-[#111111] border-t border-zinc-800/80 py-2 shrink-0 z-20">
          <Link href="/" className="flex flex-col items-center gap-1 text-zinc-500 hover:text-white transition-colors">
            <Home size={18} />
            <span className="text-[10px] font-bold">홈</span>
          </Link>
          <button className="flex flex-col items-center gap-1 text-zinc-500 hover:text-white transition-colors">
            <Search size={18} />
            <span className="text-[10px] font-bold">검색</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-zinc-500 hover:text-white transition-colors">
            <Settings size={18} />
            <span className="text-[10px] font-bold">설정</span>
          </button>
        </div>

      </div>
    </div>
  );
}