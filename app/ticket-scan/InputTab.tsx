'use client';

import React, { useRef, useState } from 'react';
import { Camera, Images, PenLine, X, CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { useTicketStore, LottoGame } from '../store/useTicketStore';
import { readTicketFromFile } from '../lib/lottoQr';
import { getLatestDrawNo } from '../store/useRoundStore';
import { getBallColor, pad2 } from '../lib/endDigitPattern';

const MAX_FILES = 50;
const GAME_LABELS = ['A', 'B', 'C', 'D', 'E'];

type ResultItem = {
  key: string;
  status: 'ok' | 'dup' | 'fail';
  title: string;
  detail: string;
  previewUrl?: string; // 실패한 사진만 미리보기 보관
};

export default function InputTab({ onGoToList }: { onGoToList: () => void }) {
  const { addTicket } = useTicketStore();

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<ResultItem[]>([]);
  const [notice, setNotice] = useState('');

  // 직접 입력 팝업
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [manualPreview, setManualPreview] = useState<string | undefined>(undefined);
  const [manualFailKey, setManualFailKey] = useState<string | null>(null);
  const [manualRound, setManualRound] = useState('');
  const [manualGames, setManualGames] = useState<number[][]>([[], [], [], [], []]);
  const [activeGame, setActiveGame] = useState(0);

  // 💡 사진 여러 장 판독
  const processFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).slice(0, MAX_FILES);
    setNotice(fileList.length > MAX_FILES ? `한 번에 ${MAX_FILES}장까지만 처리합니다. 앞의 ${MAX_FILES}장만 읽었어요.` : '');

    setIsProcessing(true);
    setProgress({ done: 0, total: files.length });
    const newResults: ResultItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const key = `${Date.now()}_${i}`;
      let parsed = null;
      try {
        parsed = await readTicketFromFile(file);
      } catch (e) {
        console.error('판독 오류:', e);
      }

      if (!parsed) {
        newResults.push({
          key,
          status: 'fail',
          title: `사진 ${i + 1}: QR 인식 실패`,
          detail: 'QR코드가 선명하게 나오도록 다시 찍거나, 직접 입력해 주세요.',
          previewUrl: URL.createObjectURL(file),
        });
      } else {
        const res = addTicket({ round: parsed.round, tr: parsed.tr, games: parsed.games, source: 'qr' });
        const trShort = parsed.tr.slice(0, 10).slice(-4);
        newResults.push({
          key,
          status: res === 'added' ? 'ok' : 'dup',
          title: `${parsed.round}회 · TR …${trShort}`,
          detail: res === 'added' ? `${parsed.games.length}게임 등록 완료` : '이미 등록된 복권이라 건너뛰었어요',
        });
      }
      setProgress({ done: i + 1, total: files.length });
      setResults([...newResults]);
    }

    setIsProcessing(false);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  // 💡 직접 입력 팝업 열기
  const openManual = (previewUrl?: string, failKey?: string) => {
    setManualPreview(previewUrl);
    setManualFailKey(failKey ?? null);
    setManualRound(String(getLatestDrawNo() + 1)); // 이번 주 추첨 회차
    setManualGames([[], [], [], [], []]);
    setActiveGame(0);
    setIsManualOpen(true);
  };

  const toggleManualNumber = (num: number) => {
    const next = manualGames.map((g) => [...g]);
    const game = next[activeGame];
    if (game.includes(num)) {
      next[activeGame] = game.filter((n) => n !== num);
    } else if (game.length < 6) {
      next[activeGame] = [...game, num].sort((a, b) => a - b);
    } else {
      return; // 이미 6개를 골랐으면 무시
    }
    setManualGames(next);
    // 6개를 다 고르면 다음 게임으로 자동 이동
    if (next[activeGame].length === 6 && activeGame < 4) setActiveGame(activeGame + 1);
  };

  // 💡 직접 입력 저장
  const saveManual = () => {
    const round = parseInt(manualRound, 10);
    if (isNaN(round) || round < 1) {
      alert('추첨 회차를 입력해 주세요. (예: 1248)');
      return;
    }
    const incomplete = manualGames.findIndex((g) => g.length > 0 && g.length < 6);
    if (incomplete !== -1) {
      alert(`${GAME_LABELS[incomplete]}게임은 번호가 ${manualGames[incomplete].length}개입니다. 6개를 모두 고르거나 비워 주세요.`);
      return;
    }
    const filled = manualGames.filter((g) => g.length === 6);
    if (filled.length === 0) {
      alert('최소 1게임(번호 6개)을 입력해 주세요.');
      return;
    }
    const games: LottoGame[] = filled.map((numbers, i) => ({ label: GAME_LABELS[i], numbers }));
    const res = addTicket({ round, tr: null, games, source: 'manual' });
    if (res === 'duplicate') {
      alert('같은 회차에 똑같은 번호의 복권이 이미 등록되어 있습니다.');
      return;
    }

    const newItem: ResultItem = {
      key: `manual_${Date.now()}`,
      status: 'ok',
      title: `${round}회 · 직접 입력`,
      detail: `${games.length}게임 등록 완료`,
    };
    // 실패했던 사진을 직접 입력으로 해결했다면 그 줄을 '등록 완료'로 바꿈
    setResults((prev) =>
      manualFailKey ? prev.map((r) => (r.key === manualFailKey ? newItem : r)) : [...prev, newItem]
    );
    setIsManualOpen(false);
  };

  const okCount = results.filter((r) => r.status === 'ok').length;
  const dupCount = results.filter((r) => r.status === 'dup').length;
  const failCount = results.filter((r) => r.status === 'fail').length;

  return (
    <div className="flex flex-col gap-3 pb-4">
      {/* 숨겨진 파일 선택 칸 (버튼이 대신 눌러 줌) */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => processFiles(e.target.files)} />
      <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => processFiles(e.target.files)} />

      {/* 💡 입력 버튼 3개 */}
      <button
        disabled={isProcessing}
        onClick={() => cameraInputRef.current?.click()}
        className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md active:scale-[0.98] transition-all disabled:opacity-50"
      >
        <Camera size={24} />
        <div className="text-left">
          <div className="font-black text-[15px]">카메라로 찍기</div>
          <div className="text-[11px] opacity-90">찍으면 바로 읽어서 등록해요</div>
        </div>
      </button>
      <div className="grid grid-cols-2 gap-2">
        <button
          disabled={isProcessing}
          onClick={() => galleryInputRef.current?.click()}
          className="flex flex-col items-start gap-1.5 p-3 rounded-2xl bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700/50 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <Images size={20} className="text-amber-500" />
          <div className="font-bold text-[13px] text-gray-900 dark:text-zinc-100">사진첩에서 고르기</div>
          <div className="text-[10.5px] text-gray-500 dark:text-zinc-400">한 번에 최대 {MAX_FILES}장</div>
        </button>
        <button
          disabled={isProcessing}
          onClick={() => openManual()}
          className="flex flex-col items-start gap-1.5 p-3 rounded-2xl bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700/50 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <PenLine size={20} className="text-amber-500" />
          <div className="font-bold text-[13px] text-gray-900 dark:text-zinc-100">직접 입력</div>
          <div className="text-[10.5px] text-gray-500 dark:text-zinc-400">QR이 안 읽힐 때</div>
        </button>
      </div>

      <p className="text-[11px] text-gray-400 dark:text-zinc-500 leading-relaxed break-keep">
        💡 복권 오른쪽 위 <strong>QR코드</strong>가 화면에 선명하게 나오도록 찍어 주세요. 사진은 저장되지 않고 번호만 저장됩니다.
      </p>

      {notice && <p className="text-[11px] font-bold text-red-500">{notice}</p>}

      {/* 💡 진행 상황 */}
      {progress.total > 0 && (
        <div className="bg-gray-50 dark:bg-zinc-800/60 rounded-xl p-3 border border-gray-200 dark:border-zinc-700/50">
          <div className="flex justify-between items-center text-xs font-bold text-gray-700 dark:text-zinc-300 mb-2">
            <span className="flex items-center gap-1.5">
              {isProcessing && <Loader2 size={14} className="animate-spin text-amber-500" />}
              {isProcessing ? '판독 중…' : '판독 완료'}
            </span>
            <span className="text-amber-500">{progress.done} / {progress.total}</span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
          </div>
          {!isProcessing && (
            <div className="flex justify-between items-center mt-2.5">
              <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                등록 <b className="text-emerald-500">{okCount}</b> · 중복 <b className="text-amber-500">{dupCount}</b> · 실패 <b className="text-red-500">{failCount}</b>
              </span>
              {okCount > 0 && (
                <button onClick={onGoToList} className="text-[11px] font-bold text-amber-600 dark:text-amber-500 underline underline-offset-2">
                  내 복권 보기 →
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 💡 사진별 결과 */}
      <div className="flex flex-col gap-2">
        {results.map((r) => (
          <div
            key={r.key}
            className={`flex items-start gap-2.5 p-3 rounded-xl border ${
              r.status === 'ok'
                ? 'border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10'
                : r.status === 'dup'
                ? 'border-amber-500/30 bg-amber-50 dark:bg-amber-500/10'
                : 'border-red-500/30 bg-red-50 dark:bg-red-500/10'
            }`}
          >
            {r.status === 'ok' && <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />}
            {r.status === 'dup' && <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />}
            {r.status === 'fail' && <XCircle size={18} className="text-red-500 shrink-0 mt-0.5" />}
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-gray-900 dark:text-zinc-100">{r.title}</div>
              <div className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 break-keep">{r.detail}</div>
              {r.status === 'fail' && (
                <div className="flex gap-1.5 mt-2">
                  <button onClick={() => cameraInputRef.current?.click()} className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-[11px] font-bold text-gray-700 dark:text-zinc-300">
                    다시 찍기
                  </button>
                  <button onClick={() => openManual(r.previewUrl, r.key)} className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-[11px] font-bold text-gray-700 dark:text-zinc-300">
                    직접 입력
                  </button>
                </div>
              )}
            </div>
            {r.previewUrl && r.status === 'fail' && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.previewUrl} alt="실패한 사진" className="w-12 h-16 object-cover rounded-md shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* 💡 직접 입력 팝업 */}
      {isManualOpen && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-3 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-[360px] max-h-full overflow-y-auto flex flex-col">
            <div className="bg-gray-50 dark:bg-zinc-800 p-3 border-b dark:border-zinc-700 flex justify-between items-center sticky top-0 z-10">
              <h3 className="font-bold text-gray-800 dark:text-zinc-200 ml-1 text-sm">복권 직접 입력</h3>
              <button onClick={() => setIsManualOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700">
                <X size={18} className="text-gray-600 dark:text-zinc-300" />
              </button>
            </div>

            <div className="p-3 flex flex-col gap-3">
              {manualPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={manualPreview} alt="복권 사진" className="w-full max-h-32 object-contain rounded-lg bg-gray-100 dark:bg-zinc-800" />
              )}

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 shrink-0">추첨 회차</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={manualRound}
                  onChange={(e) => setManualRound(e.target.value)}
                  className="flex-1 border border-gray-300 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white rounded-lg px-3 py-2 text-center text-sm font-bold outline-none focus:border-amber-500"
                />
              </div>

              {/* A~E 게임 줄 (누르면 그 게임을 입력) */}
              <div className="flex flex-col gap-1">
                {manualGames.map((nums, gi) => (
                  <button
                    key={gi}
                    onClick={() => setActiveGame(gi)}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors ${
                      activeGame === gi ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10' : 'border-gray-200 dark:border-zinc-700'
                    }`}
                  >
                    <span className={`w-5 text-xs font-black ${activeGame === gi ? 'text-amber-500' : 'text-gray-400'}`}>{GAME_LABELS[gi]}</span>
                    {Array.from({ length: 6 }).map((_, i) => {
                      const n = nums[i];
                      return (
                        <span
                          key={i}
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold ${
                            n ? getBallColor(n) : 'bg-gray-100 dark:bg-zinc-800 text-gray-300'
                          }`}
                        >
                          {n ? pad2(n) : ''}
                        </span>
                      );
                    })}
                  </button>
                ))}
              </div>

              {/* 1~45 번호판 */}
              <div className="grid grid-cols-9 gap-1">
                {Array.from({ length: 45 }, (_, i) => i + 1).map((num) => {
                  const selected = manualGames[activeGame].includes(num);
                  return (
                    <button
                      key={num}
                      onClick={() => toggleManualNumber(num)}
                      className={`aspect-square rounded-full text-[11px] font-bold border transition-all ${
                        selected
                          ? `${getBallColor(num)} border-transparent scale-105`
                          : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border-gray-200 dark:border-zinc-700'
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setManualGames((prev) => prev.map((g, i) => (i === activeGame ? [] : g)))}
                  className="px-3 py-3 rounded-xl bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 text-xs font-bold"
                >
                  {GAME_LABELS[activeGame]}게임 비우기
                </button>
                <button
                  onClick={saveManual}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold active:scale-95 transition-all shadow-md"
                >
                  등록하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
