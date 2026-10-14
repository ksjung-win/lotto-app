'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Home, Search, Settings, Edit3, Check } from 'lucide-react';

export default function PatternPage() {
  // 10개의 패턴 이름을 관리하는 상태 (기본값 설정)
  const [patterns, setPatterns] = useState<string[]>(Array.from({ length: 10 }, (_, i) => `패턴 ${i + 1}`));
  
  // 현재 수정 중인 패턴의 인덱스 (null이면 수정 중 아님)
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  // 수정 중인 입력 칸의 임시 텍스트
  const [editValue, setEditValue] = useState('');

  // 💡 앱이 켜질 때(마운트) 저장된 패턴 이름들을 불러옵니다.
  useEffect(() => {
    const savedPatterns = localStorage.getItem('lottoPatterns');
    if (savedPatterns) {
      setPatterns(JSON.parse(savedPatterns));
    }
  }, []);

  // 연필 아이콘 클릭 시: 수정 모드 진입
  const handleEditClick = (index: number) => {
    setEditingIndex(index);
    setEditValue(patterns[index]);
  };

  // 체크 아이콘(또는 엔터키) 클릭 시: 수정 완료 및 저장
  const handleSaveClick = (index: number) => {
    const newPatterns = [...patterns];
    // 빈칸이면 원래 이름 유지, 아니면 새 이름 적용
    newPatterns[index] = editValue.trim() || `패턴 ${index + 1}`;
    
    setPatterns(newPatterns);
    setEditingIndex(null); // 수정 모드 종료
    
    // 💡 변경된 이름들을 브라우저 임시 저장소(localStorage)에 저장합니다.
    // 여기서 저장하면 상세 화면(PatternClient.tsx)에서 이 값을 읽어갑니다!
    localStorage.setItem('lottoPatterns', JSON.stringify(newPatterns));
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-black flex items-center justify-center sm:p-4 transition-colors duration-300">
      <div className="w-full max-w-[400px] h-screen sm:h-[850px] bg-white dark:bg-[#1a1a1a] relative flex flex-col shadow-2xl sm:rounded-[3rem] overflow-hidden border-[6px] border-white dark:border-zinc-800 transition-colors duration-300">
        
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-zinc-800/80 mt-4 sm:mt-0 z-10 bg-[#1a1a1a] shrink-0">
          <h1 className="text-2xl font-black text-amber-500 tracking-tight">
            로또 패턴 분석기
          </h1>
          <span className="text-[11px] font-bold text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded-md">
            이름 수정 가능
          </span>
        </div>

        {/* 10개 패턴 목록 영역 */}
        <div className="flex-1 p-5 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="grid grid-cols-2 gap-3 pb-6">
            
            {patterns.map((name, index) => (
              <div 
                key={index}
                className="relative bg-zinc-900/50 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition-colors shadow-sm flex flex-col items-center justify-center p-4 min-h-[100px] group"
              >
                {/* 1. 번호 (인덱스) */}
                <span className="text-zinc-500 font-bold text-sm mb-2">{index + 1}</span>

                {/* 2. 이름 표시 또는 수정 입력 칸 */}
                {editingIndex === index ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveClick(index)}
                    className="w-full text-center bg-zinc-800 text-zinc-200 text-sm font-bold p-1 rounded-md outline-none focus:ring-1 focus:ring-amber-500/50"
                    autoFocus
                  />
                ) : (
                  <Link href={`/pattern/${index}`} className="text-zinc-300 font-bold text-sm text-center px-2 hover:text-amber-500 transition-colors break-keep-all leading-snug">
                    {name}
                  </Link>
                )}

                {/* 3. 수정(연필) / 저장(체크) 버튼 */}
                <div className="absolute top-2 right-2">
                  {editingIndex === index ? (
                    <button 
                      onClick={() => handleSaveClick(index)}
                      className="p-1.5 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors shadow-md"
                    >
                      <Check size={14} />
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleEditClick(index)}
                      className="p-1.5 text-zinc-600 hover:text-zinc-300 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Edit3 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}

          </div>
        </div>

        {/* 하단 네비게이션 바 */}
        <div className="w-full bg-[#1a1a1a] border-t border-zinc-800/80 flex justify-around items-center pt-3 pb-5 sm:pb-6 z-40 shrink-0">
          <Link href="/" className="flex flex-col items-center text-zinc-500 w-16 gap-1.5 group">
            <div className="bg-black group-hover:text-amber-500 p-2 rounded-xl w-full flex justify-center transition-all">
              <Home size={20} />
            </div>
            <span className="text-[11px] font-bold">홈</span>
          </Link>
          <button className="flex flex-col items-center text-zinc-500 w-16 gap-1.5 group">
            <div className="bg-black group-hover:text-amber-500 p-2 rounded-xl w-full flex justify-center transition-all">
              <Search size={20} />
            </div>
            <span className="text-[11px] font-bold">검색</span>
          </button>
          <button className="flex flex-col items-center text-zinc-500 w-16 gap-1.5 group">
            <div className="bg-black group-hover:text-amber-500 p-2 rounded-xl w-full flex justify-center transition-all">
              <Settings size={20} />
            </div>
            <span className="text-[11px] font-bold">설정</span>
          </button>
        </div>

      </div>
    </div>
  );
}