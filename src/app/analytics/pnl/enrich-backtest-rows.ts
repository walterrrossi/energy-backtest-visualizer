import type { AnalysisSettings, BacktestRow, EnrichedBacktestRow, Granularity } from '../../models/backtest.models';

const intervalHours = (granularity: Granularity): number => {
  switch (granularity) {
    case 'hourly': return 1;
    case 'half-hourly': return 0.5;
    case 'quarter-hourly': return 0.25;
  }
};

export const enrichBacktestRows = (
  rows: BacktestRow[],
  granularity: Granularity,
  settings: Pick<AnalysisSettings, 'invertPnl'>,
): EnrichedBacktestRow[] => {
  const hours = intervalHours(granularity);
  const sign = settings.invertPnl ? -1 : 1;

  return rows.map(row => {
    const volumeMwh = row.position.quantityMw * hours;
    const grossPnl = volumeMwh * row.prices.spread * sign;
    const costs = row.execution?.costs ?? 0;
    const slippage = row.execution?.slippage ?? 0;
    const netPnl = (volumeMwh * row.prices.spread - costs - slippage) * sign;
    return { ...row, intervalHours: hours, volumeMwh, grossPnl, netPnl };
  });
};

export const selectedPnl = (row: EnrichedBacktestRow, mode: AnalysisSettings['pnlMode']): number =>
  mode === 'net' ? row.netPnl : row.grossPnl;
