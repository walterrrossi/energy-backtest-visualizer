import type { BacktestDataset, BacktestRow, Granularity } from '../models/backtest.models';

const date = (value: string): Date => new Date(`${value}Z`);

const row = (
  datetime: Date,
  country: string,
  zone: string,
  strategyTag: string,
  quantityMw: number,
  spread: number,
): BacktestRow => ({
  id: `${strategyTag}:${datetime.toISOString()}`,
  datetime,
  market: { country, zone, currency: 'EUR', timezone: 'UTC' },
  strategy: { tag: strategyTag },
  position: {
    quantityMw,
    direction: quantityMw > 0 ? 'long' : quantityMw < 0 ? 'short' : 'flat',
  },
  prices: { spread },
});

export const hourlyRows: BacktestRow[] = [
  row(date('2024-01-01T00:00:00'), 'DE', 'DE-LU', 'baseline', 2, 10),
  row(date('2024-01-01T01:00:00'), 'DE', 'DE-LU', 'baseline', -1, 5),
  row(date('2024-01-01T02:00:00'), 'DE', 'DE-LU', 'baseline', 0, 100),
  row(date('2024-01-02T00:00:00'), 'DE', 'DE-LU', 'baseline', 3, -4),
  row(date('2024-01-02T01:00:00'), 'DE', 'DE-LU', 'baseline', -2, -6),
];

export const halfHourlyRows: BacktestRow[] = [
  row(date('2024-02-01T00:00:00'), 'IT', 'IT-NORD', 'half-hourly', 4, 3),
  row(date('2024-02-01T00:30:00'), 'IT', 'IT-NORD', 'half-hourly', -2, -8),
  row(date('2024-02-01T01:00:00'), 'IT', 'IT-NORD', 'half-hourly', 0, 1),
];

export const quarterHourlyRows: BacktestRow[] = [
  row(date('2024-03-01T00:00:00'), 'FR', 'FR', 'quarter-hourly', 4, 2),
  row(date('2024-03-01T00:15:00'), 'FR', 'FR', 'quarter-hourly', -4, 1),
  row(date('2024-03-01T00:30:00'), 'FR', 'FR', 'quarter-hourly', 2, -4),
  row(date('2024-03-01T00:45:00'), 'FR', 'FR', 'quarter-hourly', 0, 99),
];

export const longOnlyRows: BacktestRow[] = [
  row(date('2024-06-03T00:00:00'), 'DE', 'DE-LU', 'long-only', 1, 2),
  row(date('2024-06-03T01:00:00'), 'DE', 'DE-LU', 'long-only', 2, -1),
];

export const shortOnlyRows: BacktestRow[] = [
  row(date('2024-06-04T00:00:00'), 'DE', 'DE-LU', 'short-only', -1, 2),
  row(date('2024-06-04T01:00:00'), 'DE', 'DE-LU', 'short-only', -2, -1),
];

export const zeroVarianceRows: BacktestRow[] = [
  row(date('2024-06-05T00:00:00'), 'DE', 'DE-LU', 'flat-risk', 1, 0),
  row(date('2024-06-05T01:00:00'), 'DE', 'DE-LU', 'flat-risk', 2, 0),
];

export const negativePnlRows: BacktestRow[] = [
  row(date('2024-06-06T00:00:00'), 'DE', 'DE-LU', 'negative', 1, -2),
];

export const missingIntervalRows: BacktestRow[] = [
  row(date('2024-04-01T00:00:00'), 'DE', 'DE-LU', 'gappy', 1, 1),
  row(date('2024-04-01T02:00:00'), 'DE', 'DE-LU', 'gappy', -1, 1),
];

export const duplicateTimestampRows: BacktestRow[] = [
  row(date('2024-05-01T00:00:00'), 'DE', 'DE-LU', 'duplicate', 1, 1),
  row(date('2024-05-01T00:00:00'), 'DE', 'DE-LU', 'duplicate', -1, 1),
];

export const daylightSavingRows: BacktestRow[] = [
  row(new Date('2024-03-31T00:00:00Z'), 'DE', 'DE-LU', 'dst', 1, 1),
  row(new Date('2024-03-31T01:00:00Z'), 'DE', 'DE-LU', 'dst', 1, 1),
  row(new Date('2024-03-31T03:00:00Z'), 'DE', 'DE-LU', 'dst', 1, 1),
];

export const makeDataset = (
  rows: BacktestRow[],
  granularity: Granularity,
  fileName = 'fixture.csv',
): BacktestDataset => {
  const dates = rows.map(current => current.datetime).sort((a, b) => a.getTime() - b.getTime());
  return {
    id: `fixture:${fileName}`,
    name: fileName,
    fileName,
    importedAt: new Date('2024-01-01T00:00:00Z'),
    rows,
    rawRowCount: rows.length,
    metadata: {
      granularity,
      timezone: 'UTC',
      currency: 'EUR',
      countries: [...new Set(rows.map(current => current.market.country))],
      zones: [...new Set(rows.map(current => current.market.zone).filter((value): value is string => Boolean(value)))],
      strategyTags: [...new Set(rows.map(current => current.strategy.tag))],
      start: dates[0] ?? new Date('2024-01-01T00:00:00Z'),
      end: dates.at(-1) ?? new Date('2024-01-01T00:00:00Z'),
    },
    mapping: {
      datetime: 'datetime',
      country: 'country',
      zone: 'zone',
      strategyTag: 'strategy_tag',
      quantityMw: 'qty_mw',
      spread: 'spread',
    },
    qualityReport: {
      diagnostics: [],
      invalidRowCount: 0,
      duplicateTimestampCount: 0,
      missingIntervalCount: 0,
      qualityScore: 100,
    },
  };
};

export const hourlyDataset = makeDataset(hourlyRows, 'hourly', 'hourly-fixture.csv');
export const halfHourlyDataset = makeDataset(halfHourlyRows, 'half-hourly', 'half-hourly-fixture.csv');
export const quarterHourlyDataset = makeDataset(quarterHourlyRows, 'quarter-hourly', 'quarter-hourly-fixture.csv');
