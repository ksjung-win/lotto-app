// 💡 연결 분석 자동 검증: 계산 결과를 '다른 방법'으로 다시 확인해서 틀린 곳을 찾아냄
import type { Ticket } from '../store/useTicketStore';
import { ticketToGrid } from './endDigitPattern';
import { ConnectResult, OffMap, AddMap, cellName } from './connectPattern';

export type VerifyReport = {
  ok: boolean;
  patterns: number;   // 1단계 패턴 수
  links: number;      // 2단계 건수
  errors: string[];   // 틀린 곳 (사람이 읽을 수 있는 문장)
};

const N4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const N8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const k = (r: number, c: number) => `${r},${c}`;

export const verifyConnect = (
  tickets: Ticket[], minWall: number, result: ConnectResult, offMap: OffMap = {}, addMap: AddMap = {}
): VerifyReport => {
  const errors: string[] = [];
  const no = new Map(tickets.map((t, i) => [t.id, i + 1]));
  const err = (msg: string) => {
    if (errors.length < 20) errors.push(msg);
  };

  /* ─────────── 1단계: 패턴 하나하나가 규칙에 맞는지 ─────────── */
  let patterns = 0;
  result.step1.forEach(({ ticket, enclosures }) => {
    const grid = ticketToGrid(ticket);
    const R = grid.length;
    const C = grid[0].length;
    const off = new Set(offMap[ticket.id] || []);
    const add = addMap[ticket.id] || {};
    const tag = `${no.get(ticket.id)}번 복권`;

    enclosures.forEach((e) => {
      patterns++;
      const d = e.digit;
      const cellSet = new Set(e.cells.map((p) => k(p.row, p.col)));
      // 이 끝수로 벽이 될 수 있는 칸 (선택 해제·직접 연결 반영)
      const isDigitWall = (r: number, c: number) => {
        const n = grid[r][c];
        if (n === null) return false;
        const a = add[k(r, c)];
        return a !== undefined ? a === d : n % 10 === d && !off.has(k(r, c));
      };

      // ① 벽 번호가 모두 그 끝수인지
      e.walls.forEach((w) => {
        if (!isDigitWall(w.row, w.col)) err(`${tag} 끝${d}: ${cellName(w.row, w.col)} ${w.number}은(는) 끝수 ${d} 벽이 될 수 없음`);
      });
      // ② 벽이 갇힌 칸에 맞닿아 있는지 (꼬리 벽이 없는지)
      e.walls.forEach((w) => {
        if (!N8.some(([dy, dx]) => cellSet.has(k(w.row + dy, w.col + dx))))
          err(`${tag} 끝${d}: 벽 ${cellName(w.row, w.col)}이(가) 갇힌 구역과 떨어져 있음`);
      });
      // ③ 벽 개수 (모서리 예외 포함)
      const corner = e.walls.length === 2 && e.cells.length === 1 &&
        (e.cells[0].row === 0 || e.cells[0].row === R - 1) && (e.cells[0].col === 0 || e.cells[0].col === C - 1);
      if (e.walls.length < minWall && !corner) err(`${tag} 끝${d}: 벽 ${e.walls.length}개 < 최소 ${minWall}개`);

      // ④ 완전히 막혔는지: 갇힌 칸에서 출발해 '이 끝수 벽'을 넘지 않고 퍼져 봄
      //    (갇힌 구역 안의 섬 번호는 갇힌 칸이므로 지나갈 수 있음)
      const blocked = (r: number, c: number) => isDigitWall(r, c) && !cellSet.has(k(r, c));
      const seen = new Set<string>(cellSet);
      const stack = e.cells.map((p) => [p.row, p.col]);
      while (stack.length > 0) {
        const [y, x] = stack.pop()!;
        N4.forEach(([dy, dx]) => {
          const ny = y + dy;
          const nx = x + dx;
          if (ny < 0 || ny >= R || nx < 0 || nx >= C || seen.has(k(ny, nx)) || blocked(ny, nx)) return;
          seen.add(k(ny, nx));
          stack.push([ny, nx]);
        });
      }
      const leaked = Array.from(seen).filter((key) => {
        const [r, c] = key.split(',').map(Number);
        return grid[r][c] !== null && !cellSet.has(key);
      });
      if (leaked.length > 0) {
        const [r, c] = leaked[0].split(',').map(Number);
        err(`${tag} 끝${d}: 갇힌 구역이 열려 있음 (${cellName(r, c)} 쪽으로 이어짐)`);
      }

      // ⑤ 작은 쪽이 갇힌 쪽인지: 갇힌 구역 바깥에 더 크거나 같은 구역이 있어야 함
      const outsideSeen = new Set<string>();
      let biggestOutside = 0;
      for (let r = 0; r < R; r++)
        for (let c = 0; c < C; c++) {
          const s = k(r, c);
          if (seen.has(s) || outsideSeen.has(s) || blocked(r, c) || isDigitWall(r, c)) continue;
          let size = 0;
          const st = [[r, c]];
          outsideSeen.add(s);
          while (st.length > 0) {
            const [y, x] = st.pop()!;
            size++;
            N4.forEach(([dy, dx]) => {
              const ny = y + dy;
              const nx = x + dx;
              const nk = k(ny, nx);
              if (ny < 0 || ny >= R || nx < 0 || nx >= C || seen.has(nk) || outsideSeen.has(nk) || isDigitWall(ny, nx)) return;
              outsideSeen.add(nk);
              st.push([ny, nx]);
            });
          }
          biggestOutside = Math.max(biggestOutside, size);
        }
      // 갇힌 구역이 여러 조각이면 조각마다 비교 (섬 번호는 처음에 벽이었으므로 크기 비교에서 뺌)
      const left = new Set(Array.from(seen).filter((key) => {
        const [r, c] = key.split(',').map(Number);
        return !isDigitWall(r, c);
      }));
      let biggestInside = 0;
      left.forEach((start) => {
        if (!left.has(start)) return;
        let size = 0;
        const st = [start];
        left.delete(start);
        while (st.length > 0) {
          const [y, x] = st.pop()!.split(',').map(Number);
          size++;
          N4.forEach(([dy, dx]) => {
            const nk = k(y + dy, x + dx);
            if (left.has(nk)) {
              left.delete(nk);
              st.push(nk);
            }
          });
        }
        biggestInside = Math.max(biggestInside, size);
      });
      if (biggestOutside < biggestInside || (biggestOutside === biggestInside && !e.tie))
        err(`${tag} 끝${d}: 갇힌 쪽(${biggestInside}칸)이 바깥(${biggestOutside}칸)보다 작지 않음`);
    });
  });

  /* ─────────── 2단계: 처음부터 다시 맞춰 보기 ─────────── */
  const id = (t: string, td: number, s: string, sd: number, n: number) => `${t}|${td}|${s}|${sd}|${n}`;
  const expected = new Set<string>();
  result.step1.forEach((T) =>
    T.enclosures.forEach((te) =>
      result.step1.forEach((S) => {
        if (S.ticket.id === T.ticket.id) return;
        S.enclosures.forEach((se) => {
          const wallNums = se.walls.map((w) => w.number);
          te.cells.forEach((c) => {
            if (wallNums.includes(c.number)) expected.add(id(T.ticket.id, te.digit, S.ticket.id, se.digit, c.number));
          });
        });
      })
    )
  );
  const actual = new Set<string>();
  result.step2.forEach((h) => {
    if (h.target.id === h.source.id) err(`2단계: ${no.get(h.target.id)}번 복권이 자기 자신과 비교됨`);
    h.cells.forEach((c) => {
      if (!h.targetEnc.cells.some((x) => x.row === c.row && x.col === c.col)) err(`2단계: ${no.get(h.target.id)}번 ${c.number}이(가) 갇힌 칸이 아님`);
      if (!h.sourceEnc.walls.some((w) => w.number === c.number)) err(`2단계: ${c.number}이(가) ${no.get(h.source.id)}번의 연결 번호가 아님`);
      actual.add(id(h.target.id, h.targetEnc.digit, h.source.id, h.sourceEnc.digit, c.number));
    });
  });
  expected.forEach((x) => {
    if (!actual.has(x)) {
      const [t, , s, , n] = x.split('|');
      err(`2단계 빠짐: ${no.get(s)}번의 연결 번호 ${n}이(가) ${no.get(t)}번에서 갇혔는데 결과에 없음`);
    }
  });
  actual.forEach((x) => {
    if (!expected.has(x)) err('2단계: 규칙에 없는 연결이 결과에 들어 있음');
  });

  /* ─────────── 3단계: 2단계 번호 모음과 같은지 ─────────── */
  const nums3 = Array.from(new Set(Array.from(expected).map((x) => Number(x.split('|')[4])))).sort((a, b) => a - b);
  if (nums3.join(',') !== result.step3.join(','))
    err(`3단계 불일치: 다시 계산 ${nums3.length}개 / 결과 ${result.step3.length}개`);

  /* ─────────── 4단계: 갇힌 복권 장수를 다시 세어 순위 비교 ─────────── */
  const count = new Map<number, Set<string>>();
  expected.forEach((x) => {
    const [t, , , , n] = x.split('|');
    if (!count.has(Number(n))) count.set(Number(n), new Set());
    count.get(Number(n))!.add(t);
  });
  const rank = Array.from(count.entries())
    .map(([n, set]) => [n, set.size])
    .sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  if (rank.length !== result.step4.length) err(`4단계 불일치: 번호 수 ${rank.length}개 / 결과 ${result.step4.length}개`);
  rank.forEach(([n, c], i) => {
    const r = result.step4[i];
    if (!r || r.number !== n || r.count !== c)
      err(`4단계 불일치: ${i + 1}위 다시 계산 ${n}번 ${c}장 / 결과 ${r ? `${r.number}번 ${r.count}장` : '없음'}`);
  });

  return { ok: errors.length === 0, patterns, links: expected.size, errors };
};