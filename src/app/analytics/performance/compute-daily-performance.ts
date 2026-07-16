import type { AnalysisSettings, DailyPerformance, EnrichedBacktestRow } from '../../models/backtest.models';
import { selectedPnl } from '../pnl/enrich-backtest-rows';

const dayStart = (date: Date): Date => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

export const computeDailyPerformance = (
  rows: EnrichedBacktestRow[],
  settings: Pick<AnalysisSettings, 'pnlMode'>,
): DailyPerformance[] => {
  const grouped = new Map<string, DailyPerformance>();

  for (const row of rows) {
    const date = dayStart(row.datetime);
    const key = date.toISOString();
    const existing = grouped.get(key) ?? {
      date,
      grossPnl: 0,
      netPnl: 0,
      value: 0,
      volumeMwh: 0,
      activeCount: 0,
      rowCount: 0,
    };
    existing.grossPnl += row.grossPnl;
    existing.netPnl += row.netPnl;
    existing.value += selectedPnl(row, settings.pnlMode);
    existing.volumeMwh += Math.abs(row.volumeMwh);
    existing.activeCount += row.position.direction === 'flat' ? 0 : 1;
    existing.rowCount++;
    grouped.set(key, existing);
  }

  return [...grouped.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
};
