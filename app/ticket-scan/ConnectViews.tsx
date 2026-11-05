'use client';

import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Square, LayoutGrid } from 'lucide-react';
import { Ticket } from '../store/useTicketStore';
import { getBallColor, pad2 } from '../lib/endDigitPattern';
import { Step2Hit, Step2Ticket, DupNumber, Combo, Enclosure, GridCell } from '../lib/connectPattern';
import ConnectGrid, { ticketLabel, numsText } from './ConnectGrid';

/* ═══════════════════════════════ 함께 쓰는 부품 ═══════════════════════════════ */

// 결과가 없을 때
export function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center text-center py-10 gap-2 text-gray-500 dark:text-zinc-400">
      <Search size={28} className="text-gray-300 dark:text-zinc-600" />
      <p className="text-sm font-bold">{text}</p>
      <p className="text-[11px] break-keep">복권이 더 등록되면 자동으로 다시 분석돼요.</p>
    </div>
  );
}

// 단계 맨 위 요약 상자
export function SummaryBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl px-3 py-2.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-400/40 text-[12px] font-bold text-gray-800 dark:text-zinc-100 leading-relaxed break-keep">
      {children}
    </div>
  );
}

// 색 안내
export function Legend({ items }: { items: [string, string][] }) {
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

// 펼침/접힘 상태 (여러 개를 동시에 펼칠 수 있음)
const useOpenSet = () => {
  const [open, setOpen] = useState<string[]>([]);
  const toggle = (k: string) => setOpen((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  return { isOpen: (k: string) => open.includes(k), toggle };
};

// 💡 [1장씩] / [6장씩] 보기
// renderOne: 1장씩 볼 때의 큰 카드 · renderSmall: 6장씩 볼 때의 작은 카드 (누르면 1장씩 보기로 이동)
export function Pager<T>({ items, renderOne, renderSmall, page, setPage }: {
  items: T[];
  renderOne: (item: T) => React.ReactNode;
  renderSmall: (item: T) => React.ReactNode;
  page?: { mode: 'one' | 'six'; index: number };
  setPage?: (p: { mode: 'one' | 'six'; index: number }) => void;
}) {
  const [own, setOwn] = useState<{ mode: 'one' | 'six'; index: number }>({ mode: 'one', index: 0 });
  const cur = page ?? own;
  const set = setPage ?? setOwn;
  const index = Math.min(cur.index, Math.max(items.length - 1, 0));
  const btn = (on: boolean) =>
    `flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border ${
      on ? 'bg-amber-500 text-white border-amber-500' : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 border-gray-200 dark:border-zinc-700'
    }`;
  const sixPages = Math.ceil(items.length / 6);
  const sixPage = Math.floor(index / 6);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-1.5">
        <button onClick={() => set({ mode: 'one', index })} className={btn(cur.mode === 'one')}>
          <Square size={12} /> 1장씩
        </button>
        <button onClick={() => set({ mode: 'six', index })} className={btn(cur.mode === 'six')}>
          <LayoutGrid size={12} /> 6장씩
        </button>
        {/* 넘기기 */}
        <div className="ml-auto flex items-center gap-1">
          <button
            disabled={cur.mode === 'one' ? index <= 0 : sixPage <= 0}
            onClick={() => set({ mode: cur.mode, index: cur.mode === 'one' ? index - 1 : (sixPage - 1) * 6 })}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-[12px] font-black text-gray-700 dark:text-zinc-200 min-w-[52px] text-center">
            {cur.mode === 'one' ? `${index + 1} / ${items.length}` : `${sixPage + 1} / ${sixPages}쪽`}
          </span>
          <button
            disabled={cur.mode === 'one' ? index >= items.length - 1 : sixPage >= sixPages - 1}
            onClick={() => set({ mode: cur.mode, index: cur.mode === 'one' ? index + 1 : (sixPage + 1) * 6 })}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {cur.mode === 'one' ? (
        items[index] !== undefined && renderOne(items[index])
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {items.slice(sixPage * 6, sixPage * 6 + 6).map((item, i) => (
            <button key={i} onClick={() => set({ mode: 'one', index: sixPage * 6 + i })} className="text-left">
              {renderSmall(item)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// 작은 카드 틀 (6장씩 보기)
export function SmallCard({ title, sub, children }: { title: string; sub?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/50 rounded-xl p-1.5 flex flex-col gap-1">
      <div className="flex justify-between items-center px-0.5">
        <span className="text-[10.5px] font-black text-gray-900 dark:text-zinc-100 truncate">{title}</span>
        {sub && <span className="text-[9.5px] font-bold text-orange-500 shrink-0 ml-1">{sub}</span>}
      </div>
      {children}
    </div>
  );
}

// 번호 공
function Ball({ n, size = 'md', ring = false }: { n: number; size?: 'sm' | 'md'; ring?: boolean }) {
  return (
    <span
      className={`rounded-full flex items-center justify-center font-bold shrink-0 ${getBallColor(n)} ${
        size === 'sm' ? 'w-7 h-7 text-[11px]' : 'w-8 h-8 text-[12px]'
      } ${ring ? 'ring-[3px] ring-orange-500 ring-offset-1 ring-offset-white dark:ring-offset-zinc-900' : ''}`}
    >
      {pad2(n)}
    </span>
  );
}

// 💡 비교할 출처 1개: 출처 복권의 연결(벽), 갇힌 복권의 연결(벽), 갇힌 칸
type CompareSource = { key: string; source: Ticket; sourceEnc: Enclosure; targetEnc: Enclosure; cells: GridCell[] };

// 출처(복권+끝수) · 갇힌 쪽 끝수별로 묶기 (number를 주면 그 번호만)
const groupSources = (hits: Step2Hit[], number?: number): CompareSource[] => {
  const map = new Map<string, CompareSource>();
  hits.forEach((h) => {
    const k = `${h.source.id}|${h.sourceEnc.digit}|${h.targetEnc.digit}`;
    const cells = h.cells.filter((c) => number === undefined || c.number === number);
    const cur = map.get(k);
    if (cur) cur.cells = [...cur.cells, ...cells.filter((c) => !cur.cells.some((x) => x.row === c.row && x.col === c.col))];
    else map.set(k, { key: k, source: h.source, sourceEnc: h.sourceEnc, targetEnc: h.targetEnc, cells });
  });
  return Array.from(map.values());
};

// 💡 갇힌 복권 ↔ 출처 복권 나란히 비교 (출처가 많으면 칩·◀▶로 하나씩)
// 두 표 모두 '그 끝수 패턴 하나만' 보여줘서 다른 끝수 패턴과 겹쳐 보이지 않게 함
function CompareCard({ target, sources, ticketNo }: {
  target: Ticket; sources: CompareSource[]; ticketNo: Map<string, number>;
}) {
  const [sel, setSel] = useState(0);
  const i = Math.min(sel, sources.length - 1);
  const cur = sources[i];
  if (!cur) return null;
  const nums = Array.from(new Set(cur.cells.map((c) => c.number))).sort((a, b) => a - b);
  const markCells = cur.sourceEnc.walls.filter((w) => nums.includes(w.number));
  const tNo = ticketNo.get(target.id);
  const sNo = ticketNo.get(cur.source.id);
  const manyTargetDigits = new Set(sources.map((s) => s.targetEnc.digit)).size > 1;

  return (
    <div className="flex flex-col gap-2">
      {/* 출처 고르기 (많으면 옆으로 밀기) */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10.5px] font-bold text-gray-500 dark:text-zinc-400 shrink-0">출처 {sources.length}장</span>
        <div className="flex gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {sources.map((s, j) => (
            <button
              key={s.key}
              onClick={() => setSel(j)}
              className={`shrink-0 px-2 py-1 rounded-lg text-[10.5px] font-bold border ${
                j === i ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]' : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-300 border-gray-200 dark:border-zinc-700'
              }`}
            >
              {ticketNo.get(s.source.id)}번 끝{s.sourceEnc.digit}
              {manyTargetDigits && <span className="opacity-75"> → 끝{s.targetEnc.digit}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* 표 2장 나란히 */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-[10.5px] font-black text-orange-500 truncate">갇힌 복권 ({tNo}번 · 끝{cur.targetEnc.digit} 벽 안)</span>
          <ConnectGrid small ticket={target} walls={cur.targetEnc.walls} highlight={cur.cells} />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10.5px] font-black text-[#1E3A8A] dark:text-blue-300 truncate">출처 복권 ({sNo}번 · 끝{cur.sourceEnc.digit} 연결)</span>
          <ConnectGrid small ticket={cur.source} walls={cur.sourceEnc.walls} mark={markCells} />
        </div>
      </div>

      {/* 설명 + 넘기기 */}
      <div className="flex items-start gap-2">
        <div className="flex-1 text-[11px] text-gray-600 dark:text-zinc-400 leading-relaxed break-keep">
          <b className="text-gray-900 dark:text-zinc-100">{ticketLabel(cur.source, sNo)}</b> 끝수{cur.sourceEnc.digit} 연결: {numsText(cur.sourceEnc.walls)}
          <br />→ 이 중 <b className="text-orange-500">{nums.map(pad2).join('·')}</b>이(가) {tNo}번에서 갇힘
        </div>
        {sources.length > 1 && (
          <div className="flex items-center gap-1 shrink-0">
            <button disabled={i <= 0} onClick={() => setSel(i - 1)} className="p-1 rounded-lg border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 disabled:opacity-30">
              <ChevronLeft size={14} />
            </button>
            <span className="text-[11px] font-black text-gray-700 dark:text-zinc-200">{i + 1}/{sources.length}</span>
            <button disabled={i >= sources.length - 1} onClick={() => setSel(i + 1)} className="p-1 rounded-lg border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 disabled:opacity-30">
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// 💡 어떤 번호가 갇힌 복권들 (3단계 · 4단계에서 번호를 누르면 나옴)
function TrappedTicketsFor({ number, hits, ticketNo }: { number: number; hits: Step2Hit[]; ticketNo: Map<string, number> }) {
  // 갇힌 복권별로 묶기
  const byTarget = new Map<string, Step2Hit[]>();
  hits.forEach((h) => byTarget.set(h.target.id, [...(byTarget.get(h.target.id) || []), h]));
  const groups = Array.from(byTarget.values()).sort(
    (a, b) => (ticketNo.get(a[0].target.id) || 0) - (ticketNo.get(b[0].target.id) || 0)
  );
  const wallsOf = (list: Step2Hit[]) => list.flatMap((h) => h.targetEnc.walls);
  const cellsOf = (list: Step2Hit[]) => list.flatMap((h) => h.cells.filter((c) => c.number === number));

  return (
    <div className="flex flex-col gap-2.5">
      <div className="text-[12.5px] font-black text-gray-900 dark:text-zinc-100">
        <span className="text-orange-500">{pad2(number)}번</span>이 갇힌 복권 {groups.length}장
      </div>
      <Legend items={[['bg-orange-500', '갇힌 번호'], ['bg-[#1E3A8A]', '연결(벽)'], ['bg-[#1E3A8A] ring-2 ring-orange-400', '출처에서의 그 번호']]} />
      <Pager
        key={number}
        items={groups}
        renderOne={(list) => (
          <div key={list[0].target.id} className="bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/50 rounded-2xl p-3 flex flex-col gap-2">
            <div className="text-[13px] font-black text-gray-900 dark:text-zinc-100">{ticketLabel(list[0].target, ticketNo.get(list[0].target.id))}</div>
            <CompareCard target={list[0].target} sources={groupSources(list, number)} ticketNo={ticketNo} />
          </div>
        )}
        renderSmall={(list) => (
          <SmallCard title={ticketLabel(list[0].target, ticketNo.get(list[0].target.id))} sub={`출처 ${groupSources(list, number).length}`}>
            <ConnectGrid small ticket={list[0].target} walls={wallsOf(list)} highlight={cellsOf(list)} />
          </SmallCard>
        )}
      />
    </div>
  );
}

/* ═══════════════════════════════ 입력된 복권 보기 (등록 날짜별) ═══════════════════════════════ */
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

/* ═══════════════════════════════ 2단계: 갇힌 복권 ═══════════════════════════════ */
function Step2Card({ item, ticketNo }: { item: Step2Ticket; ticketNo: Map<string, number> }) {
  return (
    <div className="bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/50 rounded-2xl p-3 flex flex-col gap-2.5">
      <div className="flex justify-between items-center">
        <span className="text-[13px] font-black text-gray-900 dark:text-zinc-100">{ticketLabel(item.target, ticketNo.get(item.target.id))}</span>
        <span className="text-[11px] font-black text-orange-500">갇힌 번호 {item.numbers.length}개</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-bold text-gray-500 dark:text-zinc-400">갇힌 번호</span>
        {item.numbers.map((n) => <Ball key={n} n={n} size="sm" ring />)}
      </div>
      {/* 💡 어디서 온 번호? → 출처 복권과 나란히 비교 */}
      <CompareCard target={item.target} sources={groupSources(item.hits)} ticketNo={ticketNo} />
    </div>
  );
}

export function Step2View({ step2Tickets, step1Count, ticketNo }: { step2Tickets: Step2Ticket[]; step1Count: number; ticketNo: Map<string, number> }) {
  if (step2Tickets.length === 0) return <Empty text="다른 복권의 연결 번호를 가둔 복권이 없습니다" />;
  return (
    <div className="flex flex-col gap-3">
      <SummaryBox>
        1단계에 갇혀 있던 번호가 다른 복권에서는 연결 번호가 된 복권이에요. (주황 = 그런 번호)
        <br />
        연결 복권 {step1Count}장 중 <span className="text-orange-500">{step2Tickets.length}장</span>
      </SummaryBox>
      <Legend items={[['bg-orange-500', '갇힌 번호'], ['bg-[#1E3A8A]', '연결(벽)'], ['bg-[#1E3A8A] ring-2 ring-orange-400', '출처에서의 그 번호']]} />
      <Pager
        items={step2Tickets}
        renderOne={(item) => <Step2Card key={item.target.id} item={item} ticketNo={ticketNo} />}
        renderSmall={(item) => (
          <SmallCard title={ticketLabel(item.target, ticketNo.get(item.target.id))} sub={`${item.numbers.length}개`}>
            <ConnectGrid small ticket={item.target} walls={item.walls} highlight={item.cells} />
            <div className="text-[10px] font-black text-orange-500 px-0.5 truncate">{item.numbers.map(pad2).join('·')}</div>
          </SmallCard>
        )}
      />
    </div>
  );
}

/* ═══════════════════════════════ 3단계: 갇힌 번호 (번호판) ═══════════════════════════════ */
export function Step3View({ step3, step4, ticketNo }: { step3: number[]; step4: DupNumber[]; ticketNo: Map<string, number> }) {
  const [selected, setSelected] = useState<number | null>(step4[0]?.number ?? null);
  if (step3.length === 0) return <Empty text="2단계에서 갇힌 번호가 없습니다" />;
  const countOf = new Map(step4.map((d) => [d.number, d.count]));
  const sel = step4.find((d) => d.number === selected);

  return (
    <div className="flex flex-col gap-3">
      <SummaryBox>
        갇힌 번호 <span className="text-orange-500">{step3.length}개</span>: {step3.map(pad2).join(' · ')}
      </SummaryBox>
      <p className="text-[11px] text-gray-500 dark:text-zinc-400 break-keep">
        주황 번호를 누르면 그 번호가 갇혀 있던 복권이 아래에 나와요. 작은 숫자는 갇힌 복권 수예요.
      </p>

      {/* 1~45 번호판 */}
      <div className="grid grid-cols-9 gap-1">
        {Array.from({ length: 45 }, (_, i) => i + 1).map((n) => {
          const c = countOf.get(n);
          const on = c !== undefined;
          const isSel = selected === n;
          return (
            <button
              key={n}
              disabled={!on}
              onClick={() => setSelected(n)}
              className={`relative aspect-square rounded-lg flex items-center justify-center text-[13px] font-black transition-all ${
                on
                  ? isSel
                    ? 'bg-orange-500 text-white ring-[3px] ring-orange-300 scale-105'
                    : 'bg-orange-500 text-white'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-300 dark:text-zinc-600'
              }`}
            >
              {pad2(n)}
              {on && (
                <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-[#1E3A8A] text-white text-[9px] font-black flex items-center justify-center">
                  {c}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {sel && <TrappedTicketsFor number={sel.number} hits={sel.hits} ticketNo={ticketNo} />}
    </div>
  );
}

/* ═══════════════════════════════ 4단계: 중복 순위 ═══════════════════════════════ */
export function Step4View({ step4, ticketNo }: { step4: DupNumber[]; ticketNo: Map<string, number> }) {
  const [open, setOpen] = useState<number | null>(null);
  if (step4.length === 0) return <Empty text="2단계에서 갇힌 번호가 없습니다" />;
  const max = step4[0].count;
  // 같은 장수는 같은 순위
  const ranks = step4.map((d) => 1 + step4.filter((x) => x.count > d.count).length);

  return (
    <div className="flex flex-col gap-2">
      <SummaryBox>
        가장 많이 갇힌 번호: <span className="text-orange-500">{step4.filter((d) => d.count === max).map((d) => `${pad2(d.number)}번`).join(', ')}</span> ({max}장)
      </SummaryBox>
      <p className="text-[11px] text-gray-500 dark:text-zinc-400 break-keep">번호를 누르면 그 번호가 갇혀 있던 복권이 나와요.</p>
      {step4.map((d, i) => (
        <div key={d.number} className="bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/50 rounded-xl">
          <button onClick={() => setOpen(open === d.number ? null : d.number)} className="w-full flex items-center gap-2.5 p-2.5 text-left">
            <span className={`w-7 text-[12px] font-black text-right ${ranks[i] <= 3 ? 'text-orange-500' : 'text-gray-400'}`}>{ranks[i]}위</span>
            <Ball n={d.number} />
            <div className="flex-1 h-3 rounded-full bg-gray-200 dark:bg-zinc-700 overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(d.count / max) * 100}%` }} />
            </div>
            <span className="text-[13px] font-black text-gray-900 dark:text-zinc-100 w-10 text-right">{d.count}장</span>
            {open === d.number ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </button>
          {open === d.number && (
            <div className="px-2.5 pb-2.5">
              <TrappedTicketsFor number={d.number} hits={d.hits} ticketNo={ticketNo} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════ 5단계: 추천 번호 (6개 조합 20세트) ═══════════════════════════════ */
export function Step5View({ combos, step3 }: { combos: Combo[]; step3: number[] }) {
  if (combos.length === 0) return <Empty text="추천할 번호가 부족합니다" />;
  const trapped = new Set(step3);
  const usage = new Map<number, number>();
  combos.forEach((c) => c.numbers.forEach((n) => usage.set(n, (usage.get(n) || 0) + 1)));
  const top = Array.from(usage.entries()).sort((a, b) => b[1] - a[1] || a[0] - b[0]);

  return (
    <div className="flex flex-col gap-3">
      <SummaryBox>
        4단계에서 많이 갇힌 번호일수록 점수를 높게 매겨, <span className="text-orange-500">점수 높은 순서로 6개 조합 {combos.length}세트</span>를 만들었어요.
      </SummaryBox>
      <Legend items={[['bg-white ring-[3px] ring-orange-500', '3단계 갇힌 번호']]} />

      {/* 20세트에 많이 들어간 번호 */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 mr-0.5">많이 쓰인 번호</span>
        {top.slice(0, 8).map(([n, c]) => (
          <span key={n} className="flex items-center gap-0.5">
            <Ball n={n} size="sm" ring={trapped.has(n)} />
            <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400">×{c}</span>
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        {combos.map((c, i) => (
          <div key={i} className="flex items-center gap-1.5 bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/50 rounded-xl px-2 py-2">
            <span className={`w-6 text-[12px] font-black text-right shrink-0 ${i < 3 ? 'text-orange-500' : 'text-gray-400'}`}>{i + 1}</span>
            <div className="flex gap-1 flex-1">
              {c.numbers.map((n) => <Ball key={n} n={n} size="sm" ring={trapped.has(n)} />)}
            </div>
            <span className="text-[10px] font-bold text-gray-400 shrink-0">{c.score}점</span>
          </div>
        ))}
      </div>
    </div>
  );
}