import { Injectable } from '@angular/core';
import type {
  BacktestRow,
  ColumnMapping,
  DataDiagnostic,
  DataQualityReport,
  DatasetMetadata,
  Direction,
  Granularity,
  MetadataValue,
  NormalizationResult,
} from '../../models/backtest.models';
import { ColumnMapperService } from './column-mapper.service';
import { GranularityDetectorService } from '../../services/granularity-detector.service';

const REQUIRED_MAPPING_FIELDS: (keyof ColumnMapping)[] = [
  'datetime',
  'country',
  'strategyTag',
  'quantityMw',
  'spread',
];

const MAPPED_FIELDS = new Set<string>([
  'datetime', 'country', 'zone', 'strategyTag', 'quantityMw', 'spread', 'currency', 'timezone',
  'probability', 'prediction', 'target', 'confidence', 'rawValue', 'costs', 'slippage',
  'executedQuantityMw', 'modelVersion', 'calibrationVersion',
]);

@Injectable({ providedIn: 'root' })
export class BacktestNormalizerService {
  constructor(
    private columnMapper: ColumnMapperService,
    private granularityDetector: GranularityDetectorService,
  ) {}

  normalize(
    rawRows: Record<string, string>[],
    overrides: Partial<ColumnMapping> = {},
    sourceName = 'dataset',
  ): NormalizationResult {
    const detection = this.columnMapper.detect(rawRows);
    const mapping = this.columnMapper.merge(detection.mapping, overrides);
    const diagnostics: DataDiagnostic[] = detection.ambiguities
      .filter(ambiguity => !overrides[ambiguity.field])
      .map(ambiguity => ({
        code: 'AMBIGUOUS_COLUMN_MAPPING',
        severity: 'warning',
        field: ambiguity.field,
        message: `Multiple source columns match ${ambiguity.field}; using "${mapping[ambiguity.field]}".`,
        details: { candidates: ambiguity.candidates },
      }));

    const missingFields = REQUIRED_MAPPING_FIELDS.filter(field => !mapping[field]);
    if (missingFields.length > 0) {
      throw new Error(`Unable to map required columns: ${missingFields.join(', ')}`);
    }

    const rows: BacktestRow[] = [];
    let invalidRowCount = 0;

    rawRows.forEach((raw, index) => {
      const rowNumber = index + 2;
      const datetime = this.parseDatetime(raw[mapping.datetime!]);
      const country = raw[mapping.country!]?.trim() ?? '';
      const strategyTag = raw[mapping.strategyTag!]?.trim() ?? '';
      const quantityMw = this.parseRequiredNumber(raw[mapping.quantityMw!], 'quantityMw', rowNumber, diagnostics);
      const spread = this.parseRequiredNumber(raw[mapping.spread!], 'spread', rowNumber, diagnostics);

      if (!datetime || !country || !strategyTag || quantityMw === undefined || spread === undefined) {
        invalidRowCount++;
        if (!datetime) diagnostics.push({ code: 'INVALID_DATETIME', severity: 'error', field: 'datetime', row: rowNumber, message: 'Invalid datetime value.' });
        if (!country) diagnostics.push({ code: 'EMPTY_COUNTRY', severity: 'error', field: 'country', row: rowNumber, message: 'Country is empty.' });
        if (!strategyTag) diagnostics.push({ code: 'EMPTY_STRATEGY_TAG', severity: 'error', field: 'strategyTag', row: rowNumber, message: 'Strategy tag is empty.' });
        return;
      }

      const direction: Direction = quantityMw > 0 ? 'long' : quantityMw < 0 ? 'short' : 'flat';
      const optional = this.optionalNumbers(raw, mapping, rowNumber, diagnostics);
      const metadata = this.metadata(raw, mapping);
      const zone = this.optionalText(raw, mapping.zone);
      const currency = this.optionalText(raw, mapping.currency) || 'EUR';
      const timezone = this.optionalText(raw, mapping.timezone);

      rows.push({
        id: `${sourceName}:row-${rowNumber}`,
        datetime,
        market: { country, ...(zone ? { zone } : {}), currency, ...(timezone ? { timezone } : {}) },
        strategy: {
          tag: strategyTag,
          ...(this.optionalText(raw, mapping.modelVersion) ? { modelVersion: this.optionalText(raw, mapping.modelVersion) } : {}),
          ...(this.optionalText(raw, mapping.calibrationVersion) ? { calibrationVersion: this.optionalText(raw, mapping.calibrationVersion) } : {}),
        },
        position: { quantityMw, direction },
        prices: { spread },
        ...(Object.keys(optional.signal).length > 0 ? { signal: optional.signal } : {}),
        ...(Object.keys(optional.execution).length > 0 ? { execution: optional.execution } : {}),
        ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
      });
    });

    if (rows.length === 0) throw new Error('No valid data rows remain after normalization.');

    const granularity = this.granularityDetector.detect(rows.map(row => row.datetime));
    const qualityReport = this.buildQualityReport(rows, granularity, diagnostics, invalidRowCount);
    const metadata = this.buildMetadata(rows, granularity);

    return {
      rows,
      mapping: mapping as ColumnMapping,
      qualityReport,
      metadata,
    };
  }

