// 💡 연결 분석 1단계의 '직접 수정 내용' 저장 (회차별, 이 기기 + 연동)
// 선택 해제 · 직접 연결 · 갇힌 쪽 바꾸기 + 마지막으로 수정한 시각
import { OffMap, AddMap, FlipMap, cleanOff, cleanAdd, cleanFlip } from './connectPattern';
import type { EditsDoc } from './syncMerge';

const offKey = (round: number | string) => `lotto-connect-off-${round}`;
const addKey = (round: number | string) => `lotto-connect-add-${round}`;
const flipKey = (round: number | string) => `lotto-connect-flip-${round}`;
const timeKey = (round: number | string) => `lotto-connect-time-${round}`; // 마지막으로 수정한 시각

// 수정 내용이 바뀌면 알리는 신호 (local: 이 기기에서 수정 → 연동해야 함 / remote: 연동으로 바뀜 → 화면 다시 읽기)
export const EDITS_LOCAL_EVENT = 'lotto-edits-local';
export const EDITS_REMOTE_EVENT = 'lotto-edits-remote';

const readJson = <T,>(k: string): T | null => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
};
const writeJson = (k: string, value: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(value));
  } catch {
    /* 저장이 안 되는 환경이면 무시 */
  }
};

export const readEdits = (round: number | string): EditsDoc => {
  const off = cleanOff(readJson<OffMap>(offKey(round)) || {});
  const add = cleanAdd(readJson<AddMap>(addKey(round)) || {});
  const flip = cleanFlip(readJson<FlipMap>(flipKey(round)) || {});
  const saved = readJson<number>(timeKey(round));
  // 이 업데이트 전에 만든 수정은 시각이 없으므로 1로 봄
  const hasAny = Object.keys(off).length + Object.keys(add).length + Object.keys(flip).length > 0;
  return { off, add, flip, time: saved ?? (hasAny ? 1 : 0) };
};

// 이 기기에서 [적용]했을 때
export const saveEditsLocal = (round: number, off: OffMap, add: AddMap, flip: FlipMap) => {
  writeJson(offKey(round), off);
  writeJson(addKey(round), add);
  writeJson(flipKey(round), flip);
  writeJson(timeKey(round), Date.now());
  window.dispatchEvent(new Event(EDITS_LOCAL_EVENT));
};

// 연동으로 받은 내용을 저장할 때 (시각도 그대로)
export const saveEditsFromSync = (round: string, doc: EditsDoc) => {
  writeJson(offKey(round), cleanOff(doc.off || {}));
  writeJson(addKey(round), cleanAdd(doc.add || {}));
  writeJson(flipKey(round), cleanFlip(doc.flip || {}));
  writeJson(timeKey(round), doc.time);
  window.dispatchEvent(new Event(EDITS_REMOTE_EVENT));
};

// 이 기기에 수정 내용이 저장된 회차 목록
export const listEditRounds = (): string[] => {
  const rounds = new Set<string>();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const m = /^lotto-connect-(?:off|add|flip|time)-(\d+)$/.exec(localStorage.key(i) || '');
      if (m) rounds.add(m[1]);
    }
  } catch {
    /* 무시 */
  }
  return Array.from(rounds);
};