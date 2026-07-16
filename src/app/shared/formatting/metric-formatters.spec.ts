import { describe, expect, it } from 'vitest';
import { formatCurrency, formatMetric, formatMwh, formatPercentage, formatUtcDate } from './metric-formatters';

describe('metric formatters', () => {
  it('formats finite values with stable precision', () => {
    expect(formatMetric(1.234, 2)).toBe('1.23');
    expect(formatCurrency(12.5, 0)).toBe('€13');
    expect(formatPercentage(12.345, 1)).toBe('12.3%');
    expect(formatMwh(12.5, 0)).toBe('13 MWh');
    const localizedCurrency = (1234.5).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true,
    });
    expect(formatCurrency(1234.5, 2, true)).toBe(`€${localizedCurrency}`);
  });

  it('renders invalid numeric values consistently', () => {
    expect(formatMetric(Number.NaN)).toBe('N/A');
    expect(formatCurrency(Number.POSITIVE_INFINITY)).toBe('N/A');
    expect(formatPercentage(Number.NaN)).toBe('N/A');
    expect(formatMwh(Number.NaN)).toBe('N/A');
    expect(formatUtcDate(new Date('invalid'))).toBe('N/A');
  });

  it('formats dates in the current UTC chart convention', () => {
    expect(formatUtcDate(new Date('2024-01-02T23:00:00Z'))).toBe('2/1');
  });
});
