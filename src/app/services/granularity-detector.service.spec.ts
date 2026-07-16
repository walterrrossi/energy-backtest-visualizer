import { describe, expect, it } from 'vitest';
import {
  daylightSavingRows,
  duplicateTimestampRows,
  halfHourlyRows,
  hourlyRows,
  missingIntervalRows,
  quarterHourlyRows,
} from '../testing/backtest-fixtures';
import { GranularityDetectorService } from './granularity-detector.service';

describe('GranularityDetectorService', () => {
  const detector = new GranularityDetectorService();

  it.each([
    ['hourly', hourlyRows, 'hourly'],
    ['half-hourly', halfHourlyRows, 'half-hourly'],
    ['quarter-hourly', quarterHourlyRows, 'quarter-hourly'],
    ['hourly with a missing interval', missingIntervalRows, 'hourly'],
    ['duplicate timestamps use the current zero-delta behavior', duplicateTimestampRows, 'quarter-hourly'],
    ['hourly across a DST gap', daylightSavingRows, 'hourly'],
  ] as const)('detects %s data', (_name, rows, expected) => {
    expect(detector.detect(rows.map(row => row.datetime))).toBe(expected);
  });

  it('uses hourly as the fallback for fewer than two timestamps', () => {
    expect(detector.detect([hourlyRows[0].datetime])).toBe('hourly');
    expect(detector.detect([])).toBe('hourly');
  });

  it('exposes the expected energy and annualization factors', () => {
    expect(detector.grainFactor('hourly')).toBe(1);
    expect(detector.grainFactor('half-hourly')).toBe(0.5);
    expect(detector.grainFactor('quarter-hourly')).toBe(0.25);
    expect(detector.periodsPerYear('hourly')).toBe(8760);
    expect(detector.periodsPerYear('half-hourly')).toBe(17520);
    expect(detector.periodsPerYear('quarter-hourly')).toBe(35040);
  });
});
