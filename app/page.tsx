import Link from 'next/link';
import { PenTool, History } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-black flex items-center justify-center sm:p-4 transition-colors duration-300">
      <div className="w-full max-w-[400px] sm:aspect-[9/16] bg-white dark:bg-zinc-900 relative flex flex-col items-center justify-center shadow-2xl sm:rounded-[3rem] overflow-hidden h-screen sm:h-auto border-[6px] border-white dark:border-zinc-800 transition-colors duration-300 p-6 gap-12">
        
        {/* 타이틀 영역 */}
        <div className="text-center flex flex-col items-center gap-3">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30 mb-2">
            <span className="text-3xl font-black text-white">L</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            Premium <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">Lotto</span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 font-medium">
            최고의 분석을 위한 완벽한 도구
          </p>
        </div>

        {/* 메인 메뉴 버튼 영역 */}
        <div className="w-full flex flex-col gap-4 px-2">
          
          {/* 1. 당첨 번호 입력 스튜디오로 이동 */}
          <Link 
            href="/input" 
            className="group relative w-full flex items-center p-4 bg-gray-50 dark:bg-zinc-800/80 rounded-2xl border border-gray-200 dark:border-zinc-700/50 hover:border-amber-500/50 dark:hover:border-amber-500/50 transition-all duration-300 active:scale-95 shadow-sm"
          >
            <div className="flex items-center gap-4 w-full">
              <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl shadow-sm text-gray-600 dark:text-zinc-400 group-hover:text-amber-500 transition-colors">
                <PenTool size={22} />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-bold text-gray-900 dark:text-zinc-100 text-[15px]">
                  번호 입력 스튜디오
                </span>
                <span className="text-[12px] text-gray-500 dark:text-zinc-400 mt-0.5">
                  나만의 예상 번호 색칠 및 관리
                </span>
              </div>
            </div>
          </Link>

          {/* 2. (신규) 역대 당첨 번호 조회 라운지로 이동 */}
          <Link 
            href="/history" 
            className="group relative w-full flex items-center p-4 bg-gray-50 dark:bg-zinc-800/80 rounded-2xl border border-gray-200 dark:border-zinc-700/50 hover:border-amber-500/50 dark:hover:border-amber-500/50 transition-all duration-300 active:scale-95 shadow-sm"
          >
            <div className="flex items-center gap-4 w-full">
              <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl shadow-sm text-gray-600 dark:text-zinc-400 group-hover:text-amber-500 transition-colors">
                <History size={22} />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-bold text-gray-900 dark:text-zinc-100 text-[15px]">
                  역대 당첨 번호 조회
                </span>
                <span className="text-[12px] text-gray-500 dark:text-zinc-400 mt-0.5">
                  회차별 당첨금 및 통계 확인
                </span>
              </div>
            </div>
          </Link>

        </div>

      </div>
    </div>
  );
}