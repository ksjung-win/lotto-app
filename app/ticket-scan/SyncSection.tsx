'use client';

import React, { useState } from 'react';
import { RefreshCw, LogOut, Loader2, Cloud, CloudOff, Eye, EyeOff } from 'lucide-react';
import { firebaseReady } from '../lib/firebase';
import { useSyncStatus, loginOrSignup, logout, syncNow } from '../lib/cloudSync';
import { useTicketStore } from '../store/useTicketStore';

const hhmm = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// 💡 설정 창의 [기기 연동]: 같은 이메일로 로그인한 PC·휴대폰끼리 복권과 직접 수정 내용을 자동으로 맞춤
export default function SyncSection() {
  const { email, state, lastSync, error, cloudCount } = useSyncStatus();
  const localCount = useTicketStore((s) => s.tickets.length);
  const [emailInput, setEmailInput] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  if (!firebaseReady) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-zinc-700 p-3 text-[11.5px] text-gray-500 dark:text-zinc-400 break-keep">
        <b className="text-gray-700 dark:text-zinc-300">기기 연동</b> · Firebase 설정값이 아직 들어 있지 않아요. (app/lib/firebase.ts)
      </div>
    );
  }

  const handleLogin = async () => {
    if (!emailInput.trim() || pw.length < 6) {
      setMsg('이메일과 비밀번호(6자 이상)를 입력해 주세요.');
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      await loginOrSignup(emailInput, pw);
      setPw('');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '로그인에 실패했어요.');
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm('연동을 끝낼까요? 이 기기에 있는 복권은 그대로 남아요.')) return;
    await logout();
  };

  return (
    <div className="rounded-xl border border-sky-400/40 bg-sky-50/60 dark:bg-sky-500/5 p-3 flex flex-col gap-2.5">
      <div className="flex items-center gap-1.5 text-[13px] font-black text-gray-800 dark:text-zinc-100">
        {email ? <Cloud size={16} className="text-sky-500" /> : <CloudOff size={16} className="text-gray-400" />} 기기 연동 (PC ↔ 휴대폰)
      </div>

      {email ? (
        <>
          <div className="text-[11.5px] text-gray-700 dark:text-zinc-300 flex flex-col gap-1">
            <div className="font-bold break-all">{email}</div>
            <div className="flex items-center gap-1.5 font-bold">
              {state === 'ok' && <span className="text-emerald-600 dark:text-emerald-400">🟢 연동 중{lastSync ? ` · 마지막 연동 ${hhmm(lastSync)}` : ''}</span>}
              {state === 'connecting' && <span className="text-sky-600 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> 연결하는 중…</span>}
              {state === 'error' && <span className="text-red-500 break-keep">🔴 {error}</span>}
            </div>
            <div className="text-gray-500 dark:text-zinc-400">이 기기 {localCount}장 · 저장소 {cloudCount}장</div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button onClick={syncNow} className="py-2 rounded-xl bg-sky-500 text-white text-xs font-bold active:scale-95 flex items-center justify-center gap-1">
              <RefreshCw size={12} /> 지금 맞추기
            </button>
            <button onClick={handleLogout} className="py-2 rounded-xl border border-gray-300 dark:border-zinc-600 text-gray-600 dark:text-zinc-300 text-xs font-bold active:scale-95 flex items-center justify-center gap-1">
              <LogOut size={12} /> 연동 끝내기
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-[11px] text-gray-600 dark:text-zinc-400 leading-relaxed break-keep">
            PC와 휴대폰에서 <b>같은 이메일·비밀번호</b>로 로그인하면 복권과 직접 수정 내용이 자동으로 맞춰져요. 처음 쓰는 이메일이면 자동으로 가입돼요. 양쪽 복권은 지워지지 않고 합쳐져요.
          </p>
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="이메일"
            autoComplete="email"
            className="w-full border border-gray-300 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white rounded-lg px-3 py-2.5 text-sm outline-none focus:border-sky-500"
          />
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="비밀번호 (6자 이상)"
              autoComplete="current-password"
              className="w-full border border-gray-300 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white rounded-lg pl-3 pr-10 py-2.5 text-sm outline-none focus:border-sky-500"
            />
            <button onClick={() => setShowPw(!showPw)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <button
            onClick={handleLogin}
            disabled={busy}
            className="py-2.5 rounded-xl bg-sky-500 text-white text-xs font-bold active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1"
          >
            {busy && <Loader2 size={12} className="animate-spin" />} 로그인 (처음이면 자동 가입)
          </button>
          {msg && <div className="text-[11.5px] font-bold text-red-500 break-keep">{msg}</div>}
        </>
      )}
    </div>
  );
}