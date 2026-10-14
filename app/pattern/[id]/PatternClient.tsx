'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Trophy, Flame, CalendarDays, Magnet } from 'lucide-react';

const getBallColor = (num: number, isZero: boolean = false) => {
  if (isZero) return 'bg-zinc-800/50 text-zinc-600 border-zinc-700/50 shadow-none';
  if (num <= 10) return 'bg-[#fbc400] text-gray-900 shadow-yellow-500/30';
  if (num <= 20) return 'bg-[#69c8f2] text-gray-900 shadow-blue-500/30';
  if (num <= 30) return 'bg-[#ff7272] text-white shadow-red-500/30';
  if (num <= 40) return 'bg-[#aaa] text-white shadow-gray-500/30';
  return 'bg-[#b0d840] text-gray-900 shadow-green-500/30';
};

interface Stat {
  number: number;
  count: number;
  rank: number;
}

interface HeatmapData {
  number: number;
  months: number[];
}

export default function PatternClient({ patternIndex }: { patternIndex: number }) {
  const router = useRouter();
  const [patternName, setPatternName] = useState(`패턴 ${patternIndex + 1}`);
  
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<Stat[]>([]);
  const [totalDraws, setTotalDraws] = useState(0);
  
  // 3번 방: 월별 히트맵 상태
  const [heatmapStats, setHeatmapStats] = useState<HeatmapData[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(10); 

  // 💡 4번 방: 짝꿍 분석기 전용 상태
  const [targetNumber, setTargetNumber] = useState<number>(1); // 사용자가 선택한 기준 번호
  const [companionStats, setCompanionStats] = useState<Stat[]>([]); // 짝꿍 통계 결과
  const [targetCount, setTargetCount] = useState(0); // 기준 번호의 총 출현 횟수

  useEffect(() => {
    const savedPatterns = localStorage.getItem('lottoPatterns');
    if (savedPatterns) {
      const parsed = JSON.parse(savedPatterns);
      if (parsed[patternIndex]) {
        setPatternName(parsed[patternIndex]);
      }
    }
  }, [patternIndex]);

  // 💡 0, 1, 2, 3번 방 모두 권한 부여
  const isStatRoom = patternIndex >= 0 && patternIndex <= 3;

  useEffect(() => {
    if (!isStatRoom) {
      setIsLoading(false);
      return;
    }

    const fetchAndCalculate = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('https://smok95.github.io/lotto/results/all.json');
        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          
          if (patternIndex === 0 || patternIndex === 1) {
            // [1번, 2번 방 로직]
            let targetData = data;
            if (patternIndex === 1) {
              targetData = data.filter(draw => draw.date && draw.date.startsWith('2026'));
            }
            setTotalDraws(targetData.length);
            const counts = Array(46).fill(0);
            targetData.forEach((draw: any) => {
              draw.numbers.forEach((num: number) => counts[num]++);
              counts[draw.bonus_no]++;
            });
            const rankArray = [];
            for (let i = 1; i <= 45; i++) rankArray.push({ number: i, count: counts[i] });
            rankArray.sort((a, b) => b.count - a.count || a.number - b.number);
            const finalStats: Stat[] = [];
            for (let i = 1; i <= 45; i++) {
              const rank = rankArray.findIndex(item => item.number === i) + 1;
              finalStats.push({ number: i, count: counts[i], rank: rank });
            }
            setStats(finalStats);

          } else if (patternIndex === 2) {
            // [3번 방 로직]
            const targetData = data.filter(draw => draw.date && draw.date.startsWith('2026'));
            setTotalDraws(targetData.length);
            const hData: HeatmapData[] = Array.from({ length: 45 }, (_, i) => ({ number: i + 1, months: Array(12).fill(0) }));
            targetData.forEach((draw: any) => {
              if (draw.date) {
                const monthStr = draw.date.split('-')[1]; 
                if (monthStr) {
                  const monthIndex = parseInt(monthStr, 10) - 1;
                  draw.numbers.forEach((num: number) => { hData[num - 1].months[monthIndex]++; });
                  hData[draw.bonus_no - 1].months[monthIndex]++;
                }
              }
            });
            setHeatmapStats(hData);

          } else if (patternIndex === 3) {
            // 💡 [4번 방 로직: 짝꿍 동반 출현 매트릭스]
            setTotalDraws(data.length); // 역대 전체 데이터 기준
            
            let appearances = 0; // 기준 번호가 나온 횟수
            const counts = Array(46).fill(0); // 다른 번호들이 같이 나온 횟수를 담을 바구니
            
            data.forEach((draw: any) => {
              const allNums = [...draw.numbers, draw.bonus_no];
              
              // 만약 이번 회차 당첨 번호에 '기준 번호'가 포함되어 있다면!
              if (allNums.includes(targetNumber)) {
                appearances++;
                // 같이 뽑힌 나머지 번호들의 카운트를 1씩 올림
                allNums.forEach(n => {
                  if (n !== targetNumber) counts[n]++;
                });
              }
            });
            
            setTargetCount(appearances); // 기준 번호 역대 출현 횟수 저장
            
            // 짝꿍 번호 순위 매기기
            const rankArray = [];
            for (let i = 1; i <= 45; i++) {
              if (i !== targetNumber) {
                rankArray.push({ number: i, count: counts[i] });
              }
            }
            
            // 많이 같이 나온 순서대로 정렬 (동률일 경우 번호가 빠른 순)
            rankArray.sort((a, b) => b.count - a.count || a.number - b.number);
            
            const finalStats: Stat[] = [];
            for (let i = 0; i < rankArray.length; i++) {
              finalStats.push({ ...rankArray[i], rank: i + 1 });
            }
            
            setCompanionStats(finalStats);
          }
        }
      } catch (error) {
        console.error('데이터 분석 중 오류 발생:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndCalculate();
  }, [patternIndex, isStatRoom, targetNumber]); // 💡 targetNumber 변경 시 즉시 재계산

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-zinc-800/20 border-zinc-800/50';
    if (count === 1) return 'bg-yellow-500/20 border-yellow-500/40 text-yellow-500';
    if (count === 2) return 'bg-orange-500/30 border-orange-500/50 text-orange-400 font-bold';
    return 'bg-red-500/40 border-red-500/60 text-red-400 font-black shadow-[inset_0_0_10px_rgba(239,68,68,0.3)]';
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-black flex items-center justify-center sm:p-4 transition-colors duration-300">
      <div className="w-full max-w-[400px] h-screen sm:h-[850px] bg-white dark:bg-[#1a1a1a] relative flex flex-col shadow-2xl sm:rounded-[3rem] overflow-hidden border-[6px] border-white dark:border-zinc-800 transition-colors duration-300">
        
        <div className="flex items-center p-4 border-b border-gray-200 dark:border-zinc-800/80 mt-4 sm:mt-0 z-10 bg-[#1a1a1a] shrink-0">
          <button 
            onClick={() => router.back()} 
            className="p-2 mr-3 bg-zinc-800/50 hover:bg-zinc-700 rounded-xl transition-colors text-zinc-400 hover:text-amber-500"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black text-amber-500 break-keep-all leading-tight">
              {patternName}
            </h1>
            <p className="text-xs text-zinc-400 font-medium mt-1">
              제 {patternIndex + 1}번 패턴 보드
            </p>
          </div>
        </div>

        <div className="flex-1 p-3 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          
          {isStatRoom ? (
            <div className="flex flex-col pb-6">
              
              {/* 💡 4번 방 전용: 타겟 번호 선택 가로 스와이프 탭 */}
              {patternIndex === 3 && (
                <div className="flex overflow-x-auto gap-2 pb-3 mb-2 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {[...Array(45)].map((_, i) => {
                    const num = i + 1;
                    const isSelected = targetNumber === num;
                    return (
                      <button
                        key={num}
                        onClick={() => setTargetNumber(num)}
                        className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-bold text-sm transition-all border
                          ${isSelected 
                            ? getBallColor(num) + ' scale-110 border-white shadow-lg' 
                            : 'bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:bg-zinc-700'}
                        `}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-col items-center justify-center gap-1 mb-4 bg-zinc-800/50 p-3 rounded-2xl border border-zinc-700/50 relative overflow-hidden shrink-0">
                {patternIndex === 1 && <div className="absolute inset-0 bg-red-500/5 mix-blend-overlay"></div>}
                {patternIndex === 2 && <div className="absolute inset-0 bg-blue-500/5 mix-blend-overlay"></div>}
                {patternIndex === 3 && <div className="absolute inset-0 bg-purple-500/5 mix-blend-overlay"></div>}
                
                <h2 className="text-zinc-200 font-bold text-sm text-center flex items-center gap-2 z-10">
                  {patternIndex === 0 ? (
                    <><Trophy size={18} className="text-amber-500" /> 1~45 전체 누적 통계 보드</>
                  ) : patternIndex === 1 ? (
                    <><Flame size={18} className="text-red-500" /> 2026년 대세 통계 보드</>
                  ) : patternIndex === 2 ? (
                    <><CalendarDays size={18} className="text-blue-400" /> 2026년 연간 히트맵 매트릭스</>
                  ) : (
                    <><Magnet size={18} className="text-purple-400" /> 역대 짝꿍(동반 출현) 매트릭스</>
                  )}
                </h2>
                
                {isLoading ? (
                  <span className="text-xs text-zinc-500 font-medium animate-pulse mt-1 z-10">데이터 집계 중...</span>
                ) : (
                  <span className="text-[11px] text-amber-500/80 font-medium mt-0.5 z-10">
                    {patternIndex === 0 || patternIndex === 3 ? `총 1~${totalDraws}회 역대 당첨 기준` 
                     : `2026년 흐름 기반 분석 완료`}
                  </span>
                )}
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="animate-spin text-amber-500" size={40} />
                  <p className="text-sm font-bold text-zinc-400">데이터를 계산하고 있습니다...</p>
                </div>
              ) : patternIndex === 3 ? (
                
                /* 💡 4번 방: 짝꿍 분석기 UI */
                <div className="flex flex-col gap-4">
                  
                  {/* 선택된 타겟 번호 정보 (명함 느낌) */}
                  <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 rounded-2xl p-4 flex items-center justify-between shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Magnet size={64}/></div>
                    <div className="flex items-center gap-4 z-10">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center font-black text-2xl border-[3px] border-white/20 shadow-xl ${getBallColor(targetNumber)}`}>
                        {targetNumber}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-zinc-200 font-black text-base tracking-wide">
                          나의 고정 기준 번호
                        </span>
                        <span className="text-zinc-400 text-xs mt-1">
                          역대 1~1244회 중 총 <strong className="text-amber-500">{targetCount}회</strong> 당첨
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 짝꿍 랭킹 리스트 */}
                  <div className="mt-2">
                    <h3 className="text-zinc-300 font-bold text-xs ml-1 mb-3 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                      {targetNumber}번과 함께 가장 자주 나온 짝꿍 Top 10
                    </h3>
                    
                    <div className="flex flex-col gap-2">
                      {companionStats.slice(0, 10).map((stat) => (
                        <div 
                          key={stat.number} 
                          className="flex items-center justify-between p-3.5 bg-zinc-900/50 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <span className={`font-black text-[15px] w-6 text-center ${stat.rank <= 3 ? 'text-amber-500' : 'text-zinc-500'}`}>
                              {stat.rank}위
                            </span>
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border border-white/20 shadow-sm ${getBallColor(stat.number)}`}>
                              {stat.number}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 text-[13px]">
                            <span className="text-zinc-200 font-bold">{stat.count}</span>
                            <span className="text-zinc-500">회 동반 당첨</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              ) : patternIndex === 2 ? (
                /* 3번 방 히트맵 (기존 로직 생략 없이 렌더링 유지) */
                <div className="flex flex-col bg-zinc-900/50 rounded-2xl border border-zinc-800/80 overflow-hidden">
                  <div className="flex border-b border-zinc-800/80 bg-zinc-800/30 sticky top-0 z-10 backdrop-blur-sm">
                    <div className="w-12 shrink-0 border-r border-zinc-800/80 flex items-center justify-center">
                      <span className="text-[10px] font-black text-zinc-500">NO.</span>
                    </div>
                    <div className="flex-1 flex">
                      {[...Array(12)].map((_, i) => (
                        <div key={i} className="flex-1 flex items-center justify-center py-2 border-r border-zinc-800/50 last:border-0">
                          <span className="text-[9px] font-bold text-zinc-400">{i + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col">
                    {heatmapStats.map((stat) => (
                      <div key={stat.number} className="flex border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors group">
                        <div className="w-12 shrink-0 border-r border-zinc-800/80 flex items-center justify-center py-1">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] shadow-sm ${getBallColor(stat.number)}`}>
                            {stat.number}
                          </div>
                        </div>
                        <div className="flex-1 flex p-0.5 gap-0.5">
                          {stat.months.map((count, monthIndex) => (
                            <div key={monthIndex} className={`flex-1 rounded flex items-center justify-center border transition-all duration-300 ${getHeatmapColor(count)} ${count > 0 ? 'group-hover:scale-[1.05] z-10' : ''}`}>
                              {count > 0 && <span className="text-[9px] leading-none">{count}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* 1, 2번 방 바둑판 */
                <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
                  {stats.map((stat) => {
                    const isTop1 = stat.rank === 1;
                    const isTop2 = stat.rank === 2;
                    const isTop3 = stat.rank === 3;
                    return (
                      <div key={stat.number} className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors border shadow-sm aspect-[4/5] ${isTop1 ? 'bg-yellow-500/15 border-yellow-500/50 shadow-yellow-500/20' : isTop2 ? 'bg-slate-300/15 border-slate-300/50' : isTop3 ? 'bg-amber-700/15 border-amber-700/50' : 'bg-zinc-800/30 border-zinc-700/30'}`}>
                        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-sm border border-white/20 mb-1.5 ${getBallColor(stat.number)}`}>{stat.number}</div>
                        <span className="text-[10px] sm:text-[11px] text-zinc-400 font-medium leading-tight">{stat.count}번</span>
                        <span className={`text-[11px] sm:text-xs font-black leading-tight mt-0.5 ${isTop1 ? 'text-yellow-500' : isTop2 ? 'text-slate-300' : isTop3 ? 'text-amber-500' : 'text-zinc-300'}`}>{stat.rank}위</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center h-full pt-10">
              <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mb-4 shadow-inner"><span className="text-2xl">🛠️</span></div>
              <h2 className="text-lg font-bold text-zinc-200 mb-2">분석 도화지 준비 완료!</h2>
              <p className="text-sm text-zinc-500 break-keep-all leading-relaxed">이곳에 <strong className="text-amber-500">'{patternName}'</strong>을(를) 위한<br/>새로운 분석 기능이 들어올 예정입니다.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}