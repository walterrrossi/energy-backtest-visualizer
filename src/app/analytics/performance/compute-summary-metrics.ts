import type {
  AnalysisSettings,
  DailyPerformance,
  EnrichedBacktestRow,
  RiskMetrics,
  SummaryMetrics,
} from '../../models/backtest.models';
import {
  aggregateReturns,
  annualizationPeriods,
  computeSharpe,
} from '../risk/compute-risk-metrics';
import { selectedPnl } from '../pnl/enrich-backtest-rows';

export const computeSummaryMetrics = (
  rows: EnrichedBacktestRow[],
  daily: DailyPerformance[],
  risk: RiskMetrics,
  settings: AnalysisSettings,
): SummaryMetrics => {
  const values = rows.map((row) => selectedPnl(row, settings.pnlMode));
  const totalPnl = values.reduce((sum, value) => sum + value, 0);
  const grossPnl = rows.reduce((sum, row) => sum + row.grossPnl, 0);
  const netPnl = rows.reduce((sum, row) => sum + row.netPnl, 0);
  const activeRows = rows.filter((row) => row.position.direction !== 'flat');
  const totalAbsVolumeMwh = rows.reduce((sum, row) => sum + Math.abs(row.volumeMwh), 0);
  const totalVolumeMwh = rows.reduce((sum, row) => sum + row.volumeMwh, 0);
  const periods = annualizationPeriods(settings, rows[0]?.intervalHours ?? 24);
  const returns = aggregateReturns(rows, daily, settings);
  const longPnl = rows
    .filter((row) => row.position.direction === 'long')
    .reduce((sum, row) => sum + selectedPnl(row, settings.pnlMode), 0);
  const shortPnl = rows
    .filter((row) => row.position.direction === 'short')
    .reduce((sum, row) => sum + selectedPnl(row, settings.pnlMode), 0);

  return {
    totalPnl,
    grossPnl,
    netPnl,
    efficiencyEuroPerMwh: totalAbsVolumeMwh === 0 ? 0 : totalPnl / totalAbsVolumeMwh,
    longFrequency: {
      count: rows.filter((row) => row.position.direction === 'long').length,
      pct:
        rows.length === 0
          ? 0
          : (rows.filter((row) => row.position.direction === 'long').length / rows.length) * 100,
    },
    shortFrequency: {
      count: rows.filter((row) => row.position.direction === 'short').length,
      pct:
        rows.length === 0
          ? 0
          : (rows.filter((row) => row.position.direction === 'short').length / rows.length) * 100,
    },
    coverage: rows.length === 0 ? 0 : (activeRows.length / rows.length) * 100,
    hitRate:
      activeRows.length === 0
        ? 0
        : (activeRows.filter((row) => selectedPnl(row, settings.pnlMode) > 0).length /
            activeRows.length) *
          100,
    sharpeRatio: computeSharpe(returns, periods),
    sortinoRatio: risk.sortinoRatio,
    annualizedPnl: risk.annualizedPnl,
    annualizedVolatility: risk.annualizedVolatility,
    dailyVolatility: risk.dailyVolatility,
    maximumDrawdown: risk.maximumDrawdown,
    currentDrawdown: risk.currentDrawdown,
    drawdownDurationDays: risk.drawdownDurationDays,
    maximumDrawdownDurationDays: risk.maximumDrawdownDurationDays,
    recoveryTimeDays: risk.recoveryTimeDays,
    calmarRatio: risk.calmarRatio,
    profitFactor: risk.profitFactor,
    averageWinningTrade: risk.averageWinningTrade,
    averageLosingTrade: risk.averageLosingTrade,
    payoffRatio: risk.payoffRatio,
    bestDay: risk.bestDay,
    worstDay: risk.worstDay,
    averageWinningDay: risk.averageWinningDay,
    averageLosingDay: risk.averageLosingDay,
    positiveDaysPct: risk.positiveDaysPct,
    maxConsecutiveWinDays: risk.maxConsecutiveWinDays,
    maxConsecutiveLossDays: risk.maxConsecutiveLossDays,
    var95: risk.var95,
    cvar95: risk.cvar95,
    skewness: risk.skewness,
    kurtosis: risk.kurtosis,
    topFiveDayConcentration: risk.topFiveDayConcentration,
    topTenDayConcentration: risk.topTenDayConcentration,
    profitableRollingWindowPercentage: risk.profitableRollingWindowPercentage,
    longPnl,
    shortPnl,
    totalVolumeMwh,
    totalAbsVolumeMwh,
  };
};
