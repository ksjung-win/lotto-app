'use client';

import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Ticket } from '../store/useTicketStore';
import { getBallColor, pad2 } from '../lib/endDigitPattern';
import { TicketResult, Step2Hit, DupNumber } from '../lib/connectPattern';
import ConnectGrid, { ticketLabel, numsText } from './ConnectGrid';

// 결과가 없을 때
function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center text-center py-10 gap-2 text-gray-500 dark:text-zinc-400">
      <Search size={28} className="text-gray-300 dark:text-zinc-600" />
      <p className="text-sm font-bold">{text}</p>
      <p className="text-[11px] break-keep">복권이 더 등록되면 자동으로 다시 분석돼요.</p>
    </div>
  );
}

// 펼침/접힘 상태 (여러 개를 동시에 펼칠 수 있음)
const useOpenSet = () => {
  const [open, setOpen] = useState<string[]>([]);
  const toggle = (k: string) => setOpen((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  return { isOpen: (k: string) => open.includes(k), toggle };
};

// 2단계 1건의 두 표 (연결 복권 → 갇힌 복권)
function HitGrids({ hit, ticketNo }: { hit: Step2Hit; ticketNo: Map<string, number> }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-gray-500 dark:text-zinc-400 truncate">
          연결: {ticketLabel(hit.source, ticketNo.get(hit.source.id))}
        </span>
        <ConnectGrid small ticket={hit.source} walls={hit.sourceEnc.walls} />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-gray-500 dark:text-zinc-400 truncate">
          갇힘: {ticketLabel(hit.target, ticketNo.get(hit.target.id))}
        </span>
        <ConnectGrid small ticket={hit.target} walls={hit.targetEnc.walls} highlight={hit.cells} />
      </div>
    </div>
  );
}

// 색 안내
function Legend({ items }: { items: [string, string][] }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-gray-500 dark:text-zinc-400">
      {items.map(([cls, label]) => (
        <span key={label} className="flex items-center gap-1">
          <span className={`w-3 h-3 rounded-sm ${cls}`} /> {label}
        </span>
      ))}
    </div>
  );
}

// 요약 표의 복권 번호 칸 (번호와 TR을 두 줄로, 줄바꿈 없이)
function TicketCell({ ticket, no }: { ticket: Ticket; no?: number }) {
  return (
    <span className="font-black text-gray-900 dark:text-zinc-100 leading-tight">
      <span className="block">{no}번</span>
      <span className="block whitespace-nowrap text-[11px]">{ticketLabel(ticket)}</span>
    </span>
  );
}

// 요약 표의 머리줄 · 줄
const ROW_GRID = 'grid grid-cols-[76px_1fr_1fr_14px] gap-2 items-start';

