// 💡 PC ↔ 휴대폰 연동: 이 기기의 내용과 인터넷 저장소(Firebase)의 내용을 합치는 규칙
// (Firebase와 상관없는 순수 계산이라 따로 검증할 수 있음)
import type { Ticket } from '../store/useTicketStore';
import { syncKeyOf } from '../store/useTicketStore';
import type { OffMap, AddMap, FlipMap } from './connectPattern';

// 저장소의 복권 1건: 살아 있는 복권 또는 삭제 기록
export type RemoteTicket = { ticket: Ticket | null; deleted: boolean; time: number };
// 저장소의 회차별 직접 수정 내용
export type EditsDoc = { off: OffMap; add: AddMap; flip: FlipMap; time: number };

/**
 * 복권 합치기 규칙 (같은 복권 = 같은 연동 키)
 * 1) 양쪽 다 살아 있으면 → 저장소 것을 그대로 씀 (먼저 올라간 것이 기준, 이 기기 것은 번호표만 바꿈)
 * 2) 한쪽이 삭제 기록이면 → 더 나중에 일어난 일이 이김 (등록 시각 vs 삭제 시각, 같으면 저장소 우선)
 * 3) 한쪽에만 있으면 → 그대로 반대쪽에 채움
 */
export const mergeTickets = (
  localTickets: Ticket[],
  localDeleted: Record<string, number>,
  remote: Map<string, RemoteTicket>
) => {
  const local = new Map<string, Ticket>();
  localTickets.forEach((t) => {
    const k = syncKeyOf(t);
    const prev = local.get(k);
    if (!prev || t.createdAt < prev.createdAt) local.set(k, t); // 이 기기 안의 중복은 먼저 등록한 것만
  });

  const tickets: Ticket[] = [];
  const deleted: Record<string, number> = {};
  const uploads: { key: string; doc: RemoteTicket }[] = [];
  const remap: Record<string, string> = {}; // 이 기기 복권 번호표 → 저장소 번호표

  const keys = new Set<string>([...local.keys(), ...Object.keys(localDeleted), ...remote.keys()]);
  keys.forEach((k) => {
    const L = local.get(k);
    const LD = localDeleted[k];
    const R = remote.get(k);

    // 이 기기의 상태 (살아 있음 / 삭제됨 / 없음)
    const localAlive = L ? L.createdAt : null;
    const localDel = !L && LD !== undefined ? LD : null;

    if (R && !R.deleted && R.ticket) {
      // 저장소: 살아 있음
      if (localDel !== null && localDel > R.time) {
        deleted[k] = localDel; // 이 기기에서 나중에 지움 → 저장소도 삭제
        uploads.push({ key: k, doc: { ticket: null, deleted: true, time: localDel } });
        return;
      }
      tickets.push(R.ticket);
      if (L && L.id !== R.ticket.id) remap[L.id] = R.ticket.id;
      // 이 기기의 같은 복권 중복(다른 번호표)도 저장소 번호표로
      localTickets.forEach((t) => {
        if (t.id !== R.ticket!.id && syncKeyOf(t) === k) remap[t.id] = R.ticket!.id;
      });
      return;
    }
    if (R && R.deleted) {
      // 저장소: 삭제됨
      if (localAlive !== null && localAlive > R.time) {
        tickets.push(L!); // 이 기기에서 나중에 다시 등록 → 저장소에 다시 올림
        uploads.push({ key: k, doc: { ticket: L!, deleted: false, time: localAlive } });
        return;
      }
      deleted[k] = Math.max(R.time, LD ?? 0);
      return;
    }
    // 저장소에 없음
    if (L) {
      tickets.push(L);
      uploads.push({ key: k, doc: { ticket: L, deleted: false, time: localAlive! } });
    } else if (localDel !== null) {
      deleted[k] = localDel;
      uploads.push({ key: k, doc: { ticket: null, deleted: true, time: localDel } });
    }
  });

  tickets.sort((a, b) => a.createdAt - b.createdAt);
  const sameTickets =
    tickets.length === localTickets.length &&
    tickets.every((t, i) => {
      const o = [...localTickets].sort((a, b) => a.createdAt - b.createdAt)[i];
      return o && o.id === t.id && o.createdAt === t.createdAt;
    });
  const sameDeleted = JSON.stringify(sortObj(deleted)) === JSON.stringify(sortObj(localDeleted));
  return { tickets, deleted, uploads, remap, changed: !sameTickets || !sameDeleted };
};

const sortObj = <T,>(o: Record<string, T>) => {
  const out: Record<string, T> = {};
  Object.keys(o).sort().forEach((k) => (out[k] = o[k]));
  return out;
};

// 💡 직접 수정 내용의 복권 번호표 바꾸기 (합칠 때 같은 복권의 번호표가 바뀐 경우)
export const remapEdits = (e: { off: OffMap; add: AddMap; flip: FlipMap }, remap: Record<string, string>) => {
  const mv = <T,>(m: Record<string, T>, merge: (a: T, b: T) => T): Record<string, T> => {
    const out: Record<string, T> = {};
    Object.keys(m).forEach((id) => {
      const to = remap[id] || id;
      out[to] = out[to] !== undefined ? merge(out[to], m[id]) : m[id];
    });
    return out;
  };
  return {
    off: mv(e.off, (a, b) => Array.from(new Set([...a, ...b]))),
    add: mv(e.add, (a, b) => ({ ...a, ...b })),
    flip: mv(e.flip, (a, b) => Array.from(new Set([...a, ...b]))),
  };
};

// 키 순서와 상관없이 같은 내용이면 같은 글자가 되도록
const stable = (v: unknown): string =>
  Array.isArray(v)
    ? `[${[...v].map(stable).sort().join(',')}]`
    : v && typeof v === 'object'
    ? `{${Object.keys(v).sort().map((k) => `${k}:${stable((v as Record<string, unknown>)[k])}`).join(',')}}`
    : JSON.stringify(v);

const isEmptyEdits = (e: { off: OffMap; add: AddMap; flip: FlipMap }) =>
  Object.keys(e.off).length + Object.keys(e.add).length + Object.keys(e.flip).length === 0;

/**
 * 직접 수정 내용 합치기 (회차별): 나중에 수정한 쪽이 이김, 같으면 저장소 우선
 * (이 업데이트 전에 만든 수정은 시각이 없으므로 1로 봄 → 저장소에 없으면 올림)
 */
export const mergeEdits = (local: Map<string, EditsDoc>, remote: Map<string, EditsDoc>) => {
  const writeLocal: { round: string; doc: EditsDoc }[] = [];
  const uploads: { round: string; doc: EditsDoc }[] = [];
  new Set([...local.keys(), ...remote.keys()]).forEach((round) => {
    const L = local.get(round);
    const R = remote.get(round);
    if (L && (!R || L.time > R.time)) {
      if (!R && isEmptyEdits(L)) return;
      uploads.push({ round, doc: L });
    } else if (R && (!L || R.time >= L.time)) {
      if (!L || stable(L) !== stable(R)) writeLocal.push({ round, doc: R });
    }
  });
  return { writeLocal, uploads };
};