'use client';

import React, { useEffect, useState } from 'react';
import { PencilLine, Search } from 'lucide-react';
import { Ticket } from '../store/useTicketStore';
import { ticketToGrid } from '../lib/endDigitPattern';
import { analyzeTicket, Enclosure, TicketResult, OffMap, AddMap, cleanOff, cleanAdd } from '../lib/connectPattern';
import ConnectGrid, { ticketLabel, cellKey, numsText } from './ConnectGrid';
import { Pager, SmallCard } from './ConnectViews';

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

// 💡 카드 1장 = 복권 1장의 '끝수 하나' 패턴 (끝수가 여러 개면 카드가 여러 장)
type CardItem = TicketResult & { all: Enclosure[]; part?: { i: number; n: number } };

// 💡 1단계: 연결 패턴 보기 (벽 번호 선택 해제 · 직접 연결 · 적용)
export default function ConnectStep1({
  roundTickets, ticketNo, step1, minLen, appliedOff, appliedAdd, isNew, onApply, onDirtyChange,
}: {
  roundTickets: Ticket[];
  ticketNo: Map<string, number>;
  step1: TicketResult[];
  minLen: number;
  appliedOff: OffMap;
  appliedAdd: AddMap;
  isNew: (t: Ticket) => boolean;
  onApply: (off: OffMap, add: AddMap) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [draftOff, setDraftOff] = useState<OffMap>(appliedOff); // 💡 아직 적용 안 한 선택 해제
  const [draftAdd, setDraftAdd] = useState<AddMap>(appliedAdd); // 💡 아직 적용 안 한 직접 연결
  const [editId, setEditId] = useState<string | null>(null);       // 직접 연결 중인 복권
  const [editDigit, setEditDigit] = useState<number | null>(null); // 직접 연결할 끝수
  const [showAll, setShowAll] = useState(false);                   // 연결 없는 복권도 보기
  const [page, setPage] = useState<{ mode: 'one' | 'six'; index: number }>({ mode: 'one', index: 0 }); // 1장씩 / 6장씩

  const isDirty =
    JSON.stringify(cleanOff(draftOff)) !== JSON.stringify(appliedOff) ||
    JSON.stringify(cleanAdd(draftAdd)) !== JSON.stringify(appliedAdd);
  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  // 💡 [적용]·[모두 되돌리기] 후: 보던 페이지는 그대로 두고, 수정 내용만 새로 맞춤
  const [seen, setSeen] = useState({ appliedOff, appliedAdd });
  if (seen.appliedOff !== appliedOff || seen.appliedAdd !== appliedAdd) {
    setSeen({ appliedOff, appliedAdd });
    setDraftOff(appliedOff);
    setDraftAdd(appliedAdd);
    setEditId(null);
  }

  const toggleOff = (ticketId: string, k: string) =>
    setDraftOff((prev) => {
      const cur = prev[ticketId] || [];
      return { ...prev, [ticketId]: cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k] };
    });
  const setAdd = (ticketId: string, k: string, digit: number | null) =>
    setDraftAdd((prev) => {
      const cur = { ...(prev[ticketId] || {}) };
      if (digit === null) delete cur[k];
      else cur[k] = digit;
      return { ...prev, [ticketId]: cur };
    });

  // 칸을 눌렀을 때: 직접 연결한 칸 → 취소 / 벽·해제 칸 → 해제·선택 / 그 밖의 칸 → (직접 연결 중이면) 벽으로 추가
  const tapCell = (ticketId: string, k: string, isWall: boolean) => {
    if (draftAdd[ticketId]?.[k] !== undefined) return setAdd(ticketId, k, null);
    if (isWall || (draftOff[ticketId] || []).includes(k)) return toggleOff(ticketId, k);
    if (editId !== ticketId) return;
    if (editDigit === null) {
      alert('먼저 위에서 연결할 끝수(0~9)를 골라 주세요.');
      return;
    }
    setAdd(ticketId, k, editDigit);
  };

  const toggleEdit = (ticketId: string, enclosures: Enclosure[]) => {
    if (editId === ticketId) return setEditId(null);
    setEditId(ticketId);
    setEditDigit(enclosures.length > 0 ? enclosures[0].digit : null);
  };

  const hasOff = (t: Ticket) => (appliedOff[t.id] || []).length > 0 || (draftOff[t.id] || []).length > 0;
  const hasAdd = (t: Ticket) => Object.keys(appliedAdd[t.id] || {}).length > 0 || Object.keys(draftAdd[t.id] || {}).length > 0;

  // 💡 연결이 없는 복권도 '연결 없음'으로 보여줌 (수정한 복권, 직접 연결 중인 복권, [연결 없는 복권도 보기])
  const extra: TicketResult[] = roundTickets
    .filter((t) => !step1.some((s) => s.ticket.id === t.id))
    .filter((t) => showAll || editId === t.id || hasOff(t) || hasAdd(t))
    .map((t) => ({ ticket: t, enclosures: [] }));
  // 💡 한 복권에 끝수가 2개 이상이면 끝수마다 카드를 따로 만듦 (패턴이 서로 겹쳐 보이지 않게)
  const list: CardItem[] = [
    ...step1.flatMap((s) =>
      s.enclosures.map((e, i): CardItem => ({
        ticket: s.ticket,
        enclosures: [e],
        all: s.enclosures,
        part: s.enclosures.length > 1 ? { i, n: s.enclosures.length } : undefined,
      }))
    ),
    ...extra.map((x): CardItem => ({ ...x, all: [] })),
  ].sort(
    (a, b) => (ticketNo.get(a.ticket.id) || 0) - (ticketNo.get(b.ticket.id) || 0) || (a.part?.i || 0) - (b.part?.i || 0)
  );
  const hiddenCount = roundTickets.length - step1.length;

  // 💡 복권 1장 카드 (1장씩 보기)
  const renderCard = ({ ticket, enclosures, all, part }: CardItem) => {
    const editing = editId === ticket.id;
    const isFirst = !part || part.i === 0;
    // 💡 선택 해제 전 원래 벽 중, 누르지 않은 번호는 화면에 그대로 유지 (분석에는 반영 안 됨)
    const nowWalls = new Set(all.flatMap((e) => e.walls.map(cellKey)));
    const offNow = new Set(appliedOff[ticket.id] || []);
    const keepAll = offNow.size === 0
      ? []
      : analyzeTicket(ticket, minLen, undefined, undefined, appliedAdd[ticket.id])
          .flatMap((e) => e.walls)
          .filter((p) => !nowWalls.has(cellKey(p)) && !offNow.has(cellKey(p)));
    const lostDigits = Array.from(new Set(keepAll.map((p) => p.number % 10)))
      .filter((d) => !all.some((e) => e.digit === d))
      .sort((a, b) => a - b);
    // 이 카드의 끝수 벽 + (첫 카드에만) 벽이 열려 빠진 끝수의 벽
    const keepWalls = keepAll.filter(
      (p) => enclosures.some((e) => e.digit === p.number % 10) || (isFirst && lostDigits.includes(p.number % 10))
    );
    // 해제한 칸이 이 복권 표 안의 번호인지 (안내 문구용)
    const grid = ticketToGrid(ticket);
    const offInTicket = [...offNow].some((k) => {
      const [r, c] = k.split(',').map(Number);
      return grid[r]?.[c] != null;
    });

    return (
      <div
        key={ticket.id}
        className={`bg-gray-50 dark:bg-zinc-800/60 border rounded-2xl p-3 flex flex-col gap-2.5 ${
          editing ? 'border-orange-400 ring-1 ring-orange-400' : 'border-gray-200 dark:border-zinc-700/50'
        }`}
      >
        <div className="flex justify-between items-center gap-2">
          <span className="text-[13px] font-black text-gray-900 dark:text-zinc-100 flex items-center gap-1.5">
            {ticketLabel(ticket, ticketNo.get(ticket.id))}
            {part && <span className="px-1.5 py-0.5 rounded bg-[#1E3A8A] text-white text-[10px] font-black">끝{enclosures[0].digit} · {part.i + 1}/{part.n}</span>}
            {isNew(ticket) && <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-black">NEW</span>}
          </span>
          <div className="flex items-center gap-1.5">
            {enclosures.length === 0 ? (
              <span className="px-1.5 py-0.5 rounded bg-gray-400 dark:bg-zinc-600 text-white text-[10px] font-black">연결 없음</span>
            ) : (
              <span className="text-[11px] font-bold text-amber-500">끝수 {enclosures[0].digit} 연결</span>
            )}
            <button
              onClick={() => toggleEdit(ticket.id, enclosures)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] font-bold border ${
                editing ? 'bg-orange-500 text-white border-orange-500' : 'bg-white dark:bg-zinc-900 text-orange-500 border-orange-400/60'
              }`}
            >
              <PencilLine size={11} /> {editing ? '닫기' : '직접 연결'}
            </button>
          </div>
        </div>

        {/* 💡 직접 연결: 끝수 고르기 */}
        {editing && (
          <div className="rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-400/40 p-2.5 flex flex-col gap-2">
            <div className="text-[11px] font-bold text-orange-700 dark:text-orange-300 break-keep">
              ① 연결할 끝수를 고르고 → ② 벽으로 넣을 번호를 누르세요. 다시 누르면 취소돼요.
            </div>
            <div className="grid grid-cols-10 gap-1">
              {DIGITS.map((d) => (
                <button
                  key={d}
                  onClick={() => setEditDigit(d)}
                  className={`py-1.5 rounded-md text-[12px] font-black border ${
                    editDigit === d ? 'bg-orange-500 text-white border-orange-500' : 'bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 border-gray-200 dark:border-zinc-700'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        <ConnectGrid
          ticket={ticket}
          walls={[...enclosures.flatMap((e) => e.walls), ...keepWalls]}
          trapped={enclosures.flatMap((e) => e.cells)}
          off={draftOff[ticket.id] || []}
          add={draftAdd[ticket.id] || {}}
          editing={editing}
          editDigit={editDigit}
          onTap={(k, isWall) => tapCell(ticket.id, k, isWall)}
        />
        {enclosures.length === 0 && offInTicket && (
          <div className="text-[11px] text-gray-500 dark:text-zinc-400 break-keep">
            선택 해제한 번호 때문에 벽이 열려 분석에서 빠졌어요. 점선 칸을 누르면 다시 선택돼요.
          </div>
        )}
        {enclosures.length > 0 && isFirst && lostDigits.length > 0 && (
          <div className="text-[11px] text-gray-500 dark:text-zinc-400 break-keep">
            끝수 {lostDigits.join(', ')}: 선택 해제로 벽이 열려 분석에서 빠졌어요. 점선 칸을 누르면 다시 선택돼요.
          </div>
        )}

        <div className="flex flex-col gap-2 text-[12px]">
          {enclosures.map((e, i) => {
            const addedHere = e.walls.filter((p) => appliedAdd[ticket.id]?.[cellKey(p)] !== undefined).length;
            return (
              <div key={i} className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm shrink-0 bg-[#1E3A8A]" />
                  <span className="font-bold text-gray-900 dark:text-zinc-100 shrink-0">끝수 {e.digit} 연결 {e.walls.length}개</span>
                  <span className="text-[11px] text-gray-500 dark:text-zinc-400 truncate">({numsText(e.walls)})</span>
                  {addedHere > 0 && <span className="text-[10.5px] text-orange-500 font-bold shrink-0">직접 {addedHere}</span>}
                </div>
                <div className="flex items-center gap-2 pl-5">
                  <span className="w-3 h-3 rounded-sm shrink-0 bg-yellow-300" />
                  <span className="font-bold text-gray-900 dark:text-zinc-100">갇힌 {e.cells.length}개: {numsText(e.cells)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed break-keep">
        끝자리가 같은 번호가 벽처럼 이어져 한 구역을 완전히 막은 복권이에요. 표 모서리 칸 1개를 대각선 2개가 막은 경우도 포함해요. 1장씩 보기에서 벽 번호를 누르면 선택 해제, [직접 연결]로 벽을 추가한 뒤 [적용]을 누르세요.
      </p>

      {hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className={`self-start flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${
            showAll ? 'bg-orange-500 text-white border-orange-500' : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-300 border-gray-300 dark:border-zinc-600'
          }`}
        >
          <span className={`w-3.5 h-3.5 rounded-full border-2 ${showAll ? 'bg-white border-white' : 'border-gray-400'}`} />
          연결 없는 복권도 보기 ({hiddenCount}장)
        </button>
      )}

      {list.length === 0 ? (
        <div className="flex flex-col items-center text-center py-10 gap-2 text-gray-500 dark:text-zinc-400">
          <Search size={28} className="text-gray-300 dark:text-zinc-600" />
          <p className="text-sm font-bold">연결된 복권이 없습니다</p>
          <p className="text-[11px] break-keep">복권이 더 등록되면 자동으로 다시 분석돼요.</p>
        </div>
      ) : (
        <Pager
          items={list}
          page={page}
          setPage={setPage}
          renderOne={renderCard}
          renderSmall={({ ticket, enclosures, part }) => (
            <SmallCard
              title={ticketLabel(ticket, ticketNo.get(ticket.id))}
              sub={enclosures.length > 0 ? `끝${enclosures[0].digit}${part ? ` (${part.i + 1}/${part.n})` : ''}` : '연결 없음'}
            >
              <ConnectGrid small ticket={ticket} walls={enclosures.flatMap((e) => e.walls)} trapped={enclosures.flatMap((e) => e.cells)} />
            </SmallCard>
          )}
        />
      )}

      {/* 💡 적용 / 취소 (바꾼 것이 있을 때만) */}
      {isDirty && (
        <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-white/95 dark:bg-zinc-900/95 border-t border-gray-200 dark:border-zinc-700 grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setDraftOff(appliedOff);
              setDraftAdd(appliedAdd);
              setEditId(null);
            }}
            className="py-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 text-sm font-bold active:scale-95"
          >
            취소
          </button>
          <button
            onClick={() => onApply(cleanOff(draftOff), cleanAdd(draftAdd))}
            className="py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold active:scale-95"
          >
            적용
          </button>
        </div>
      )}
    </div>
  );
}