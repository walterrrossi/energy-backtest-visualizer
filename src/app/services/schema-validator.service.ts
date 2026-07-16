import { Injectable } from '@angular/core';
import type { ColumnMapping, ValidationError } from '../models/backtest.models';

const POSITION_ALIASES = ['qty_mw', 'position'];
const MAX_ROW_ERRORS = 10;

@Injectable({ providedIn: 'root' })
export class SchemaValidatorService {
  validate(rows: Record<string, string>[], mapping?: Partial<ColumnMapping>): ValidationError[] {
    const errors: ValidationError[] = [];
    if (rows.length === 0) {
      errors.push({ field: 'file', message: 'File contains no data rows' });
      return errors;
    }

    const cols = Object.keys(rows[0]).map(c => c.toLowerCase());
    const datetimeKey = mapping?.datetime ?? 'datetime';
    const countryKey = mapping?.country ?? 'country';
    const strategyKey = mapping?.strategyTag ?? 'strategy_tag';
    const spreadKey = mapping?.spread ?? 'spread';

    for (const [field, key] of [
      ['datetime', datetimeKey],
      ['country', countryKey],
      ['strategy_tag', strategyKey],
      ['spread', spreadKey],
    ] as const) {
      if (!cols.includes(key.toLowerCase())) {
        errors.push({ field, message: `Missing required column: "${key}"` });
      }
    }

    const mappedPosition = mapping?.quantityMw;
    const hasPosition = mappedPosition ? cols.includes(mappedPosition.toLowerCase()) : POSITION_ALIASES.some(a => cols.includes(a));
    if (!hasPosition) {
      errors.push({
        field: 'qty_mw',
        message: mappedPosition
          ? `Missing position column: "${mappedPosition}"`
          : `Missing position column. Expected one of: ${POSITION_ALIASES.map(a => `"${a}"`).join(', ')}`,
      });
    }

    const positionKey = mappedPosition || POSITION_ALIASES.find(a => cols.includes(a)) || 'qty_mw';

    let rowErrorCount = 0;
    let truncated = false;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      if (row[datetimeKey] == null || row[datetimeKey].trim() === '') {
        if (rowErrorCount < MAX_ROW_ERRORS) {
          errors.push({ field: 'datetime', message: 'Empty datetime value', row: i + 2 });
        }
        rowErrorCount++;
      }

      const posVal = parseFloat(row[positionKey]);
      if (isNaN(posVal)) {
        if (rowErrorCount < MAX_ROW_ERRORS) {
          errors.push({ field: positionKey, message: `Invalid numeric value: "${row[positionKey]}"`, row: i + 2 });
        }
        rowErrorCount++;
      }

      const spreadVal = parseFloat(row[spreadKey]);
      if (isNaN(spreadVal)) {
        if (rowErrorCount < MAX_ROW_ERRORS) {
          errors.push({ field: spreadKey, message: `Invalid numeric value: "${row[spreadKey]}"`, row: i + 2 });
        }
        rowErrorCount++;
      }

      if (rowErrorCount > MAX_ROW_ERRORS && !truncated) {
        truncated = true;
      }
    }

    if (truncated) {
      const hidden = rowErrorCount - MAX_ROW_ERRORS;
      errors.push({ field: 'file', message: `...and ${hidden} more row-level errors (showing first ${MAX_ROW_ERRORS})` });
    }

    return errors;
  }
}
