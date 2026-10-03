'use client';

import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-black flex items-center justify-center sm:p-4 transition-colors duration-300">
      
      {/* 안쪽 스마트폰 프레임: 다크모드 시 고급스러운 다크 그레이(zinc-900) 배경 적용 */}
      <div className="w-full max-w-[400px] sm:aspect-[9/16] bg-white dark:bg-zinc-900 relative flex flex-col items-center justify-center shadow-2xl sm:rounded-[3rem] overflow-hidden h-screen sm:h-auto border-[6px] border-white dark:border-zinc-800 p-6 transition-colors duration-300">
        
        {/* 1. 고급스러운 심볼 및 골드 타이틀 */}
        <div className="flex flex-col items-center justify-center gap-5 mb-14 mt-4">
          {/* 프리미엄 로또 볼(행운의 7) 아이콘 */}
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-400 to-orange-600 shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center justify-center">
            <span className="text-white text-2xl font-black drop-shadow-md">7</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent tracking-tight text-center leading-snug break-keep px-2">
            로또 1등 당첨 번호 추출 플랫폼
          </h1>
        </div>

        {/* 2. '검색' 영역 - 다크 톤 배경과 골드 텍스트의 조화 */}
        <div className="flex items-center gap-2 w-full max-w-[320px] mb-10 px-2">
          <button className="bg-zinc-900 dark:bg-black text-amber-400 border border-amber-500/40 font-bold py-2.5 px-4 rounded-full text-sm hover:bg-amber-500 hover:text-white transition-all duration-300 shrink-0 whitespace-nowrap active:scale-95 shadow-sm">
            지난 1등 보기
          </button>
          <input 
            type="text" 
            placeholder="회차" 
            className="min-w-0 flex-1 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white rounded-full px-3 py-2.5 text-center text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all duration-300 shadow-inner"
          />
          <button className="bg-zinc-900 dark:bg-black text-amber-400 border border-amber-500/40 font-bold py-2.5 px-5 rounded-full text-sm hover:bg-amber-500 hover:text-white transition-all duration-300 shrink-0 whitespace-nowrap active:scale-95 shadow-sm">
            검색
          </button>
        </div>

        {/* 구분선: 부드러운 은회색으로 변경 */}
        <div className="w-full max-w-[280px] border-t border-zinc-200 dark:border-zinc-700/80 mb-10 transition-colors duration-300"></div>

        {/* 3. 당첨 패턴 분석 영역 */}
        <div className="flex flex-col items-center gap-4 w-full max-w-[320px] mb-16 px-2">
          <button className="bg-zinc-900 dark:bg-black text-amber-400 border border-amber-500/40 font-bold py-2.5 px-8 rounded-full text-sm hover:bg-amber-500 hover:text-white transition-all duration-300 shrink-0 active:scale-95 shadow-sm">
            당첨 패턴 분석
          </button>
          <div className="flex items-center gap-2 w-full mt-2">
            <input 
              type="text" 
              placeholder="시작" 
              className="min-w-0 flex-1 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white rounded-full px-3 py-2.5 text-center text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all duration-300 shadow-inner"
            />
            <span className="text-zinc-400 dark:text-zinc-500 font-medium shrink-0 transition-colors duration-300">~</span>
            <input 
              type="text" 
              placeholder="종료" 
              className="min-w-0 flex-1 border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white rounded-full px-3 py-2.5 text-center text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all duration-300 shadow-inner"
            />
          </div>
          {/* 하이라이트 액션 버튼: 가득 찬 황금빛 그라데이션 */}
          <button className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-3 px-10 rounded-full text-sm hover:opacity-90 transition-all duration-300 shrink-0 active:scale-95 shadow-lg shadow-amber-500/25 mt-3">
            분석
          </button>
        </div>

        {/* 4. 하단 링크 명칭 변경 (차분하고 세련된 톤으로 밸런스 조정) */}
        <Link 
          href="/input" 
          className="text-zinc-500 dark:text-zinc-400 font-medium text-[15px] hover:text-amber-500 dark:hover:text-amber-400 hover:underline underline-offset-4 mt-2 tracking-tight transition-colors duration-300"
        >
          당첨 번호 입력 스튜디오 →
        </Link>
      </div>
    </div>
  );
}