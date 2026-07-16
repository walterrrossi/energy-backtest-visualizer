import type { AnalysisSettings, DailyPerformance, EnrichedBacktestRow, RollingMetricPoint, RollingMetricSeries } from '../../models/backtest.models';
import { computeSharpe, computeSortino } from '../risk/compute-risk-metrics';

const mean = (values: number[]): number => values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

const stdDev = (values: number[]): number => {
  if (values.length < 2) return 0;
  const average = mean(values);
  return Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1));
};

export const computeRollingMetrics = (
  daily: DailyPerformance[],
  settings: AnalysisSettings,
): RollingMetricSeries => {
  const windowDays = Math.max(1, Math.floor(settings.rollingWindowDays));
  const points: RollingMetricPoint[] = [];
  for (let end = windowDays - 1; end < daily.length; end++) {
    const window = daily.slice(end - windowDays + 1, end + 1);
    const values = window.map(day => day.value);
    const volume = window.reduce((sum, day) => sum + day.volumeMwh, 0);
    const active = window.reduce((sum, day) => sum + day.activeCount, 0);
    const observations = window.reduce((sum, day) => sum + day.rowCount, 0);
    points.push({
      date: window.at(-1)!.date,
      pnl: values.reduce((sum, value) => sum + value, 0),
      sharpe: computeSharpe(values, settings.annualizationDays),
      sortino: computeSortino(values, settings.annualizationDays),
      volatility: stdDev(values) * Math.sqrt(settings.annualizationDays),
      hitRate: observations === 0 ? 0 : window.reduce((sum, day) => sum + (day.value > 0 ? 1 : 0), 0) / window.length * 100,
      coverage: observations === 0 ? 0 : active / observations * 100,
      euroPerMwh: volume === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / volume,
    });
  }
  return { windowDays, points };
};
