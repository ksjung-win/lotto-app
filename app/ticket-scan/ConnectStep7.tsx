'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, Star } from 'lucide-react';
import { Ticket } from '../store/useTicketStore';
import { getBallColor, pad2 } from '../lib/endDigitPattern';
import { runConnectAnalysis, ConnectResult } from '../lib/connectPattern';
import { readEdits } from '../lib/editsStore';
import {
  Draw, MethodKey, METHODS, predict, checkDraw, scorePredictions, wallRanking, rankOf,
  loadDraws, readManualDraw, saveManualDraw,
} from '../lib/connectPredict';
import { SummaryBox } from './ConnectViews';
import { useSnapshotStore } from '../store/useSnapshotStore';
import { WALL_OPTIONS } from '../lib/drawSnapshot';

function Ball({ n, hit = false, size = 'sm' }: { n: number; hit?: boolean; size?: 'sm' | 'md' }) {
  return (
    <span
      className={`rounded-full flex items-center justify-center font-bold shrink-0 ${getBallColor(n)} ${
        size === 'sm' ? 'w-7 h-7 text-[11px]' : 'w-9 h-9 text-[13px]'
      } ${hit ? 'ring-[3px] ring-emerald-500 ring-offset-1 ring-offset-white dark:ring-offset-zinc-900' : ''}`}
    >
      {pad2(n)}
    </span>
  );
}

