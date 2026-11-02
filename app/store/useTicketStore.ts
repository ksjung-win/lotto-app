import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 💡 복권 1게임 (A~E 중 하나)
export type LottoGame = {
  label: string;     // 'A' ~ 'E'
  numbers: number[]; // 번호 6개 (작은 번호부터)
};

// 💡 복권 1장
export type Ticket = {
  id: string;               // 내부 고유 번호
  round: number;            // 추첨 회차 (예: 1248)
  tr: string | null;        // 복권 고유번호(TR). 직접 입력한 복권은 null
  games: LottoGame[];       // A~E 게임 (최대 5개)
  source: 'qr' | 'manual' | 'ai';  // QR로 읽었는지, 직접 입력했는지, AI(제미나이)로 읽었는지
  createdAt: number;        // 등록 시각
};

export type AddResult = 'added' | 'duplicate';

interface TicketStore {
  tickets: Ticket[];
  addTicket: (data: Omit<Ticket, 'id' | 'createdAt'>) => AddResult;
  deleteTicket: (id: string) => void;
  deleteRound: (round: number) => void;
}

// 게임 번호를 비교하기 위한 문자열 (직접 입력 복권의 중복 확인용)
const gamesKey = (games: LottoGame[]) => games.map((g) => g.numbers.join(',')).join('|');

export const useTicketStore = create<TicketStore>()(
  persist(
    (set, get) => ({
      tickets: [],

      addTicket: (data) => {
        // 같은 회차에서 TR번호(앞 10자리)가 같거나, TR이 없으면 번호가 모두 같으면 중복
        const trKey = (tr: string | null) => (tr ? tr.slice(0, 10) : '');
        const exists = get().tickets.some((t) =>
          t.round === data.round &&
          (data.tr && t.tr ? trKey(t.tr) === trKey(data.tr) : gamesKey(t.games) === gamesKey(data.games))
        );
        if (exists) return 'duplicate';

        const newTicket: Ticket = {
          ...data,
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          createdAt: Date.now(),
        };
        set((state) => ({ tickets: [...state.tickets, newTicket] }));
        return 'added';
      },

      deleteTicket: (id) =>
        set((state) => ({ tickets: state.tickets.filter((t) => t.id !== id) })),

      deleteRound: (round) =>
        set((state) => ({ tickets: state.tickets.filter((t) => t.round !== round) })),
    }),
    { name: 'lotto-ticket-storage' }
  )
);