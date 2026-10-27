'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Home, Download, Ticket, Search } from 'lucide-react';
import InputTab from './InputTab';
import TicketListTab from './TicketListTab';
import PatternTab from './PatternTab';

type TabKey = 'input' | 'list' | 'pattern';

const TABS: { key: TabKey; label: string; icon: typeof Home }[] = [
  { key: 'input', label: '입력', icon: Download },
  { key: 'list', label: '내 복권', icon: Ticket },
  { key: 'pattern', label: '패턴 분석', icon: Search },
];

export default function TicketScanPage() {
  const [tab, setTab] = useState<TabKey>('input');
  const [isMounted, setIsMounted] = useState(false);

  // 휴대폰에 저장된 복권 데이터를 불러온 뒤에 화면을 그림
  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-black flex items-center justify-center sm:p-4 transition-colors duration-300">
      <div className="w-full max-w-[400px] sm:aspect-[9/16] bg-white dark:bg-zinc-900 relative flex flex-col shadow-2xl sm:rounded-[3rem] overflow-hidden h-screen sm:h-auto border-[6px] border-white dark:border-zinc-800 transition-colors duration-300">

        {/* 상단 헤더 */}
        <header className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
          <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 transition-colors">
            <Home size={20} />
          </Link>
          <h1 className="text-[16px] font-black bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent tracking-tight">
            복권 패턴 분석
          </h1>
          <div className="w-9" />
        </header>

        {/* 💡 탭 3개 */}
        <div className="px-4 pb-3 shrink-0">
          <div className="grid grid-cols-3 bg-gray-100 dark:bg-zinc-800 rounded-xl p-1">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-bold transition-colors ${
                  tab === key ? 'bg-white dark:bg-zinc-900 text-amber-500 shadow-sm' : 'text-gray-500 dark:text-zinc-400'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 💡 탭 내용 (스크롤) */}
        <div className="flex-1 overflow-y-auto px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {isMounted && tab === 'input' && <InputTab onGoToList={() => setTab('list')} />}
          {isMounted && tab === 'list' && <TicketListTab onGoToInput={() => setTab('input')} />}
          {isMounted && tab === 'pattern' && <PatternTab onGoToInput={() => setTab('input')} />}
        </div>
      </div>
    </div>
  );
}