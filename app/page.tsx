import Link from 'next/link';
// 💡 변경됨: 회차별 분석(ClipboardList), 준비 중 칸(Lock) 아이콘 추가
import { PenTool, History, LineChart, CheckCircle, LayoutGrid, ClipboardList, ScanLine, Lock } from 'lucide-react';

// 💡 홈 메뉴 목록: 새 메뉴를 추가할 때는 이 목록에 한 줄만 추가하면 됩니다. (최대 10칸)
const MENUS = [
  { href: '/input', icon: PenTool, title: '번호 입력 스튜디오', desc: '예상 번호 색칠 및 관리' },
  { href: '/history', icon: History, title: '역대 당첨 번호 조회', desc: '회차별 당첨 번호 확인' },
  { href: '/pattern', icon: LineChart, title: '로또 패턴 분석', desc: '나만의 당첨 패턴 찾기' },
  { href: '/pick', icon: CheckCircle, title: '6/45 추첨 번호', desc: '번호 마킹 및 조합 진단' },
  { href: '/multi-pattern', icon: LayoutGrid, title: '당첨 패턴 모아보기', desc: '번호 흐름 한눈에 비교' },
  { href: '/round-analysis', icon: ClipboardList, title: '회차 별 로또 번호 분석', desc: '저장한 표를 회차별로 관리' },
  { href: '/ticket-scan', icon: ScanLine, title: '복권 패턴 분석', desc: '복권 사진 등록 · 끝수 구역 분석' },
];

const TOTAL_SLOTS = 10; // 2열 × 5줄

export default function HomePage() {
  const emptySlots = Math.max(0, TOTAL_SLOTS - MENUS.length);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-black flex items-center justify-center sm:p-4 transition-colors duration-300">
      <div className="w-full max-w-[400px] sm:aspect-[9/16] bg-white dark:bg-zinc-900 relative flex flex-col shadow-2xl sm:rounded-[3rem] overflow-y-auto h-screen sm:h-auto border-[6px] border-white dark:border-zinc-800 transition-colors duration-300 px-4 py-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* 💡 화면이 넉넉하면 가운데 정렬, 작은 휴대폰에서는 스크롤 */}
        <div className="my-auto w-full flex flex-col items-center gap-6">

          {/* 타이틀 영역 (10칸이 들어가도록 크기 축소) */}
          <div className="text-center flex flex-col items-center gap-2 shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30">
              <span className="text-2xl font-black text-white">L</span>
            </div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
              Premium <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">Lotto</span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">
              최고의 분석을 위한 완벽한 도구
            </p>
          </div>

          {/* 💡 메인 메뉴: 2열 × 5줄 = 10칸 */}
          <div className="w-full grid grid-cols-2 gap-2.5">
            {MENUS.map((menu) => {
              const Icon = menu.icon;
              return (
                <Link
                  key={menu.href}
                  href={menu.href}
                  className="group flex flex-col items-start gap-2 p-3 min-h-[88px] bg-gray-50 dark:bg-zinc-800/80 rounded-2xl border border-gray-200 dark:border-zinc-700/50 hover:border-amber-500/50 dark:hover:border-amber-500/50 transition-all duration-300 active:scale-95 shadow-sm"
                >
                  <div className="p-2 bg-white dark:bg-zinc-900 rounded-xl shadow-sm text-gray-600 dark:text-zinc-400 group-hover:text-amber-500 transition-colors">
                    <Icon size={18} />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-gray-900 dark:text-zinc-100 text-[13px] leading-tight break-keep">
                      {menu.title}
                    </span>
                    <span className="text-[10.5px] text-gray-500 dark:text-zinc-400 mt-1 leading-tight break-keep">
                      {menu.desc}
                    </span>
                  </div>
                </Link>
              );
            })}

            {/* 💡 아직 기능이 없는 칸: '준비 중' 표시 */}
            {Array.from({ length: emptySlots }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex flex-col items-start gap-2 p-3 min-h-[88px] bg-gray-50/50 dark:bg-zinc-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-zinc-700/50 opacity-60"
              >
                <div className="p-2 bg-white/60 dark:bg-zinc-900/60 rounded-xl text-gray-300 dark:text-zinc-600">
                  <Lock size={18} />
                </div>
                <span className="font-bold text-gray-400 dark:text-zinc-500 text-[13px] leading-tight">
                  준비 중
                </span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}