// 당첨 날짜 보기 좋게 (예: 2026-11-07T00:00:00Z → 2026.11.07)
const fmtDate = (s: string) => s.slice(0, 10).replace(/-/g, '.');
const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : '-');
const chanceText = (p: number) => (p < 0.01 ? '1% 미만' : `약 ${Math.round(p * 100)}%`);
const hhmm = (ms: number) => {
  const d = new Date(ms);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// 회차의 복권 + 그 회차의 직접 수정 내용으로 분석
const analyzeRound = (tickets: Ticket[], round: number, minLen: number) => {
  const list = tickets.filter((t) => t.round === round).sort((a, b) => a.createdAt - b.createdAt);
  const e = readEdits(round);
  return { list, result: runConnectAnalysis(list, minLen, e.off, e.add, e.flip) };
};

const Card = ({ title, children }: { title: React.ReactNode; children: React.ReactNode }) => (
  <div className="bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/50 rounded-2xl p-3 flex flex-col gap-2">
    <div className="text-[13px] font-black text-gray-900 dark:text-zinc-100">{title}</div>
    {children}
  </div>
);

/* ═══════════════════════════════ 7단계: 예측 · 당첨 대입 ═══════════════════════════════ */
export default function Step7View({ round, tickets, roundTickets, result, minLen }: {
  round: number;
  tickets: Ticket[];          // 모든 회차 복권 (성적표용)
  roundTickets: Ticket[];     // 선택한 회차 복권
  result: ConnectResult;      // 선택한 회차 1~4단계 결과
  minLen: number;
}) {
  const [draws, setDraws] = useState<Map<number, Draw> | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [manualText, setManualText] = useState('');
  const [manualMsg, setManualMsg] = useState('');
  const [manualVer, setManualVer] = useState(0); // 직접 입력 저장 후 다시 그리기

  const load = (force = false) => {
    setLoadError(false);
    loadDraws(force)
      .then(setDraws)
      .catch(() => setLoadError(true));
  };
  useEffect(() => {
    loadDraws()
      .then(setDraws)
      .catch(() => setLoadError(true));
  }, []);

  // 회차의 당첨 번호 (자료 → 없으면 직접 입력한 것)
  const drawOf = (r: number): Draw | null => draws?.get(r) ?? readManualDraw(r);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const draw = useMemo(() => drawOf(round), [draws, round, manualVer]);

  const snapshots = useSnapshotStore((st) => st.snapshots); // 💡 확정된(고정) 지난 회차 기록
  const snap = snapshots[round];
  const livePreds = useMemo(() => predict(result, roundTickets), [result, roundTickets]);

  // 💡 성적표: 확정된 회차는 고정 기록, 아직 확정 전이면 지금 계산
  const report = useMemo(() => {
    const rounds = Array.from(new Set([...tickets.map((t) => t.round), ...Object.keys(snapshots).map(Number)])).sort((a, b) => b - a);
    return rounds
      .map((r) => {
        const sn = snapshots[r];
        if (sn) return { round: r, count: sn.ticketCount, scores: sn.byWall[minLen].scores, locked: true };
        const d = drawOf(r);
        if (!d) return null;
        const { list, result: res } = analyzeRound(tickets, r, minLen);
        return { round: r, count: list.length, scores: scorePredictions(predict(res, list), d), locked: false };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets, draws, minLen, manualVer, snapshots]);

  const avg = (m: MethodKey, k: 'top10Hit' | 'bestCombo') =>
    report.length ? report.reduce((a, r) => a + r.scores.find((s) => s.method === m)![k], 0) / report.length : 0;
  const best: MethodKey | null = report.length
    ? (['A', 'B', 'C'] as MethodKey[]).reduce((b, m) =>
        avg(m, 'top10Hit') > avg(b, 'top10Hit') || (avg(m, 'top10Hit') === avg(b, 'top10Hit') && avg(m, 'bestCombo') > avg(b, 'bestCombo')) ? m : b
      )
    : null;

  const saveManual = () => {
    const nums = (manualText.match(/\d+/g) || []).map(Number);
    const ok = nums.length === 7 && nums.every((n) => n >= 1 && n <= 45) && new Set(nums).size === 7;
    if (!ok) {
      setManualMsg('1~45 사이의 서로 다른 번호 7개를 입력해 주세요. (마지막 번호 = 보너스)');
      return;
    }
    saveManualDraw({ round, numbers: nums.slice(0, 6).sort((a, b) => a - b), bonus: nums[6] });
    setManualMsg('');
    setManualText('');
    setManualVer((v) => v + 1);
  };

  const lastUpdate = roundTickets.reduce((m, t) => Math.max(m, t.createdAt), 0);

  /* ───── 성적표 ───── */
  const ReportTable = (
    <Card title="📊 지난 회차 성적 (예측 방식별)">
      {report.length === 0 ? (
        <p className="text-[11.5px] text-gray-500 dark:text-zinc-400 break-keep">
          아직 추첨이 끝난 회차가 없어요. 추첨이 끝나면 자동으로 채워져요.
        </p>
      ) : (
        <>
          <p className="text-[11px] text-gray-500 dark:text-zinc-400 break-keep">
            추첨 전 복권만으로 계산한 예측과 실제 당첨 번호를 비교했어요. (상위 10개에 든 당첨 번호 / 5세트 중 최고 적중)
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-[11.5px] text-center">
              <thead>
                <tr className="text-gray-500 dark:text-zinc-400">
                  <th className="py-1 text-left font-bold">회차</th>
                  {METHODS.map((m) => (
                    <th key={m.key} className="py-1 font-bold">
                      {m.key}
                      {best === m.key && <Star size={11} className="inline ml-0.5 -mt-0.5 text-amber-500 fill-amber-500" />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-gray-900 dark:text-zinc-100 font-bold">
                {report.map((r) => (
                  <tr key={r.round} className="border-t border-gray-200 dark:border-zinc-700">
                    <td className="py-1.5 text-left">
                      {r.locked && '🔒'}{r.round}회 <span className="text-[10px] text-gray-400">({r.count}장)</span>
                    </td>
                    {r.scores.map((s) => (
                      <td key={s.method} className="py-1.5">
                        {s.top10Hit}개 / {s.bestCombo}개
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-300 dark:border-zinc-600 text-orange-500">
                  <td className="py-1.5 text-left">평균</td>
                  {METHODS.map((m) => (
                    <td key={m.key} className="py-1.5">
                      {avg(m.key, 'top10Hit').toFixed(1)} / {avg(m.key, 'bestCombo').toFixed(1)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          {best && (
            <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 break-keep">
              ⭐ 지금까지 성적이 가장 좋은 방식: {METHODS.find((m) => m.key === best)!.label} (회차 {report.length}개 기준)
            </p>
          )}
        </>
      )}
    </Card>
  );

  /* ───── 예측 번호 (방식별) ───── */
  const PredictionCards = (preds: typeof livePreds, hitNums: number[]) =>
    preds.map((p) => {
      const m = METHODS.find((x) => x.key === p.method)!;
      return (
        <Card
          key={p.method}
          title={
            <span className="flex items-center gap-1">
              {m.label}
              {best === p.method && <Star size={13} className="text-amber-500 fill-amber-500" />}
            </span>
          }
        >
          <p className="text-[11px] text-gray-500 dark:text-zinc-400 -mt-1">{m.desc}</p>
          <div className="text-[11px] font-bold text-gray-500 dark:text-zinc-400">예측 번호 상위 10개</div>
          <div className="flex flex-wrap gap-1">
            {p.top10.length === 0 ? <span className="text-[11px] text-gray-400">번호 부족</span> : p.top10.map((n) => <Ball key={n} n={n} hit={hitNums.includes(n)} />)}
          </div>
          <div className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 mt-1">6개 조합 {p.combos.length}세트</div>
          <div className="flex flex-col gap-1">
            {p.combos.map((c, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className="w-4 text-[11px] font-black text-gray-400">{i + 1}</span>
                {c.numbers.map((n) => <Ball key={n} n={n} hit={hitNums.includes(n)} />)}
                {hitNums.length > 0 && (
                  <span className="ml-auto text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                    {c.numbers.filter((n) => hitNums.includes(n)).length}개
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      );
    });

  /* ───── 불러오는 중 ───── */
  if (!snap && !draws && !loadError) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-[12px] text-gray-500 dark:text-zinc-400">
        <Loader2 size={16} className="animate-spin" /> 당첨 번호 자료를 불러오는 중…
      </div>
    );
  }

  const LoadErrorBox = loadError && !draw && !snap && (
    <div className="rounded-xl border border-red-400/40 bg-red-50 dark:bg-red-500/10 p-3 flex flex-col gap-2 text-[11.5px] text-red-700 dark:text-red-400 font-bold">
      <div className="flex items-center justify-between gap-2">
        <span className="break-keep">당첨 번호 자료를 불러오지 못했어요.</span>
        <button onClick={() => load(true)} className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md border border-red-400/60">
          <RefreshCw size={11} /> 다시 시도
        </button>
      </div>
      <span className="font-medium text-gray-600 dark:text-zinc-400 break-keep">
        추첨이 끝난 회차라면 당첨 번호 6개 + 보너스 1개를 직접 넣을 수 있어요.
      </span>
      <div className="flex gap-1.5">
        <input
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          placeholder="예: 2 11 16 25 34 35 14"
          className="flex-1 min-w-0 border border-gray-300 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white rounded-lg px-2.5 py-2 text-sm outline-none"
        />
        <button onClick={saveManual} className="shrink-0 px-3 rounded-lg bg-orange-500 text-white text-xs font-bold">
          저장
        </button>
      </div>
      {manualMsg && <span className="break-keep">{manualMsg}</span>}
    </div>
  );

  /* ═════ 추첨 전: 이번 주 예측 ═════ */
  if (!snap && !draw) {
    return (
      <div className="flex flex-col gap-3">
        {LoadErrorBox}
        <SummaryBox>
          🔮 {round}회 예측 · 복권 <span className="text-orange-500">{roundTickets.length}장</span> 반영
          {lastUpdate > 0 && <> · 마지막 갱신 {hhmm(lastUpdate)}</>}
          <br />
          <span className="font-medium text-gray-600 dark:text-zinc-300">복권을 등록할 때마다 자동으로 다시 계산돼요. 추첨이 끝나면 당첨 대입 분석으로 바뀌어요.</span>
        </SummaryBox>
        {PredictionCards(livePreds, [])}
        {ReportTable}
      </div>
    );
  }

  /* ═════ 추첨 후: 당첨 번호 대입 (확정된 회차는 고정 기록, 확정 전이면 지금 계산) ═════ */
  const shown = (() => {
    if (snap) {
      const ws = snap.byWall[minLen];
      return {
        draw: snap.draw,
        chk: ws.check,
        rank4: (n: number) => ws.rank4[String(n)],
        rank6: (n: number) => ws.rank6[String(n)],
        preds: ws.preds,
        scores: ws.scores,
        byWall: WALL_OPTIONS.map((mw) => ({ mw, c: snap.byWall[mw].check })),
      };
    }
    const d = draw!;
    const r4 = rankOf(result.step4);
    const r6 = rankOf(wallRanking(result));
    const edits = readEdits(round);
    return {
      draw: d,
      chk: checkDraw(result, roundTickets, d),
      rank4: (n: number) => r4.get(n),
      rank6: (n: number) => r6.get(n),
      preds: livePreds,
      scores: scorePredictions(livePreds, d),
      byWall: WALL_OPTIONS.map((mw) => ({
        mw,
        c: checkDraw(mw === minLen ? result : runConnectAnalysis(roundTickets, mw, edits.off, edits.add, edits.flip), roundTickets, d),
      })),
    };
  })();
  const { chk, rank4, rank6, byWall } = shown;
  const shownDraw = shown.draw;
  const W = shownDraw.numbers;
  const myScores = shown.scores;

  return (
    <div className="flex flex-col gap-3">
      <SummaryBox>
        🎯 {round}회 당첨 번호{shownDraw.date ? ` (${fmtDate(shownDraw.date)})` : ''}
        <div className="flex flex-wrap items-center gap-1 mt-1.5">
          {W.map((n) => <Ball key={n} n={n} size="md" />)}
          <span className="text-[13px] font-black text-gray-500 mx-0.5">+</span>
          <Ball n={shownDraw.bonus} size="md" />
        </div>
        <div className="mt-1.5 text-[11px] font-bold text-gray-600 dark:text-zinc-300">
          {snap ? `🔒 기록 확정 (${hhmm(snap.frozenAt)}) · 이 회차 결과는 더 이상 바뀌지 않아요` : '⏳ 곧 자동으로 기록이 확정돼요'}
        </div>
      </SummaryBox>

      {/* 1단계 */}
      <Card title="1단계: 당첨 번호는 벽이었나, 갇혔나?">
        <table className="w-full text-[11.5px] text-center">
          <thead>
            <tr className="text-gray-500 dark:text-zinc-400">
              <th className="py-1 text-left font-bold">번호</th>
              <th className="py-1 font-bold">표에 나옴</th>
              <th className="py-1 font-bold">벽</th>
              <th className="py-1 font-bold">갇힘</th>
            </tr>
          </thead>
          <tbody className="text-gray-900 dark:text-zinc-100 font-bold">
            {chk.perNumber.map((p) => (
              <tr key={p.number} className="border-t border-gray-200 dark:border-zinc-700">
                <td className="py-1 text-left"><Ball n={p.number} /></td>
                <td>{p.appear}</td>
                <td className="text-[#1E3A8A] dark:text-blue-300">{p.wall}</td>
                <td className="text-amber-600 dark:text-amber-400">{p.trap}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-gray-300 dark:border-zinc-600">
              <td className="py-1.5 text-left">당첨 합계</td>
              <td>{chk.appear}</td>
              <td className="text-[#1E3A8A] dark:text-blue-300">{pct(chk.wall, chk.appear)}</td>
              <td className="text-amber-600 dark:text-amber-400">{pct(chk.trap, chk.appear)}</td>
            </tr>
            <tr className="text-gray-500 dark:text-zinc-400">
              <td className="py-1 text-left">전체 평균</td>
              <td>{chk.cellsAll}</td>
              <td>{pct(chk.cellsWall, chk.cellsAll)}</td>
              <td>{pct(chk.cellsTrap, chk.cellsAll)}</td>
            </tr>
          </tbody>
        </table>
        <p className="text-[11px] text-gray-600 dark:text-zinc-300 break-keep">
          벽 번호 {chk.wallSet.length}종류 안에 당첨 번호 <b>{chk.wallHit.length}개</b> (무작위로 이만큼 들어갈 확률 {chanceText(chk.wallChance)})
        </p>
      </Card>

      {/* 3단계 */}
      <Card title="3단계: 갇힌 번호 안의 당첨 번호">
        <p className="text-[11.5px] text-gray-700 dark:text-zinc-200 break-keep">
          갇힌 번호 {chk.step3.length}개 중 당첨 <b className="text-emerald-600 dark:text-emerald-400">{chk.step3Hit.length}개</b>
          {chk.step3Hit.length > 0 && ` (${chk.step3Hit.map(pad2).join('·')})`}
          {chk.step3.includes(shownDraw.bonus) && ' · 보너스 포함'}
          <br />
          무작위 평균 {((chk.step3.length * 6) / 45).toFixed(1)}개 · 이만큼 들어갈 확률 {chanceText(chk.step3Chance)}
        </p>
      </Card>

      {/* 4·6단계 순위 */}
      <Card title="4단계 · 6단계: 당첨 번호의 순위">
        <table className="w-full text-[11.5px] text-center">
          <thead>
            <tr className="text-gray-500 dark:text-zinc-400">
              <th className="py-1 text-left font-bold">번호</th>
              <th className="py-1 font-bold">4단계 (갇힌)</th>
              <th className="py-1 font-bold">6단계 (연결)</th>
            </tr>
          </thead>
          <tbody className="text-gray-900 dark:text-zinc-100 font-bold">
            {[...W, shownDraw.bonus].map((n, i) => (
              <tr key={n} className="border-t border-gray-200 dark:border-zinc-700">
                <td className="py-1 text-left flex items-center gap-1">
                  <Ball n={n} />
                  {i === 6 && <span className="text-[10px] text-gray-400">보너스</span>}
                </td>
                <td>{rank4(n) ? `${rank4(n)}위` : '-'}</td>
                <td>{rank6(n) ? `${rank6(n)}위` : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* 최소 벽별 비교 */}
      <Card title="최소 벽별 비교">
        <table className="w-full text-[11.5px] text-center">
          <thead>
            <tr className="text-gray-500 dark:text-zinc-400">
              <th className="py-1 text-left font-bold">최소 벽</th>
              <th className="py-1 font-bold">벽 비율</th>
              <th className="py-1 font-bold">갇힘 비율</th>
              <th className="py-1 font-bold">벽 번호 적중</th>
            </tr>
          </thead>
          <tbody className="text-gray-900 dark:text-zinc-100 font-bold">
            {byWall.map(({ mw, c }) => (
              <tr key={mw} className={`border-t border-gray-200 dark:border-zinc-700 ${mw === minLen ? 'text-orange-500' : ''}`}>
                <td className="py-1 text-left">{mw}개</td>
                <td>{pct(c.wall, c.appear)} <span className="text-[10px] text-gray-400">/{pct(c.cellsWall, c.cellsAll)}</span></td>
                <td>{pct(c.trap, c.appear)} <span className="text-[10px] text-gray-400">/{pct(c.cellsTrap, c.cellsAll)}</span></td>
                <td>{c.wallHit.length}/{c.wallSet.length}종 <span className="text-[10px] text-gray-400">({chanceText(c.wallChance)})</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[10.5px] text-gray-500 dark:text-zinc-400 break-keep">비율 옆 작은 글씨는 전체 칸 평균, 괄호는 무작위로 이만큼 적중할 확률이에요.</p>
      </Card>

      {/* 이 회차 예측 결과 */}
      <Card title="이 회차 예측은 몇 개 맞았나?">
        <div className="grid grid-cols-3 gap-1.5 text-center">
          {myScores.map((s) => (
            <div key={s.method} className="rounded-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 py-1.5">
              <div className="text-[11px] font-black text-gray-500 dark:text-zinc-400">{s.method}</div>
              <div className="text-[12px] font-black text-gray-900 dark:text-zinc-100">상위10 {s.top10Hit}개</div>
              <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">조합 최고 {s.bestCombo}개</div>
            </div>
          ))}
        </div>
      </Card>
      {PredictionCards(shown.preds, W)}

      {ReportTable}
    </div>
  );
}