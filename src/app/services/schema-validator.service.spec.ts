import { describe, expect, it } from 'vitest';
import { SchemaValidatorService } from './schema-validator.service';

describe('SchemaValidatorService', () => {
  const validator = new SchemaValidatorService();

  it('accepts the supported required schema and position aliases', () => {
    expect(validator.validate([
      { datetime: '2024-01-01T00:00:00Z', country: 'DE', strategy_tag: 's', spread: '2', position: '-1' },
    ])).toEqual([]);
  });

  it('reports missing required columns', () => {
    const errors = validator.validate([{ datetime: '2024-01-01T00:00:00Z' }]);

    expect(errors.map(error => error.field)).toEqual([
      'country',
      'strategy_tag',
      'spread',
      'qty_mw',
      'qty_mw',
      'spread',
    ]);
  });

  it('caps row-level errors and adds a summary diagnostic', () => {
    const rows = Array.from({ length: 12 }, () => ({
      datetime: '',
      country: 'DE',
      strategy_tag: 's',
      spread: 'not-a-number',
      qty_mw: 'not-a-number',
    }));

    const errors = validator.validate(rows);

    expect(errors.filter(error => error.row)).toHaveLength(10);
    expect(errors.at(-1)?.message).toContain('more row-level errors');
  });

  it('accepts mixed countries for the canonical dataset model', () => {
    const errors = validator.validate([
      { datetime: '2024-01-01T00:00:00Z', country: 'DE', strategy_tag: 's', spread: '2', qty_mw: '1' },
      { datetime: '2024-01-01T01:00:00Z', country: 'IT', strategy_tag: 's', spread: '2', qty_mw: '1' },
    ]);

    expect(errors).toEqual([]);
  });
});
