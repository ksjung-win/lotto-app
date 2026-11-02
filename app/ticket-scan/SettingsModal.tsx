'use client';

import React, { useEffect, useState } from 'react';
import { X, KeyRound, CheckCircle2, XCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import {
  getGeminiKey, setGeminiKey, clearGeminiKey, getGeminiModel, setGeminiModel, testGemini, DEFAULT_GEMINI_MODEL,
} from '../lib/geminiReader';

// 💡 설정 창: 제미나이 API 키 (각자 자기 키를 입력, 이 휴대폰에만 저장)
export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const [keyInput, setKeyInput] = useState('');
  const [modelInput, setModelInput] = useState(DEFAULT_GEMINI_MODEL);
  const [showKey, setShowKey] = useState(false);
  const [hasSavedKey, setHasSavedKey] = useState(false);
  const [testState, setTestState] = useState<{ status: 'idle' | 'testing' | 'ok' | 'fail'; message: string }>({ status: 'idle', message: '' });

  useEffect(() => {
    const k = getGeminiKey();
    setKeyInput(k);
    setHasSavedKey(!!k);
    setModelInput(getGeminiModel());
  }, []);

  const handleSave = () => {
    if (!keyInput.trim()) {
      alert('API 키를 입력해 주세요.');
      return;
    }
    setGeminiKey(keyInput);
    setGeminiModel(modelInput);
    setHasSavedKey(true);
    setTestState({ status: 'idle', message: '' });
    alert('저장했습니다. [연결 확인]으로 작동하는지 확인해 보세요.');
  };

  const handleTest = async () => {
    if (!keyInput.trim()) {
      alert('API 키를 입력해 주세요.');
      return;
    }
    setTestState({ status: 'testing', message: '' });
    try {
      await testGemini(keyInput.trim(), modelInput.trim() || DEFAULT_GEMINI_MODEL);
      setTestState({ status: 'ok', message: '연결 성공! 이제 QR 없는 사진도 읽을 수 있어요.' });
    } catch (e) {
      setTestState({ status: 'fail', message: e instanceof Error ? e.message : '연결에 실패했습니다.' });
    }
  };

  const handleDelete = () => {
    if (!window.confirm('이 휴대폰에 저장된 API 키를 삭제하시겠습니까?')) return;
    clearGeminiKey();
    setKeyInput('');
    setHasSavedKey(false);
    setTestState({ status: 'idle', message: '' });
  };

  return (
    <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-3 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-[360px] max-h-full overflow-y-auto flex flex-col">
        <div className="bg-gray-50 dark:bg-zinc-800 p-3 border-b dark:border-zinc-700 flex justify-between items-center sticky top-0 z-10">
          <h3 className="font-bold text-gray-800 dark:text-zinc-200 ml-1 text-sm flex items-center gap-1.5">
            <KeyRound size={16} className="text-amber-500" /> 설정 · 제미나이 AI 읽기
          </h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700">
            <X size={18} className="text-gray-600 dark:text-zinc-300" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3">
          <p className="text-[11.5px] text-gray-600 dark:text-zinc-400 leading-relaxed break-keep">
            QR코드가 없는 사진(유튜브 캡처 등)은 제미나이 AI가 번호를 읽어요. 각자 <b>자기 API 키</b>를 넣어 쓰며, 키는 <b>이 휴대폰에만</b> 저장되고 다른 곳으로 보내지지 않아요.
          </p>

          <div className="flex items-center gap-1.5 text-[12px] font-bold text-gray-700 dark:text-zinc-300">
            상태:
            {hasSavedKey ? <span className="text-emerald-600">키 저장됨</span> : <span className="text-gray-400">키 없음 (QR·직접 입력만 가능)</span>}
          </div>

          <label className="text-xs font-bold text-gray-700 dark:text-zinc-300">제미나이 API 키</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="AIza로 시작하는 키 붙여넣기"
              autoComplete="off"
              className="w-full border border-gray-300 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white rounded-lg pl-3 pr-10 py-2.5 text-sm outline-none focus:border-amber-500"
            />
            <button onClick={() => setShowKey(!showKey)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400">
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <label className="text-xs font-bold text-gray-700 dark:text-zinc-300">모델 이름</label>
          <input
            type="text"
            value={modelInput}
            onChange={(e) => setModelInput(e.target.value)}
            autoComplete="off"
            className="w-full border border-gray-300 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white rounded-lg px-3 py-2.5 text-sm outline-none focus:border-amber-500"
          />
          <p className="text-[10.5px] text-gray-400 -mt-1.5 break-keep">
            보통은 그대로 두세요. 구글이 모델을 바꾸면 여기서 새 이름(예: 더 새로운 flash 모델)으로 고칠 수 있어요.
          </p>

          <div className="grid grid-cols-3 gap-1.5">
            <button onClick={handleSave} className="py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold active:scale-95">
              저장
            </button>
            <button onClick={handleTest} disabled={testState.status === 'testing'} className="py-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 text-xs font-bold active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1">
              {testState.status === 'testing' && <Loader2 size={12} className="animate-spin" />}
              연결 확인
            </button>
            <button onClick={handleDelete} className="py-2.5 rounded-xl border border-red-500/40 text-red-500 text-xs font-bold active:scale-95">
              키 삭제
            </button>
          </div>

          {testState.status === 'ok' && (
            <div className="flex items-start gap-1.5 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-[11.5px] font-bold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 size={14} className="shrink-0 mt-0.5" /> {testState.message}
            </div>
          )}
          {testState.status === 'fail' && (
            <div className="flex items-start gap-1.5 p-2.5 rounded-lg bg-red-50 dark:bg-red-500/10 text-[11.5px] font-bold text-red-600 dark:text-red-400 break-keep">
              <XCircle size={14} className="shrink-0 mt-0.5" /> {testState.message}
            </div>
          )}

          {/* 💡 키 발급 방법 안내 */}
          <details className="rounded-xl border border-gray-200 dark:border-zinc-700 p-3 text-[11.5px] text-gray-600 dark:text-zinc-400">
            <summary className="font-bold text-gray-800 dark:text-zinc-200 cursor-pointer">API 키 발급 방법 (무료)</summary>
            <ol className="list-decimal pl-4 mt-2 flex flex-col gap-1 leading-relaxed break-keep">
              <li>휴대폰이나 컴퓨터에서 <b>aistudio.google.com</b>에 접속해 구글 계정으로 로그인하세요.</li>
              <li>왼쪽(또는 메뉴)에서 <b>Get API key</b>를 누르세요.</li>
              <li><b>Create API key</b>를 눌러 키를 만드세요.</li>
              <li>만들어진 키(AIza로 시작)를 <b>복사</b>해서 위 칸에 붙여넣고 <b>[저장]</b> → <b>[연결 확인]</b>을 누르세요.</li>
            </ol>
          </details>

          <details className="rounded-xl border border-gray-200 dark:border-zinc-700 p-3 text-[11.5px] text-gray-600 dark:text-zinc-400">
            <summary className="font-bold text-gray-800 dark:text-zinc-200 cursor-pointer">더 안전하게 쓰기 (권장)</summary>
            <ul className="list-disc pl-4 mt-2 flex flex-col gap-1 leading-relaxed break-keep">
              <li>구글 클라우드 콘솔의 <b>API 및 서비스 → 사용자 인증 정보</b>에서 키를 열고, <b>웹사이트 제한</b>에 이 앱 주소를 넣으면 다른 곳에서는 키를 쓸 수 없어요.</li>
              <li>여러 사람이 같은 휴대폰을 쓰면 사용 후 <b>[키 삭제]</b>를 눌러 주세요.</li>
              <li>키는 다른 사람에게 보내거나 공개된 곳에 올리지 마세요.</li>
            </ul>
          </details>
        </div>
      </div>
    </div>
  );
}