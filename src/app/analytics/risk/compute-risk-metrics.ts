import type { AnalysisSettings, DailyPerformance, DrawdownPoint, EnrichedBacktestRow, RiskMetrics } from '../../models/backtest.models';
import { selectedPnl } from '../pnl/enrich-backtest-rows';

const DAY_MS = 24 * 60 * 60 * 1000;

const mean = (values: number[]): number => values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

const sampleStdDev = (values: number[]): number => {
  if (values.length < 2) return 0;
  const average = mean(values);
  return Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1));
};

export const annualizationPeriods = (settings: AnalysisSettings, intervalHours = 24): number => {
  switch (settings.returnAggregation) {
    case 'interval': return (settings.annualizationDays * 24) / intervalHours;
    case 'weekly': return settings.annualizationDays / 7;
    case 'daily': return settings.annualizationDays;
  }
};

export const aggregateReturns = (
  rows: EnrichedBacktestRow[],
  daily: DailyPerformance[],
  settings: AnalysisSettings,
): number[] => {
  if (settings.returnAggregation === 'interval') return rows.map(row => selectedPnl(row, settings.pnlMode));
  if (settings.returnAggregation === 'daily') return daily.map(day => day.value);

  const weekly = new Map<string, number>();
  for (const day of daily) {
    const monday = new Date(day.date);
    const weekday = monday.getUTCDay() === 0 ? 6 : monday.getUTCDay() - 1;
    monday.setUTCDate(monday.getUTCDate() - weekday);
    const key = monday.toISOString();
    weekly.set(key, (weekly.get(key) ?? 0) + day.value);
  }
  return [...weekly.values()];
};

export const computeSharpe = (values: number[], periodsPerYear: number): number => {
  const deviation = sampleStdDev(values);
  return deviation === 0 ? 0 : (mean(values) / deviation) * Math.sqrt(periodsPerYear);
};

export const computeSortino = (values: number[], periodsPerYear: number): number => {
  if (values.length === 0) return 0;
  const downsideDeviation = Math.sqrt(values.reduce((sum, value) => sum + Math.min(value, 0) ** 2, 0) / values.length);
  return downsideDeviation === 0 ? 0 : (mean(values) / downsideDeviation) * Math.sqrt(periodsPerYear);
};

export const computeDrawdown = (daily: DailyPerformance[]): DrawdownPoint[] => {
  let cumulative = 0;
  let peak = 0;
  return daily.map(day => {
    cumulative += day.value;
    peak = Math.max(peak, cumulative);
    return { date: day.date, value: cumulative - peak, peak };
  });
};

const durationDays = (start: Date | undefined, end: Date | undefined): number =>
  start && end ? Math.max(0, Math.round((end.getTime() - start.getTime()) / DAY_MS)) : 0;

const concentration = (daily: DailyPerformance[], count: number, total: number): number => {
  if (daily.length === 0 || total === 0) return 0;
  return daily.map(day => day.value).sort((a, b) => b - a).slice(0, count).reduce((sum, value) => sum + value, 0) / total * 100;
};

export const computeRiskMetrics = (
  rows: EnrichedBacktestRow[],
  daily: DailyPerformance[],
  settings: AnalysisSettings,
  rollingWindowDays: number,
): RiskMetrics & { drawdown: DrawdownPoint[] } => {
  const periods = annualizationPeriods(settings, rows[0]?.intervalHours ?? 24);
  const returns = aggregateReturns(rows, daily, settings);
  const averageReturn = mean(returns);
  const volatility = sampleStdDev(returns);
  const drawdown = computeDrawdown(daily);
  const maximumDrawdown = drawdown.length === 0 ? 0 : Math.min(...drawdown.map(point => point.value));
  const currentDrawdown = drawdown.at(-1)?.value ?? 0;
  let maximumDrawdownDurationDays = 0;
  let activeStart: Date | undefined;
  let recoveryTimeDays = 0;
  let trough: Date | undefined;
  let troughValue = 0;
  for (const point of drawdown) {
    if (point.value < 0 && !activeStart) activeStart = point.date;
    if (point.value < 0 && point.value < troughValue) {
      trough = point.date;
      troughValue = point.value;
    }
    if (point.value === 0 && activeStart) {
      maximumDrawdownDurationDays = Math.max(maximumDrawdownDurationDays, durationDays(activeStart, point.date));
      if (trough) recoveryTimeDays = Math.max(recoveryTimeDays, durationDays(trough, point.date));
      activeStart = undefined;
      trough = undefined;
      troughValue = 0;
    }
  }
  const drawdownDurationDays = activeStart ? durationDays(activeStart, drawdown.at(-1)?.date) : 0;
  if (activeStart) maximumDrawdownDurationDays = Math.max(maximumDrawdownDurationDays, drawdownDurationDays);

  const values = rows.map(row => selectedPnl(row, settings.pnlMode));
  const wins = values.filter(value => value > 0);
  const losses = values.filter(value => value < 0);
  const totalWins = wins.reduce((sum, value) => sum + value, 0);
  const totalLosses = losses.reduce((sum, value) => sum + Math.abs(value), 0);
  const rollingProfitable = daily.length < rollingWindowDays ? 0 : daily.slice(rollingWindowDays - 1).filter((_, index) => {
    const start = index;
    return daily.slice(start, start + rollingWindowDays).reduce((sum, day) => sum + day.value, 0) > 0;
  }).length / (daily.length - rollingWindowDays + 1) * 100;
  const annualizedPnl = averageReturn * periods;
  const annualizedVolatility = volatility * Math.sqrt(periods);

  return {
    drawdown,
    maximumDrawdown,
    currentDrawdown,
    drawdownDurationDays,
    maximumDrawdownDurationDays,
    recoveryTimeDays,
    annualizedPnl,
    annualizedVolatility,
    sortinoRatio: computeSortino(returns, periods),
    calmarRatio: maximumDrawdown === 0 ? 0 : annualizedPnl / Math.abs(maximumDrawdown),
    profitFactor: totalLosses === 0 ? 0 : totalWins / totalLosses,
    averageWinningTrade: wins.length === 0 ? 0 : totalWins / wins.length,
    averageLosingTrade: losses.length === 0 ? 0 : -totalLosses / losses.length,
    payoffRatio: losses.length === 0 || wins.length === 0 ? 0 : (totalWins / wins.length) / (totalLosses / losses.length),
    bestDay: daily.length === 0 ? 0 : Math.max(...daily.map(day => day.value)),
    worstDay: daily.length === 0 ? 0 : Math.min(...daily.map(day => day.value)),
    topFiveDayConcentration: concentration(daily, 5, daily.reduce((sum, day) => sum + day.value, 0)),
    topTenDayConcentration: concentration(daily, 10, daily.reduce((sum, day) => sum + day.value, 0)),
    profitableRollingWindowPercentage: rollingProfitable,
  };
};
