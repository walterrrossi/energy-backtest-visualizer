import type { AnalysisSettings, BacktestAnalysis, BacktestDataset } from '../models/backtest.models';
import { computeDailyPerformance } from './performance/compute-daily-performance';
import { computeRollingMetrics } from './performance/compute-rolling-metrics';
import { computeSummaryMetrics } from './performance/compute-summary-metrics';
import { enrichBacktestRows, selectedPnl } from './pnl/enrich-backtest-rows';
import { computeRiskMetrics } from './risk/compute-risk-metrics';
import { computeBreakdowns, groupPerformance } from './segmentation/group-performance';

export const computeBacktestAnalysis = (dataset: BacktestDataset, settings: AnalysisSettings): BacktestAnalysis => {
  const enrichedRows = enrichBacktestRows(dataset.rows, dataset.metadata.granularity, settings);
  const dailyPnl = computeDailyPerformance(enrichedRows, settings);
  const risk = computeRiskMetrics(enrichedRows, dailyPnl, settings, settings.rollingWindowDays);
  const breakdowns = computeBreakdowns(enrichedRows, settings);
  const cumulativePnl: { date: Date; value: number }[] = [];
  let cumulative = 0;
  for (const day of dailyPnl) {
    cumulative += day.value;
    cumulativePnl.push({ date: day.date, value: cumulative });
  }

  const performance = {
    cumulativePnl,
    dailyPnl,
    drawdown: risk.drawdown,
    ...breakdowns,
  };
  const summary = computeSummaryMetrics(enrichedRows, dailyPnl, risk, settings);
  const segments = {
    byHour: groupPerformance(enrichedRows, row => ({ key: String(row.datetime.getUTCHours()), label: `${row.datetime.getUTCHours()}:00` }), settings),
    byMonth: groupPerformance(enrichedRows, row => ({ key: String(row.datetime.getUTCMonth()), label: row.datetime.toLocaleString('en', { month: 'short', timeZone: 'UTC' }) }), settings),
    byWeekday: groupPerformance(enrichedRows, row => ({ key: String(row.datetime.getUTCDay()), label: row.datetime.toLocaleString('en', { weekday: 'short', timeZone: 'UTC' }) }), settings),
  };

  return {
    enrichedRows,
    summary,
    performance,
    risk,
    rolling: computeRollingMetrics(dailyPnl, settings),
    segments,
  };
};
