import { Injectable } from '@angular/core';
import type { ValidationError } from '../models/backtest.models';

const REQUIRED_COLS = ['datetime', 'country', 'strategy_tag', 'spread'];
const POSITION_ALIASES = ['qty_mw', 'position'];
const MAX_ROW_ERRORS = 10;

@Injectable({ providedIn: 'root' })
export class SchemaValidatorService {
  validate(rows: Record<string, string>[]): ValidationError[] {
    const errors: ValidationError[] = [];
    if (rows.length === 0) {
      errors.push({ field: 'file', message: 'File contains no data rows' });
      return errors;
    }

    const cols = Object.keys(rows[0]).map(c => c.toLowerCase());

    for (const required of REQUIRED_COLS) {
      if (!cols.includes(required)) {
        errors.push({ field: required, message: `Missing required column: "${required}"` });
      }
    }

    const hasPosition = POSITION_ALIASES.some(a => cols.includes(a));
    if (!hasPosition) {
      errors.push({
        field: 'qty_mw',
        message: `Missing position column. Expected one of: ${POSITION_ALIASES.map(a => `"${a}"`).join(', ')}`,
      });
    }

    const positionKey = POSITION_ALIASES.find(a => cols.includes(a)) || 'qty_mw';

    let country: string | null = null;
    let rowErrorCount = 0;
    let truncated = false;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      if (row['datetime'] == null || row['datetime'].trim() === '') {
        if (rowErrorCount < MAX_ROW_ERRORS) {
          errors.push({ field: 'datetime', message: 'Empty datetime value', row: i + 2 });
        }
        rowErrorCount++;
      }

      const rowCountry = row['country']?.trim();
      if (country === null && rowCountry) {
        country = rowCountry;
      } else if (rowCountry && rowCountry !== country) {
        if (rowErrorCount < MAX_ROW_ERRORS) {
          errors.push({
            field: 'country',
            message: `Multiple countries detected: "${country}" and "${rowCountry}". Single file must have one country.`,
            row: i + 2,
          });
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

      const spreadVal = parseFloat(row['spread']);
      if (isNaN(spreadVal)) {
        if (rowErrorCount < MAX_ROW_ERRORS) {
          errors.push({ field: 'spread', message: `Invalid numeric value: "${row['spread']}"`, row: i + 2 });
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
