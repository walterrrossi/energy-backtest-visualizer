import type { AnalysisSettings, EnrichedBacktestRow, SegmentPerformance } from '../../models/backtest.models';
import { selectedPnl } from '../pnl/enrich-backtest-rows';

interface SegmentAccumulator {
  key: string;
  label: string;
  rows: EnrichedBacktestRow[];
}

const maxDrawdown = (values: number[]): number => {
  let cumulative = 0;
  let peak = 0;
  let result = 0;
  for (const value of values) {
    cumulative += value;
    peak = Math.max(peak, cumulative);
    result = Math.min(result, cumulative - peak);
  }
  return result;
};

export const groupPerformance = (
  rows: EnrichedBacktestRow[],
  keyOf: (row: EnrichedBacktestRow) => { key: string; label: string },
  settings: Pick<AnalysisSettings, 'pnlMode'>,
): SegmentPerformance[] => {
  const grouped = new Map<string, SegmentAccumulator>();
  for (const row of rows) {
    const key = keyOf(row);
    const current = grouped.get(key.key) ?? { ...key, rows: [] };
    current.rows.push(row);
    grouped.set(key.key, current);
  }

  return [...grouped.values()].map(segment => {
    const values = segment.rows.map(row => selectedPnl(row, settings.pnlMode));
    const active = segment.rows.filter(row => row.position.direction !== 'flat');
    const volumeMwh = segment.rows.reduce((sum, row) => sum + Math.abs(row.volumeMwh), 0);
    const wins = active.filter(row => selectedPnl(row, settings.pnlMode) > 0).length;
    const pnl = values.reduce((sum, value) => sum + value, 0);
    return {
      key: segment.key,
      label: segment.label,
      rowCount: segment.rows.length,
      activeCount: active.length,
      pnl,
      pnlPerMwh: volumeMwh === 0 ? 0 : pnl / volumeMwh,
      volumeMwh,
      hitRate: active.length === 0 ? 0 : wins / active.length * 100,
      coverage: segment.rows.length === 0 ? 0 : active.length / segment.rows.length * 100,
      maxDrawdown: maxDrawdown(segment.rows.slice().sort((a, b) => a.datetime.getTime() - b.datetime.getTime()).map(row => selectedPnl(row, settings.pnlMode))),
    };
  }).sort((a, b) => a.key.localeCompare(b.key));
};

export const computeBreakdowns = (
  rows: EnrichedBacktestRow[],
  settings: Pick<AnalysisSettings, 'pnlMode'>,
) => {
  const byHour = new Map<number, { hour: number; long: number; short: number; total: number }>();
  const byMonth = new Map<number, { month: number; long: number; short: number; total: number }>();
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const longByDay = new Array<number>(7).fill(0);
  const shortByDay = new Array<number>(7).fill(0);

  for (const row of rows) {
    const value = selectedPnl(row, settings.pnlMode);
    const hour = row.datetime.getUTCHours();
    const month = row.datetime.getUTCMonth();
    const day = row.datetime.getUTCDay() === 0 ? 6 : row.datetime.getUTCDay() - 1;
    const hourValue = byHour.get(hour) ?? { hour, long: 0, short: 0, total: 0 };
    const monthValue = byMonth.get(month) ?? { month, long: 0, short: 0, total: 0 };
    if (row.position.direction === 'long') {
      hourValue.long += value;
      monthValue.long += value;
      longByDay[day] += value;
    } else if (row.position.direction === 'short') {
      hourValue.short += value;
      monthValue.short += value;
      shortByDay[day] += value;
    }
    hourValue.total = hourValue.long + hourValue.short;
    monthValue.total = monthValue.long + monthValue.short;
    byHour.set(hour, hourValue);
    byMonth.set(month, monthValue);
  }

  return {
    pnlByHour: [...byHour.values()].sort((a, b) => a.hour - b.hour),
    pnlByMonth: [...byMonth.values()].sort((a, b) => a.month - b.month),
    longPnlByDay: longByDay.map((value, index) => ({ label: dayLabels[index], value })),
    shortPnlByDay: shortByDay.map((value, index) => ({ label: dayLabels[index], value })),
  };
};