  private parseDatetime(raw: string | undefined): Date | undefined {
    if (!raw?.trim()) return undefined;
    const value = raw.trim();
    const normalized = /[+-]\d{4}$/.test(value)
      ? `${value.slice(0, -5)}${value.slice(-5, -2)}:${value.slice(-2)}`
      : value.replace(' ', 'T');
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private parseRequiredNumber(
    raw: string | undefined,
    field: string,
    row: number,
    diagnostics: DataDiagnostic[],
  ): number | undefined {
    if (!raw?.trim()) return undefined;
    const value = Number(raw);
    if (Number.isFinite(value)) return value;
    diagnostics.push({ code: 'INVALID_NUMERIC_VALUE', severity: 'error', field, row, message: `Invalid numeric value for ${field}.` });
    return undefined;
  }

  private optionalNumbers(
    raw: Record<string, string>,
    mapping: Partial<ColumnMapping>,
    row: number,
    diagnostics: DataDiagnostic[],
  ): { signal: NonNullable<BacktestRow['signal']>; execution: NonNullable<BacktestRow['execution']> } {
    const parse = (field: keyof ColumnMapping): number | undefined => {
      const source = mapping[field];
      const value = raw[source!]?.trim();
      if (!source || !value) return undefined;
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
      diagnostics.push({ code: 'INVALID_OPTIONAL_NUMERIC_VALUE', severity: 'warning', field, row, message: `Optional numeric field ${field} is invalid and was ignored.` });
      return undefined;
    };

    const rawValue = parse('rawValue');
    const prediction = parse('prediction');
    const probability = parse('probability');
    const confidence = parse('confidence');
    const target = parse('target');
    const costs = parse('costs');
    const slippage = parse('slippage');
    const executedQuantityMw = parse('executedQuantityMw');
    const signal = {
      ...(rawValue !== undefined ? { rawValue } : {}),
      ...(prediction !== undefined ? { prediction } : {}),
      ...(probability !== undefined ? { probability } : {}),
      ...(confidence !== undefined ? { confidence } : {}),
      ...(target !== undefined ? { target } : {}),
    };
    const execution = {
      ...(costs !== undefined ? { costs } : {}),
      ...(slippage !== undefined ? { slippage } : {}),
      ...(executedQuantityMw !== undefined ? { executedQuantityMw } : {}),
    };
    return { signal, execution };
  }

  private optionalText(raw: Record<string, string>, source: string | undefined): string | undefined {
    const value = source ? raw[source]?.trim() : undefined;
    return value || undefined;
  }

  private metadata(raw: Record<string, string>, mapping: Partial<ColumnMapping>): Record<string, MetadataValue> {
    const mappedColumns = new Set(Object.values(mapping).filter((value): value is string => Boolean(value)));
    const metadata: Record<string, MetadataValue> = {};
    for (const [key, value] of Object.entries(raw)) {
      if (!mappedColumns.has(key) && !MAPPED_FIELDS.has(key) && value !== '') metadata[key] = value;
    }
    return metadata;
  }

  private buildMetadata(rows: BacktestRow[], granularity: Granularity): DatasetMetadata {
    const dates = rows.map(row => row.datetime).sort((a, b) => a.getTime() - b.getTime());
    const currencies = [...new Set(rows.map(row => row.market.currency))];
    const timezones = [...new Set(rows.map(row => row.market.timezone).filter((value): value is string => Boolean(value)))];
    return {
      granularity,
      currency: currencies[0] ?? 'EUR',
      ...(timezones.length === 1 ? { timezone: timezones[0] } : {}),
      countries: [...new Set(rows.map(row => row.market.country))],
      zones: [...new Set(rows.map(row => row.market.zone).filter((value): value is string => Boolean(value)))],
      strategyTags: [...new Set(rows.map(row => row.strategy.tag))],
      start: dates[0],
      end: dates[dates.length - 1],
    };
  }

  private buildQualityReport(
    rows: BacktestRow[],
    granularity: Granularity,
    diagnostics: DataDiagnostic[],
    invalidRowCount: number,
  ): DataQualityReport {
    const sorted = [...rows].sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
    let duplicateTimestampCount = 0;
    let missingIntervalCount = 0;
    const expectedMs = this.granularityDetector.grainFactor(granularity) * 60 * 60 * 1000;

    for (let i = 1; i < sorted.length; i++) {
      const delta = sorted[i].datetime.getTime() - sorted[i - 1].datetime.getTime();
      if (delta === 0) duplicateTimestampCount++;
      if (delta > expectedMs) missingIntervalCount += Math.max(0, Math.round(delta / expectedMs) - 1);
    }

    if (duplicateTimestampCount > 0) diagnostics.push({ code: 'DUPLICATE_TIMESTAMP', severity: 'warning', message: `${duplicateTimestampCount} duplicate timestamp(s) detected.`, details: { count: duplicateTimestampCount } });
    if (missingIntervalCount > 0) diagnostics.push({ code: 'MISSING_INTERVALS', severity: 'warning', message: `${missingIntervalCount} interval(s) are missing.`, details: { count: missingIntervalCount, granularity } });
    if (rows.some((row, index) => index > 0 && row.datetime < rows[index - 1].datetime)) diagnostics.push({ code: 'UNSORTED_TIMESTAMPS', severity: 'info', message: 'Input timestamps were not sorted chronologically.' });

    const errors = diagnostics.filter(diagnostic => diagnostic.severity === 'error').length;
    const warnings = diagnostics.filter(diagnostic => diagnostic.severity === 'warning').length;
    const qualityScore = Math.max(0, Math.min(100, 100 - errors * 20 - warnings));
    return { diagnostics, invalidRowCount, duplicateTimestampCount, missingIntervalCount, qualityScore };
  }
}
