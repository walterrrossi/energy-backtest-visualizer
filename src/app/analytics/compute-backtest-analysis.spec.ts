import { describe, expect, it } from 'vitest';
import { computeBacktestAnalysis } from './compute-backtest-analysis';
import { DEFAULT_ANALYSIS_SETTINGS } from '../models/backtest.models';
import { hourlyDataset } from '../testing/backtest-fixtures';
import { enrichBacktestRows } from './pnl/enrich-backtest-rows';
import { computeDailyPerformance } from './performance/compute-daily-performance';
import { computeRiskMetrics } from './risk/compute-risk-metrics';
import { groupPerformance } from './segmentation/group-performance';

describe('modular analytics', () => {
  it('enriches rows once with gross, net, and interval values', () => {
    const rows = hourlyDataset.rows.map((row) => ({ ...row, execution: { costs: 2 } }));
    const enriched = enrichBacktestRows(rows, 'hourly', DEFAULT_ANALYSIS_SETTINGS);

    expect(enriched[0]).toMatchObject({ intervalHours: 1, volumeMwh: 2, grossPnl: 20, netPnl: 18 });
  });

  it('computes risk metrics from daily returns and reconciles drawdown', () => {
    const analysis = computeBacktestAnalysis(hourlyDataset, DEFAULT_ANALYSIS_SETTINGS);

    expect(analysis.summary.totalPnl).toBe(
      analysis.performance.dailyPnl.reduce((sum, day) => sum + day.value, 0),
    );
    expect(analysis.performance.drawdown.at(-1)?.value).toBe(analysis.summary.currentDrawdown);
    expect(analysis.summary.maximumDrawdown).toBeLessThanOrEqual(0);
    expect(analysis.summary.bestDay).toBe(15);
    expect(analysis.summary.worstDay).toBe(0);
  });

  it('tracks drawdown duration and recovery from the cumulative series', () => {
    const rows = [
      {
        ...hourlyDataset.rows[0],
        position: { quantityMw: 1, direction: 'long' as const },
        prices: { spread: -10 },
      },
      {
        ...hourlyDataset.rows[3],
        position: { quantityMw: 1, direction: 'long' as const },
        prices: { spread: 20 },
      },
    ];
    const analysis = computeBacktestAnalysis({ ...hourlyDataset, rows }, DEFAULT_ANALYSIS_SETTINGS);

    expect(analysis.summary.maximumDrawdown).toBe(-10);
    expect(analysis.summary.currentDrawdown).toBe(0);
    expect(analysis.summary.maximumDrawdownDurationDays).toBe(1);
    expect(analysis.summary.recoveryTimeDays).toBe(1);
  });

  it('returns no rolling points until a complete window is available', () => {
    const analysis = computeBacktestAnalysis(hourlyDataset, {
      ...DEFAULT_ANALYSIS_SETTINGS,
      rollingWindowDays: 30,
    });

    expect(analysis.rolling.points).toEqual([]);
    expect(analysis.summary.profitableRollingWindowPercentage).toBe(0);
  });

  it('produces generic segment metrics that reconcile to the total P&L', () => {
    const enriched = enrichBacktestRows(hourlyDataset.rows, 'hourly', DEFAULT_ANALYSIS_SETTINGS);
    const segments = groupPerformance(
      enriched,
      (row) => ({ key: row.strategy.tag, label: row.strategy.tag }),
      DEFAULT_ANALYSIS_SETTINGS,
    );

    expect(segments.reduce((sum, segment) => sum + segment.pnl, 0)).toBe(15);
    expect(segments[0].coverage).toBe(80);
  });

  it('supports direct composition of daily and risk functions without Angular', () => {
    const settings = { ...DEFAULT_ANALYSIS_SETTINGS, returnAggregation: 'interval' as const };
    const enriched = enrichBacktestRows(hourlyDataset.rows, 'hourly', settings);
    const daily = computeDailyPerformance(enriched, settings);
    const risk = computeRiskMetrics(enriched, daily, settings, 30);

    expect(daily).toHaveLength(2);
    expect(risk.maximumDrawdown).toBe(0);
    expect(risk.sortinoRatio).toBeGreaterThan(0);
  });

  it('computes daily-level streaks, distribution and tail-risk metrics', () => {
    const analysis = computeBacktestAnalysis(hourlyDataset, DEFAULT_ANALYSIS_SETTINGS);
    const summary = analysis.summary;

    expect(summary.positiveDaysPct).toBe(50);
    expect(summary.maxConsecutiveWinDays).toBe(1);
    expect(summary.maxConsecutiveLossDays).toBe(0);
    expect(summary.averageWinningDay).toBe(15);
    expect(summary.averageLosingDay).toBe(0);
    expect(summary.dailyVolatility).toBeGreaterThan(0);
    expect(summary.var95).toBeGreaterThanOrEqual(summary.worstDay);
    expect(summary.var95).toBeGreaterThanOrEqual(summary.cvar95);
    expect(summary.skewness).toBe(0);
    expect(Number.isFinite(summary.kurtosis)).toBe(true);
  });

  it('reports safe zero tail-risk metrics for an empty dataset', () => {
    const analysis = computeBacktestAnalysis(
      { ...hourlyDataset, rows: [] },
      DEFAULT_ANALYSIS_SETTINGS,
    );
    const summary = analysis.summary;

    expect(summary.var95).toBe(0);
    expect(summary.cvar95).toBe(0);
    expect(summary.maxConsecutiveWinDays).toBe(0);
    expect(summary.maxConsecutiveLossDays).toBe(0);
    expect(summary.positiveDaysPct).toBe(0);
  });
});
