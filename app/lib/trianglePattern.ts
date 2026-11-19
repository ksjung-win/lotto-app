// 💡 4단계 삼각 패턴 · 5단계 동일번호 계산
// 삼각 패턴: 같은 번호 3개가 연속된 3줄에 하나씩 있고,
//           위·아래 두 개는 같은 칸, 가운데 하나는 바로 옆 칸 ("<" 또는 ">" 모양)
//   예)  C줄 4번째 칸 34 / D줄 3번째 칸 34 / E줄 4번째 칸 34  →  "<" 모양
// 동일번호: 삼각형이 있는 3줄 안에서 2줄 이상에 나온 번호 (삼각형 번호 자체는 제외)
import type { Ticket } from '../store/useTicketStore';
import { ticketToGrid } from './endDigitPattern';
import type { GridCell } from './connectPattern';

export const ROW_LABELS = ['A', 'B', 'C', 'D', 'E'];

export type SameNumber = { number: number; cells: GridCell[] }; // 3줄 안에서 그 번호가 있는 칸들 (2개 이상)
export type Triangle = {
  number: number;
  topRow: number;          // 삼각형이 시작하는 줄 (0=A … 2=C)
  shape: '<' | '>';        // 가운데 칸이 왼쪽이면 '<', 오른쪽이면 '>'
  cells: GridCell[];       // 삼각형 3칸 (위 · 가운데 · 아래)
  same: SameNumber[];      // 그 3줄 안의 동일번호
};
export type TriangleTicket = { ticket: Ticket; triangles: Triangle[] };

// 줄 이름 (예: 2 → "C·D·E")
export const rowsText = (topRow: number) => [0, 1, 2].map((i) => ROW_LABELS[topRow + i]).join('·');

// 💡 복권 1장에서 삼각 패턴 찾기
export const findTriangles = (ticket: Ticket): Triangle[] => {
  const g = ticketToGrid(ticket); // 5줄 × 6칸 (빈칸은 null)
  const out: Triangle[] = [];
  for (let r = 0; r + 2 < 5; r++) {
    for (let c = 0; c < 6; c++) {
      const n = g[r][c];
      if (!n || g[r + 2][c] !== n) continue; // 위·아래가 같은 칸에 같은 번호
      for (const dc of [-1, 1]) {
        const mc = c + dc;
        if (mc < 0 || mc > 5 || g[r + 1][mc] !== n) continue; // 가운데 줄 바로 옆 칸
        const cells: GridCell[] = [
          { row: r, col: c, number: n },
          { row: r + 1, col: mc, number: n },
          { row: r + 2, col: c, number: n },
        ];
        // 그 3줄 안의 동일번호 (2줄 이상, 삼각형 번호 제외)
        const pos = new Map<number, GridCell[]>();
        for (let rr = r; rr <= r + 2; rr++)
          g[rr].forEach((v, cc) => {
            if (!v || v === n) return;
            pos.set(v, [...(pos.get(v) || []), { row: rr, col: cc, number: v }]);
          });
        const same = Array.from(pos.entries())
          .filter(([, list]) => new Set(list.map((p) => p.row)).size >= 2)
          .map(([number, list]) => ({ number, cells: list }))
          .sort((a, b) => a.number - b.number);
        out.push({ number: n, topRow: r, shape: dc < 0 ? '<' : '>', cells, same });
      }
    }
  }
  return out;
};

// 💡 회차 전체: 삼각 패턴이 있는 복권만
export const findTriangleTickets = (tickets: Ticket[]): TriangleTicket[] =>
  tickets.map((ticket) => ({ ticket, triangles: findTriangles(ticket) })).filter((t) => t.triangles.length > 0);

// 💡 5단계: 동일번호별로 모으기 (몇 장의 복권에서 나왔는지, 많은 순)
export type SameRank = { number: number; count: number; hits: { ticket: Ticket; tri: Triangle; same: SameNumber }[] };
export const sameNumberRanking = (list: TriangleTicket[]): SameRank[] => {
  const map = new Map<number, { tickets: Set<string>; hits: SameRank['hits'] }>();
  list.forEach(({ ticket, triangles }) =>
    triangles.forEach((tri) =>
      tri.same.forEach((same) => {
        const cur = map.get(same.number) || { tickets: new Set<string>(), hits: [] };
        cur.tickets.add(ticket.id);
        cur.hits.push({ ticket, tri, same });
        map.set(same.number, cur);
      })
    )
  );
  return Array.from(map.entries())
    .map(([number, v]) => ({ number, count: v.tickets.size, hits: v.hits }))
    .sort((a, b) => b.count - a.count || a.number - b.number);
};