/* ─────────────────────────────── 입력된 복권 보기 (등록 날짜별) ─────────────────────────────── */
export function TicketsByDate({ roundTickets, ticketNo, isNew }: { roundTickets: Ticket[]; ticketNo: Map<string, number>; isNew: (t: Ticket) => boolean }) {
  const { isOpen, toggle } = useOpenSet();
  if (roundTickets.length === 0) return <Empty text="등록된 복권이 없습니다" />;

  // 등록한 날짜별로 묶기
  const groups = new Map<string, Ticket[]>();
  roundTickets.forEach((t) => {
    const d = new Date(t.createdAt);
    const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    groups.set(k, [...(groups.get(k) || []), t]);
  });
  const dayName = (ms: number) => {
    const d = new Date(ms);
    return `${d.getMonth() + 1}월 ${d.getDate()}일 (${'일월화수목금토'[d.getDay()]})`;
  };
  const time = (ms: number) => {
    const d = new Date(ms);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-4">
      {Array.from(groups.values()).map((list) => (
        <div key={list[0].id} className="flex flex-col gap-2">
          <div className="text-[13px] font-black text-gray-900 dark:text-zinc-100">
            📅 {dayName(list[0].createdAt)} <span className="text-amber-500">· {list.length}장</span>
          </div>
          {list.map((t) => (
            <button
              key={t.id}
              onClick={() => toggle(t.id)}
              className="text-left bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/50 rounded-2xl p-3 flex flex-col gap-2"
            >
              <div className="flex justify-between items-center">
                <span className="text-[13px] font-black text-gray-900 dark:text-zinc-100 flex items-center gap-1.5">
                  {ticketLabel(t, ticketNo.get(t.id))}
                  {isNew(t) && <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-black">NEW</span>}
                </span>
                <span className="text-[10.5px] text-gray-500 dark:text-zinc-400 flex items-center gap-1">
                  {t.source === 'qr' ? 'QR' : t.source === 'ai' ? 'AI 읽기' : '직접 입력'} · {time(t.createdAt)}
                  {isOpen(t.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </span>
              </div>
              {isOpen(t.id) ? (
                <ConnectGrid ticket={t} />
              ) : (
                <div className="flex flex-col gap-1">
                  {t.games.map((g) => (
                    <div key={g.label} className="flex items-center gap-1">
                      <span className="w-4 text-[10px] font-black text-gray-400">{g.label}</span>
                      {g.numbers.map((n, i) => (
                        <span key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10.5px] font-bold ${getBallColor(n)}`}>
                          {pad2(n)}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────── 1단계 분석 요약 ─────────────────────────────── */
export function Summary1({ step1, ticketNo }: { step1: TicketResult[]; ticketNo: Map<string, number> }) {
  const { isOpen, toggle } = useOpenSet();
  if (step1.length === 0) return <Empty text="연결된 복권이 없습니다" />;
  const rows = step1.flatMap((s) => s.enclosures.map((e, i) => ({ ticket: s.ticket, enc: e, key: `${s.ticket.id}-${i}` })));

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] text-gray-500 dark:text-zinc-400 break-keep">줄을 누르면 그 복권의 표가 펼쳐져요.</p>
      <div className={`${ROW_GRID} px-2.5 text-[10.5px] font-black text-gray-500 dark:text-zinc-400`}>
        <span>복권 번호</span><span>연결 번호</span><span>갇힌 번호</span><span />
      </div>
      {rows.map(({ ticket, enc, key }) => (
        <div key={key} className="bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/50 rounded-xl">
          <button onClick={() => toggle(key)} className={`${ROW_GRID} w-full text-left p-2.5 text-[11.5px]`}>
            <TicketCell ticket={ticket} no={ticketNo.get(ticket.id)} />
            <span className="text-gray-700 dark:text-zinc-300 break-all">
              <b className="text-[#1E3A8A] dark:text-blue-400">끝수{enc.digit}</b> {numsText(enc.walls)}
            </span>
            <span className="font-bold text-gray-900 dark:text-zinc-100 break-all">{numsText(enc.cells)}</span>
            {isOpen(key) ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </button>
          {isOpen(key) && (
            <div className="px-2.5 pb-2.5">
              <ConnectGrid ticket={ticket} walls={enc.walls} trapped={enc.cells} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────── 2단계 분석 요약 ─────────────────────────────── */
export function Summary2({ step2, ticketNo }: { step2: Step2Hit[]; ticketNo: Map<string, number> }) {
  const { isOpen, toggle } = useOpenSet();
  if (step2.length === 0) return <Empty text="다른 복권에 갇힌 연결 번호가 없습니다" />;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] text-gray-500 dark:text-zinc-400 break-keep">
        연결 번호가 다른 복권의 막힌 구역 안에 갇힌 경우예요. 줄을 누르면 두 복권의 표가 펼쳐져요.
      </p>
      <div className={`${ROW_GRID} px-2.5 text-[10.5px] font-black text-gray-500 dark:text-zinc-400`}>
        <span>갇힌 복권</span><span>연결 번호</span><span>갇힌 번호</span><span />
      </div>
      {step2.map((h, i) => {
        const key = `h${i}`;
        return (
          <div key={key} className="bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/50 rounded-xl">
            <button onClick={() => toggle(key)} className={`${ROW_GRID} w-full text-left p-2.5 text-[11.5px]`}>
              <TicketCell ticket={h.target} no={ticketNo.get(h.target.id)} />
              <span className="text-gray-700 dark:text-zinc-300 break-all">
                <span className="block text-[10px] text-gray-500 dark:text-zinc-400">← {ticketLabel(h.source, ticketNo.get(h.source.id))}</span>
                <b className="text-[#1E3A8A] dark:text-blue-400">끝수{h.sourceEnc.digit}</b> {numsText(h.sourceEnc.walls)}
              </span>
              <span className="font-black text-orange-500 break-all">{numsText(h.cells)}</span>
              {isOpen(key) ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
            </button>
            {isOpen(key) && (
              <div className="px-2.5 pb-2.5">
                <HitGrids hit={h} ticketNo={ticketNo} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────── 2단계: 갇힌 번호 보기 ─────────────────────────────── */
export function Step2View({ step2, step2Numbers, ticketNo }: { step2: Step2Hit[]; step2Numbers: number[]; ticketNo: Map<string, number> }) {
  const [filter, setFilter] = useState<number | null>(null);
  if (step2.length === 0) return <Empty text="다른 복권에 갇힌 연결 번호가 없습니다" />;
  const visible = step2.filter((h) => filter === null || h.cells.some((c) => c.number === filter));
  const chip = 'px-2.5 py-1 rounded-lg text-[11px] font-bold border';

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed break-keep">
        1단계에서 같은 끝자리로 연결된 번호가, 다른 복권의 연결 구역 안에 갇혀 있으면 그 번호를 뽑아요.
      </p>
      <div className="rounded-xl p-3 border border-orange-400/40 bg-orange-50/60 dark:bg-orange-500/5">
        <div className="text-[12px] font-black text-gray-900 dark:text-zinc-100 mb-2">갇힌 번호 ({step2Numbers.length}개)</div>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setFilter(null)} className={`${chip} ${filter === null ? 'bg-amber-500 text-white border-amber-500' : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 border-gray-200 dark:border-zinc-700'}`}>
            전체
          </button>
          {step2Numbers.map((n) => (
            <button
              key={n}
              onClick={() => setFilter(filter === n ? null : n)}
              className={`${chip} ${filter === n ? 'bg-orange-500 text-white border-orange-500' : 'bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 border-gray-200 dark:border-zinc-700'}`}
            >
              {pad2(n)}
            </button>
          ))}
        </div>
      </div>
      <Legend items={[['bg-[#1E3A8A]', '연결(벽)'], ['bg-orange-500', '2단계 갇힌 번호 (다른 복권의 연결 번호)']]} />

      {visible.map((h, i) => (
        <div key={i} className="bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/50 rounded-2xl p-3 flex flex-col gap-2">
          <div className="text-[12px] text-gray-900 dark:text-zinc-100 leading-relaxed break-keep">
            <b>{ticketLabel(h.source, ticketNo.get(h.source.id))}</b>의 끝수 {h.sourceEnc.digit} 연결 ({numsText(h.sourceEnc.walls)}) 중
            <b className="text-orange-500"> {numsText(h.cells)}</b>이(가) <b>{ticketLabel(h.target, ticketNo.get(h.target.id))}</b>에서 갇힘
          </div>
          <HitGrids hit={h} ticketNo={ticketNo} />
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────── 3단계: 갇힌 중복 번호 보기 ─────────────────────────────── */
export function Step3View({ step3, ticketNo }: { step3: DupNumber[]; ticketNo: Map<string, number> }) {
  const { isOpen, toggle } = useOpenSet();
  if (step3.length === 0) return <Empty text="2단계에서 갇힌 번호가 없습니다" />;
  const max = step3[0].count;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed break-keep">
        2단계에서 갇힌 번호가 몇 장의 복권에서 갇혔는지 많은 순서로 보여줘요. 줄을 누르면 어느 복권인지 나와요.
      </p>
      {step3.map((d, i) => {
        const key = String(d.number);
        // 갇힌 복권별로 묶기
        const byTarget = new Map<string, Step2Hit[]>();
        d.hits.forEach((h) => byTarget.set(h.target.id, [...(byTarget.get(h.target.id) || []), h]));
        return (
          <div key={key} className="bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/50 rounded-xl">
            <button onClick={() => toggle(key)} className="w-full flex items-center gap-2.5 p-2.5 text-left">
              <span className="w-5 text-[11px] font-black text-gray-400 text-right">{i + 1}</span>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${getBallColor(d.number)}`}>{pad2(d.number)}</span>
              <div className="flex-1 h-2.5 rounded-full bg-gray-200 dark:bg-zinc-700 overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(d.count / max) * 100}%` }} />
              </div>
              <span className="text-[13px] font-black text-gray-900 dark:text-zinc-100 w-12 text-right">{d.count}장</span>
              {isOpen(key) ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
            </button>
            {isOpen(key) && (
              <div className="px-3 pb-3 flex flex-col gap-1.5 text-[11.5px]">
                {Array.from(byTarget.values()).map((hits) => (
                  <div key={hits[0].target.id} className="text-gray-700 dark:text-zinc-300 break-keep">
                    <b className="text-gray-900 dark:text-zinc-100">{ticketLabel(hits[0].target, ticketNo.get(hits[0].target.id))}</b>에서 갇힘
                    <span className="text-gray-500 dark:text-zinc-400">
                      {' '}← {hits.map((h) => `${ticketLabel(h.source, ticketNo.get(h.source.id))} 끝수${h.sourceEnc.digit}`).join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}