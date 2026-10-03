'use client';

import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-200 flex items-center justify-center sm:p-4">
      <div className="w-full max-w-[400px] sm:aspect-[9/16] bg-white relative flex flex-col items-center justify-center shadow-2xl sm:rounded-[2.5rem] overflow-hidden h-screen sm:h-auto border-[6px] border-white p-6">
        
        {/* 1. 명칭 변경 및 타이틀 디자인 최적화 */}
        <div className="flex flex-col items-center justify-center gap-4 mb-14 mt-4">
          <div className="grid grid-cols-2 gap-0.5">
            <div className="w-4 h-4 bg-[#FFB800] rounded-tl-sm"></div>
            <div className="w-4 h-4 bg-[#0055FF] rounded-tr-sm"></div>
            <div className="w-4 h-4 bg-[#FF3B30] rounded-bl-sm"></div>
            <div className="w-4 h-4 bg-[#34C759] rounded-br-sm"></div>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0055FF] tracking-tight text-center leading-snug break-keep px-2">
            로또 1등 당첨 번호 추출 플랫폼
          </h1>
        </div>

        {/* 2. '검색' 버튼 밀림 현상 해결 (shrink-0, flex-1 적용) */}
        <div className="flex items-center gap-2 w-full max-w-[320px] mb-10 px-2">
          <button className="bg-[#3B82F6] text-white font-bold py-2 px-3 rounded text-sm hover:bg-blue-600 transition-colors shrink-0 whitespace-nowrap">
            지난 1등 보기
          </button>
          <input 
            type="text" 
            placeholder="회차" 
            className="min-w-0 flex-1 border border-gray-300 rounded px-2 py-2 text-center text-sm outline-none focus:border-[#3B82F6]"
          />
          <button className="bg-[#3B82F6] text-white font-bold py-2 px-4 rounded text-sm hover:bg-blue-600 transition-colors shrink-0 whitespace-nowrap">
            검색
          </button>
        </div>

        {/* 구분선 */}
        <div className="w-full max-w-[280px] border-t border-gray-300 mb-10"></div>

        {/* 당첨 패턴 분석 영역 레이아웃 최적화 */}
        <div className="flex flex-col items-center gap-4 w-full max-w-[320px] mb-16 px-2">
          <button className="bg-[#3B82F6] text-white font-bold py-2 px-6 rounded text-sm hover:bg-blue-600 transition-colors shrink-0">
            당첨 패턴 분석
          </button>
          <div className="flex items-center gap-2 w-full">
            <input 
              type="text" 
              placeholder="시작" 
              className="min-w-0 flex-1 border border-gray-300 rounded px-2 py-2 text-center text-sm outline-none focus:border-[#3B82F6]"
            />
            <span className="text-gray-500 font-bold shrink-0">~</span>
            <input 
              type="text" 
              placeholder="종료" 
              className="min-w-0 flex-1 border border-gray-300 rounded px-2 py-2 text-center text-sm outline-none focus:border-[#3B82F6]"
            />
          </div>
          <button className="bg-[#3B82F6] text-white font-bold py-2 px-8 rounded text-sm hover:bg-blue-600 transition-colors shrink-0">
            분석
          </button>
        </div>

        {/* 3. 하단 링크 명칭 변경 */}
        <Link 
          href="/input" 
          className="text-[#0055FF] font-bold text-[15px] hover:underline mt-2 tracking-tight"
        >
          당첨 번호 입력 스튜디오 →
        </Link>
      </div>
    </div>
  );
}