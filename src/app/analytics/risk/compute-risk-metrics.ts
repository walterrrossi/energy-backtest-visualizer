import type {
  AnalysisSettings,
  DailyPerformance,
  DrawdownPoint,
  EnrichedBacktestRow,
  RiskMetrics,
} from '../../models/backtest.models';
import { selectedPnl } from '../pnl/enrich-backtest-rows';

const DAY_MS = 24 * 60 * 60 * 1000;

const mean = (values: number[]): number =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

const sampleStdDev = (values: number[]): number => {
  if (values.length < 2) return 0;
  const average = mean(values);
  return Math.sqrt(
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1),
  );
};

const percentile = (sortedAsc: number[], p: number): number => {
  if (sortedAsc.length === 0) return 0;
  if (sortedAsc.length === 1) return sortedAsc[0];
  const rank = (sortedAsc.length - 1) * p;
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  if (lower === upper) return sortedAsc[lower];
  const fraction = rank - lower;
  return sortedAsc[lower] + (sortedAsc[upper] - sortedAsc[lower]) * fraction;
};

const skewness = (values: number[]): number => {
  if (values.length < 3) return 0;
  const average = mean(values);
  let sumSquared = 0;
  let sumCubed = 0;
  for (const v of values) {
    const deviation = v - average;
    sumSquared += deviation * deviation;
    sumCubed += deviation * deviation * deviation;
  }
  if (sumSquared === 0) return 0;
  const variance = sumSquared / values.length;
  if (variance === 0) return 0;
  return sumCubed / values.length / Math.pow(variance, 1.5);
};

const excessKurtosis = (values: number[]): number => {
  if (values.length < 4) return 0;
  const average = mean(values);
  let sumSquared = 0;
  let sumFourth = 0;
  for (const v of values) {
    const deviation = v - average;
    const sq = deviation * deviation;
    sumSquared += sq;
    sumFourth += sq * sq;
  }
  if (sumSquared === 0) return 0;
  const variance = sumSquared / values.length;
  if (variance === 0) return 0;
  return sumFourth / values.length / (variance * variance) - 3;
};

export const annualizationPeriods = (settings: AnalysisSettings, intervalHours = 24): number => {
  switch (settings.returnAggregation) {
    case 'interval':
      return (settings.annualizationDays * 24) / intervalHours;
    case 'weekly':
      return settings.annualizationDays / 7;
    case 'daily':
      return settings.annualizationDays;
  }
};

export const aggregateReturns = (
  rows: EnrichedBacktestRow[],
  daily: DailyPerformance[],
  settings: AnalysisSettings,
): number[] => {
  if (settings.returnAggregation === 'interval')
    return rows.map((row) => selectedPnl(row, settings.pnlMode));
  if (settings.returnAggregation === 'daily') return daily.map((day) => day.value);

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
  const downsideDeviation = Math.sqrt(
    values.reduce((sum, value) => sum + Math.min(value, 0) ** 2, 0) / values.length,
  );
  return downsideDeviation === 0
    ? 0
    : (mean(values) / downsideDeviation) * Math.sqrt(periodsPerYear);
};

export const computeDrawdown = (daily: DailyPerformance[]): DrawdownPoint[] => {
  let cumulative = 0;
  let peak = 0;
  return daily.map((day) => {
    cumulative += day.value;
    peak = Math.max(peak, cumulative);
    return { date: day.date, value: cumulative - peak, peak };
  });
};

const durationDays = (start: Date | undefined, end: Date | undefined): number =>
  start && end ? Math.max(0, Math.round((end.getTime() - start.getTime()) / DAY_MS)) : 0;

