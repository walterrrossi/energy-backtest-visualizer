import { describe, expect, it } from 'vitest';
import {
  hourlyDataset,
  halfHourlyDataset,
  longOnlyRows,
  makeDataset,
  quarterHourlyDataset,
  shortOnlyRows,
  zeroVarianceRows,
} from '../testing/backtest-fixtures';
import { hourlyMetricExpectations } from '../testing/metric-expectations';
import { DEFAULT_ANALYSIS_SETTINGS } from '../models/backtest.models';
import { MetricsEngineService } from './metrics-engine.service';

const engine = (): MetricsEngineService => new MetricsEngineService();

describe('MetricsEngineService', () => {
  it('preserves the existing hourly summary metric contract', () => {
    const result = engine().compute(hourlyDataset).summary;

    expect(result.totalPnl).toBe(hourlyMetricExpectations.totalPnl);
    expect(result.efficiencyEuroPerMwh).toBe(hourlyMetricExpectations.efficiencyEuroPerMwh);
    expect(result.longFrequency).toEqual(hourlyMetricExpectations.longFrequency);
    expect(result.shortFrequency).toEqual(hourlyMetricExpectations.shortFrequency);
    expect(result.coverage).toBe(hourlyMetricExpectations.coverage);
    expect(result.hitRate).toBe(hourlyMetricExpectations.hitRate);
    expect(result.longPnl).toBe(hourlyMetricExpectations.longPnl);
    expect(result.shortPnl).toBe(hourlyMetricExpectations.shortPnl);
    expect(result.totalVolumeMwh).toBe(hourlyMetricExpectations.totalVolumeMwh);
    expect(result.totalAbsVolumeMwh).toBe(hourlyMetricExpectations.totalAbsVolumeMwh);
  });

  it('uses daily returns for the default Sharpe convention', () => {
    const result = engine().compute(hourlyDataset).summary;

    expect(result.sharpeRatio).toBeCloseTo(13.509256086106296, 12);
  });

  it('preserves hourly, monthly, and weekday breakdowns', () => {
    const result = engine().compute(hourlyDataset).performance;

    expect(result.pnlByHour).toEqual(hourlyMetricExpectations.pnlByHour);
    expect(result.pnlByMonth).toEqual(hourlyMetricExpectations.pnlByMonth);
    expect(result.longPnlByDay.map(day => day.value)).toEqual(hourlyMetricExpectations.longPnlByDay);
    expect(result.shortPnlByDay.map(day => day.value)).toEqual(hourlyMetricExpectations.shortPnlByDay);
  });

  it('builds a daily cumulative P&L series in chronological order', () => {
    const dataset = {
      ...hourlyDataset,
      rows: [...hourlyDataset.rows].reverse(),
    };

    const result = engine().compute(dataset).performance;

    expect(result.cumulativePnl.map(point => point.date.toISOString())).toEqual([
      '2024-01-01T00:00:00.000Z',
      '2024-01-02T00:00:00.000Z',
    ]);
    expect(result.cumulativePnl.map(point => point.value)).toEqual([15, 15]);
  });

  it('applies half-hour and quarter-hour energy conversion factors', () => {
    const halfHourly = engine().compute(halfHourlyDataset).summary;
    const quarterHourly = engine().compute(quarterHourlyDataset).summary;

    expect(halfHourly.totalPnl).toBe(14);
    expect(halfHourly.totalAbsVolumeMwh).toBe(3);
    expect(quarterHourly.totalPnl).toBe(-1);
    expect(quarterHourly.totalAbsVolumeMwh).toBe(2.5);
  });

  it('returns safe zero metrics for an empty dataset', () => {
    const result = engine().compute({ ...hourlyDataset, rows: [], rawRowCount: 0 }).summary;

    expect(result.totalPnl).toBe(0);
    expect(result.efficiencyEuroPerMwh).toBe(0);
    expect(result.coverage).toBe(0);
    expect(result.hitRate).toBe(0);
    expect(result.sharpeRatio).toBe(0);
    expect(result.maximumDrawdown).toBe(0);
  });

  it('returns zero Sharpe for a flat P&L series', () => {
    const result = engine().compute(makeDataset(zeroVarianceRows, 'hourly')).summary;

    expect(result.sharpeRatio).toBe(0);
  });

  it('keeps long-only and short-only frequency counts separate', () => {
    const longOnly = engine().compute(makeDataset(longOnlyRows, 'hourly')).summary;
    const shortOnly = engine().compute(makeDataset(shortOnlyRows, 'hourly')).summary;

    expect(longOnly.longFrequency).toEqual({ count: 2, pct: 100 });
    expect(longOnly.shortFrequency).toEqual({ count: 0, pct: 0 });
    expect(shortOnly.longFrequency).toEqual({ count: 0, pct: 0 });
    expect(shortOnly.shortFrequency).toEqual({ count: 2, pct: 100 });
  });

  it('applies P&L inversion through analysis settings', () => {
    const result = engine().compute(hourlyDataset, { ...DEFAULT_ANALYSIS_SETTINGS, invertPnl: true }).summary;

    expect(result.totalPnl).toBe(-15);
    expect(result.longPnl).toBe(-8);
    expect(result.shortPnl).toBe(-7);
    expect(result.hitRate).toBe(50);
  });
});
