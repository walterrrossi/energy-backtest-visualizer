import { Injectable } from '@angular/core';
import type { ColumnMapping } from '../../models/backtest.models';

export interface ColumnMappingAmbiguity {
  field: keyof ColumnMapping;
  candidates: string[];
}

export interface ColumnDetectionResult {
  mapping: Partial<ColumnMapping>;
  availableColumns: string[];
  ambiguities: ColumnMappingAmbiguity[];
}

type MappingField = keyof ColumnMapping;

const ALIASES: Record<MappingField, string[]> = {
  datetime: ['datetime', 'timestamp', 'date_time', 'date', 'time'],
  country: ['country', 'country_code', 'market_country'],
  zone: ['zone', 'bidding_zone', 'market_zone'],
  strategyTag: ['strategy_tag', 'strategy', 'strategy_name', 'strategytag', 'tag'],
  quantityMw: ['qty_mw', 'qtymw', 'quantity_mw', 'quantity', 'position', 'position_mw', 'qty'],
  spread: ['spread', 'price_spread', 'pnl_spread'],
  currency: ['currency', 'currency_code'],
  timezone: ['timezone', 'time_zone', 'tz'],
  probability: ['probability', 'prob', 'predicted_probability'],
  prediction: ['prediction', 'predicted', 'pred'],
  target: ['target', 'label', 'actual'],
  confidence: ['confidence', 'score_confidence'],
  rawValue: ['raw_value', 'raw_score', 'signal', 'score'],
  costs: ['costs', 'cost', 'transaction_costs', 'fees'],
  slippage: ['slippage', 'slippage_cost'],
  executedQuantityMw: ['executed_qty_mw', 'executed_quantity_mw', 'filled_qty_mw'],
  modelVersion: ['model_version', 'modelversion'],
  calibrationVersion: ['calibration_version', 'calibrationversion'],
};

const normalizeColumn = (value: string): string => value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

@Injectable({ providedIn: 'root' })
export class ColumnMapperService {
  detect(rows: Record<string, string>[]): ColumnDetectionResult {
    const availableColumns = [...new Set(rows.flatMap(row => Object.keys(row)))];
    const normalizedColumns = availableColumns.map(column => ({ column, normalized: normalizeColumn(column) }));
    const mapping: Partial<ColumnMapping> = {};
    const ambiguities: ColumnMappingAmbiguity[] = [];

    for (const [field, aliases] of Object.entries(ALIASES) as [MappingField, string[]][]) {
      const normalizedAliases = aliases.map(normalizeColumn);
      const candidates = normalizedColumns
        .filter(({ normalized }) => normalizedAliases.includes(normalized))
        .map(({ column }) => column);

      if (candidates.length > 0) {
        mapping[field] = candidates[0] as never;
        if (candidates.length > 1) ambiguities.push({ field, candidates });
      }
    }

    return { mapping, availableColumns, ambiguities };
  }

  merge(detected: Partial<ColumnMapping>, overrides: Partial<ColumnMapping>): Partial<ColumnMapping> {
    return { ...detected, ...overrides };
  }

  savePreset(name: string, mapping: ColumnMapping): void {
    if (typeof localStorage === 'undefined') return;
    const presets = this.readPresets();
    presets[name] = mapping;
    localStorage.setItem('energy-backtest-column-mappings', JSON.stringify(presets));
  }

  loadPreset(name: string): ColumnMapping | null {
    return this.readPresets()[name] ?? null;
  }

  exportPreset(mapping: ColumnMapping): string {
    return JSON.stringify({ version: 1, mapping }, null, 2);
  }

  importPreset(serialized: string): ColumnMapping {
    const parsed: unknown = JSON.parse(serialized);
    if (!parsed || typeof parsed !== 'object' || !('mapping' in parsed)) {
      throw new Error('Invalid column mapping preset');
    }
    return (parsed as { mapping: ColumnMapping }).mapping;
  }

  private readPresets(): Record<string, ColumnMapping> {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem('energy-backtest-column-mappings');
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<string, ColumnMapping>;
    } catch {
      return {};
    }
  }
}