const concentration = (daily: DailyPerformance[], count: number, total: number): number => {
  if (daily.length === 0 || total === 0) return 0;
  return (
    (daily
      .map((day) => day.value)
      .sort((a, b) => b - a)
      .slice(0, count)
      .reduce((sum, value) => sum + value, 0) /
      total) *
    100
  );
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
  const maximumDrawdown =
    drawdown.length === 0 ? 0 : Math.min(...drawdown.map((point) => point.value));
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
      maximumDrawdownDurationDays = Math.max(
        maximumDrawdownDurationDays,
        durationDays(activeStart, point.date),
      );
      if (trough) recoveryTimeDays = Math.max(recoveryTimeDays, durationDays(trough, point.date));
      activeStart = undefined;
      trough = undefined;
      troughValue = 0;
    }
  }
  const drawdownDurationDays = activeStart ? durationDays(activeStart, drawdown.at(-1)?.date) : 0;
  if (activeStart)
    maximumDrawdownDurationDays = Math.max(maximumDrawdownDurationDays, drawdownDurationDays);

  const values = rows.map((row) => selectedPnl(row, settings.pnlMode));
  const wins = values.filter((value) => value > 0);
  const losses = values.filter((value) => value < 0);
  const totalWins = wins.reduce((sum, value) => sum + value, 0);
  const totalLosses = losses.reduce((sum, value) => sum + Math.abs(value), 0);
  const rollingProfitable =
    daily.length < rollingWindowDays
      ? 0
      : (daily.slice(rollingWindowDays - 1).filter((_, index) => {
          const start = index;
          return (
            daily.slice(start, start + rollingWindowDays).reduce((sum, day) => sum + day.value, 0) >
            0
          );
        }).length /
          (daily.length - rollingWindowDays + 1)) *
        100;
  const annualizedPnl = averageReturn * periods;
  const annualizedVolatility = volatility * Math.sqrt(periods);

  const dailyValues = daily.map((day) => day.value);
  const winningDays = dailyValues.filter((value) => value > 0);
  const losingDays = dailyValues.filter((value) => value < 0);
  const totalDailyValue = winningDays.reduce((sum, value) => sum + value, 0);
  const totalLossDayValue = losingDays.reduce((sum, value) => sum + Math.abs(value), 0);
  const sortedDaily = [...dailyValues].sort((a, b) => a - b);
  const var95 = dailyValues.length === 0 ? 0 : percentile(sortedDaily, 0.05);
  const cvar95 =
    dailyValues.length === 0
      ? 0
      : sortedDaily.filter((value) => value <= var95).reduce((sum, value) => sum + value, 0) /
        Math.max(1, sortedDaily.filter((value) => value <= var95).length);

  let maxConsecutiveWinDays = 0;
  let maxConsecutiveLossDays = 0;
  let currentWin = 0;
  let currentLoss = 0;
  for (const value of dailyValues) {
    if (value > 0) {
      currentWin++;
      currentLoss = 0;
      maxConsecutiveWinDays = Math.max(maxConsecutiveWinDays, currentWin);
    } else if (value < 0) {
      currentLoss++;
      currentWin = 0;
      maxConsecutiveLossDays = Math.max(maxConsecutiveLossDays, currentLoss);
    } else {
      currentWin = 0;
      currentLoss = 0;
    }
  }

  return {
    drawdown,
    maximumDrawdown,
    currentDrawdown,
    drawdownDurationDays,
    maximumDrawdownDurationDays,
    recoveryTimeDays,
    annualizedPnl,
    annualizedVolatility,
    dailyVolatility: volatility,
    sortinoRatio: computeSortino(returns, periods),
    calmarRatio: maximumDrawdown === 0 ? 0 : annualizedPnl / Math.abs(maximumDrawdown),
    profitFactor: totalLosses === 0 ? 0 : totalWins / totalLosses,
    averageWinningTrade: wins.length === 0 ? 0 : totalWins / wins.length,
    averageLosingTrade: losses.length === 0 ? 0 : -totalLosses / losses.length,
    payoffRatio:
      losses.length === 0 || wins.length === 0
        ? 0
        : totalWins / wins.length / (totalLosses / losses.length),
    bestDay: daily.length === 0 ? 0 : Math.max(...daily.map((day) => day.value)),
    worstDay: daily.length === 0 ? 0 : Math.min(...daily.map((day) => day.value)),
    averageWinningDay: winningDays.length === 0 ? 0 : totalDailyValue / winningDays.length,
    averageLosingDay: losingDays.length === 0 ? 0 : -totalLossDayValue / losingDays.length,
    positiveDaysPct: dailyValues.length === 0 ? 0 : (winningDays.length / dailyValues.length) * 100,
    maxConsecutiveWinDays,
    maxConsecutiveLossDays,
    var95,
    cvar95,
    skewness: skewness(dailyValues),
    kurtosis: excessKurtosis(dailyValues),
    topFiveDayConcentration: concentration(
      daily,
      5,
      daily.reduce((sum, day) => sum + day.value, 0),
    ),
    topTenDayConcentration: concentration(
      daily,
      10,
      daily.reduce((sum, day) => sum + day.value, 0),
    ),
    profitableRollingWindowPercentage: rollingProfitable,
  };
};
