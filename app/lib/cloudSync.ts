// 💡 PC ↔ 휴대폰 자동 연동 (Firebase)
// 로그인하면: 저장소의 복권·직접 수정 내용을 지켜보다가 바뀌면 이 기기에 합치고,
//            이 기기에서 바뀐 것은 저장소에 올림
import { create } from 'zustand';
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
} from 'firebase/auth';
import { collection, doc, onSnapshot, writeBatch } from 'firebase/firestore';
import { getFirebase, firebaseReady } from './firebase';
import { useTicketStore } from '../store/useTicketStore';
import { mergeTickets, mergeEdits, remapEdits, RemoteTicket, EditsDoc } from './syncMerge';
import { readEdits, saveEditsFromSync, listEditRounds, EDITS_LOCAL_EVENT } from './editsStore';

type SyncState = 'off' | 'connecting' | 'ok' | 'error';
export const useSyncStatus = create<{
  email: string | null;
  state: SyncState;
  lastSync: number | null;
  error: string | null;
  cloudCount: number; // 저장소에 있는 복권 수 (삭제 기록 제외)
}>(() => ({ email: null, state: 'off', lastSync: null, error: null, cloudCount: 0 }));

let started = false;
let uid: string | null = null;
let stopFns: (() => void)[] = [];
let remoteTickets = new Map<string, RemoteTicket>();
let remoteEdits = new Map<string, EditsDoc>();
let ready = { tickets: false, edits: false };
let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;
let again = false;

const setStatus = (p: Partial<ReturnType<typeof useSyncStatus.getState>>) => useSyncStatus.setState(p);

// 오류 문장을 쉬운 말로
const friendly = (e: unknown) => {
  const code = (e as { code?: string })?.code || '';
  if (code.includes('invalid-email')) return '이메일 형식이 올바르지 않아요.';
  if (code.includes('weak-password')) return '비밀번호는 6자 이상이어야 해요.';
  if (code.includes('email-already-in-use') || code.includes('invalid-credential') || code.includes('wrong-password'))
    return '비밀번호가 맞지 않아요. 처음 가입할 때 쓴 비밀번호를 입력해 주세요.';
  if (code.includes('too-many-requests')) return '시도가 너무 많아요. 잠시 후 다시 해 주세요.';
  if (code.includes('network')) {
    // 자세한 원인(있으면)을 괄호 안에 함께 보여줌 → 문제 찾기용
    const detail = (e as { customData?: { message?: string } })?.customData?.message;
    return `인터넷 연결을 확인해 주세요.${detail ? ` (${detail})` : ''}`;
  }
  if (code.includes('permission-denied')) return '저장소 권한이 없어요. Firebase 보안 규칙을 확인해 주세요.';
  return e instanceof Error ? e.message : '알 수 없는 오류가 났어요.';
};

// 💡 앱을 열 때 한 번 호출: 로그인 상태를 지켜보다가 로그인되면 연동 시작
export const startCloudSync = () => {
  if (started || !firebaseReady || typeof window === 'undefined') return;
  started = true;
  const { auth } = getFirebase();
  onAuthStateChanged(auth, (user) => {
    stop();
    if (user) {
      setStatus({ email: user.email, state: 'connecting', error: null });
      begin(user.uid);
    } else {
      setStatus({ email: null, state: 'off', error: null, cloudCount: 0 });
    }
  });
};

// 💡 로그인 (처음 쓰는 이메일이면 자동 가입)
export const loginOrSignup = async (email: string, password: string) => {
  const { auth } = getFirebase();
  try {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  } catch (e) {
    const code = (e as { code?: string })?.code || '';
    // 가입된 적 없는 이메일이면 새로 가입 (비밀번호가 틀린 경우에도 같은 오류가 나므로 가입을 시도해 봄)
    if (code.includes('invalid-credential') || code.includes('user-not-found')) {
      try {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
        return;
      } catch (e2) {
        throw new Error(friendly(e2));
      }
    }
    throw new Error(friendly(e));
  }
};

