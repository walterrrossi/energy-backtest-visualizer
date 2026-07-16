import { describe, expect, it } from 'vitest';
import { GranularityDetectorService } from '../../services/granularity-detector.service';
import { ColumnMapperService } from './column-mapper.service';
import { BacktestNormalizerService } from './backtest-normalizer.service';

const normalizer = (): BacktestNormalizerService => new BacktestNormalizerService(
  new ColumnMapperService(),
  new GranularityDetectorService(),
);

describe('ColumnMapperService', () => {
  it('matches common aliases and preserves the source column names', () => {
    const result = new ColumnMapperService().detect([{
      date: '2024-01-01T00:00:00Z',
      country_code: 'DE',
      strategy: 'baseline',
      position: '1',
      price_spread: '2',
    }]);

    expect(result.mapping).toMatchObject({
      datetime: 'date',
      country: 'country_code',
      strategyTag: 'strategy',
      quantityMw: 'position',
      spread: 'price_spread',
    });
    expect(result.ambiguities).toEqual([]);
  });

  it('can export and import versioned mapping presets', () => {
    const mapper = new ColumnMapperService();
    const mapping = {
      datetime: 'datetime',
      country: 'country',
      strategyTag: 'strategy_tag',
      quantityMw: 'qty_mw',
      spread: 'spread',
    };

    expect(mapper.importPreset(mapper.exportPreset(mapping))).toEqual(mapping);
  });
});

describe('BacktestNormalizerService', () => {
  it('creates canonical rows with deterministic IDs and derived direction', () => {
    const result = normalizer().normalize([{
      datetime: '2024-01-01 00:00:00Z',
      country: 'DE',
      zone: 'DE-LU',
      strategy_tag: 'baseline',
      qty_mw: '-2',
      spread: '4',
      probability: '0.8',
      confidence: '0.9',
      model_version: 'v2',
      desk: 'intraday',
    }], {}, 'sample.csv');

    expect(result.rows[0]).toMatchObject({
      id: 'sample.csv:row-2',
      market: { country: 'DE', zone: 'DE-LU', currency: 'EUR' },
      strategy: { tag: 'baseline', modelVersion: 'v2' },
      position: { quantityMw: -2, direction: 'short' },
      prices: { spread: 4 },
      signal: { probability: 0.8, confidence: 0.9 },
      metadata: { desk: 'intraday' },
    });
    expect(result.metadata.granularity).toBe('hourly');
    expect(result.metadata.countries).toEqual(['DE']);
    expect(result.qualityReport.qualityScore).toBe(100);
  });

  it('keeps rows with malformed optional numerics and reports a warning', () => {
    const result = normalizer().normalize([
      { datetime: '2024-01-01T00:00:00Z', country: 'DE', strategy_tag: 's', qty_mw: '1', spread: '2', confidence: 'bad' },
      { datetime: '2024-01-01T02:00:00Z', country: 'DE', strategy_tag: 's', qty_mw: '0', spread: '1', confidence: '0.4' },
    ]);

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].signal).toBeUndefined();
    expect(result.qualityReport.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'INVALID_OPTIONAL_NUMERIC_VALUE', severity: 'warning' }),
      expect.objectContaining({ code: 'MISSING_INTERVALS', severity: 'warning' }),
    ]));
    expect(result.qualityReport.missingIntervalCount).toBe(1);
  });

  it('rejects a dataset when no required mapping can be resolved', () => {
    expect(() => normalizer().normalize([{ datetime: '2024-01-01T00:00:00Z' }])).toThrow('Unable to map required columns');
  });
});