export const logout = async () => {
  const { auth } = getFirebase();
  await signOut(auth); // 이 기기의 복권은 그대로 남음
};

// 지금 바로 맞추기
export const syncNow = () => schedule(0);

const stop = () => {
  stopFns.forEach((f) => f());
  stopFns = [];
  uid = null;
  remoteTickets = new Map();
  remoteEdits = new Map();
  ready = { tickets: false, edits: false };
};

const begin = (userId: string) => {
  uid = userId;
  const { db } = getFirebase();
  const onErr = (e: unknown) => setStatus({ state: 'error', error: friendly(e) });

  stopFns.push(
    onSnapshot(
      collection(db, 'users', userId, 'tickets'),
      (snap) => {
        remoteTickets = new Map(snap.docs.map((d) => [d.id, d.data() as RemoteTicket]));
        ready.tickets = true;
        setStatus({ cloudCount: Array.from(remoteTickets.values()).filter((r) => !r.deleted).length });
        schedule();
      },
      onErr
    )
  );
  stopFns.push(
    onSnapshot(
      collection(db, 'users', userId, 'edits'),
      (snap) => {
        remoteEdits = new Map(snap.docs.map((d) => [d.id, d.data() as EditsDoc]));
        ready.edits = true;
        schedule();
      },
      onErr
    )
  );
  // 이 기기에서 복권이 바뀌거나 직접 수정을 적용하면 올리기
  stopFns.push(useTicketStore.subscribe(() => schedule()));
  const onLocalEdits = () => schedule();
  window.addEventListener(EDITS_LOCAL_EVENT, onLocalEdits);
  stopFns.push(() => window.removeEventListener(EDITS_LOCAL_EVENT, onLocalEdits));
};

const schedule = (ms = 400) => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(run, ms);
};

const run = async () => {
  if (!uid || !ready.tickets || !ready.edits) return;
  if (running) {
    again = true;
    return;
  }
  running = true;
  try {
    const { db } = getFirebase();
    const me = uid;

    // ① 복권 합치기
    const st = useTicketStore.getState();
    const m = mergeTickets(st.tickets, st.deleted, remoteTickets);
    if (m.changed) st.replaceAll(m.tickets, m.deleted);

    // ② 번호표가 바뀐 복권이 있으면 직접 수정 내용도 같이 바꿈
    const remapped = Object.keys(m.remap).length > 0;
    const localEdits = new Map<string, EditsDoc>();
    listEditRounds().forEach((round) => {
      const e = readEdits(round);
      if (remapped) {
        const moved = remapEdits(e, m.remap);
        const doc = { ...moved, time: e.time };
        saveEditsFromSync(round, doc);
        localEdits.set(round, doc);
      } else localEdits.set(round, e);
    });

    // ③ 직접 수정 내용 합치기
    const me2 = mergeEdits(localEdits, remoteEdits);
    me2.writeLocal.forEach(({ round, doc: d }) => saveEditsFromSync(round, d));

    // ④ 저장소에 올리기 (한 번에 최대 400건씩)
    const ops: { path: string[]; data: object }[] = [
      ...m.uploads.map((u) => ({ path: ['users', me, 'tickets', u.key], data: u.doc })),
      ...me2.uploads.map((u) => ({ path: ['users', me, 'edits', u.round], data: u.doc })),
    ];
    for (let i = 0; i < ops.length; i += 400) {
      const batch = writeBatch(db);
      ops.slice(i, i + 400).forEach((o) => {
        const [a, b, c, d] = o.path;
        batch.set(doc(db, a, b, c, d), o.data);
      });
      await batch.commit();
    }
    if (uid === me) setStatus({ state: 'ok', lastSync: Date.now(), error: null });
  } catch (e) {
    setStatus({ state: 'error', error: friendly(e) });
  } finally {
    running = false;
    if (again) {
      again = false;
      schedule();
    }
  }
};