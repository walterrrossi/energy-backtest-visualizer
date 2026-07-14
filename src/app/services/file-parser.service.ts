import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

export interface ParsedFile {
  rows: Record<string, string>[];
  fileName: string;
}

@Injectable({ providedIn: 'root' })
export class FileParserService {
  async parse(file: File): Promise<ParsedFile> {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const buffer = await file.arrayBuffer();

    switch (ext) {
      case 'csv':
        return this.parseCsv(buffer, file.name);
      case 'xlsx':
        return this.parseXlsx(buffer, file.name);
      case 'parquet':
        return this.parseParquet(buffer, file.name);
      default:
        throw new Error(`Unsupported file format: .${ext}. Please use .csv, .xlsx, or .parquet`);
    }
  }

  private parseCsv(buffer: ArrayBuffer, fileName: string): ParsedFile {
    const text = new TextDecoder('utf-8').decode(buffer);
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) throw new Error('CSV file must have a header row and at least one data row');

    const headers = this.parseCsvLine(lines[0]);
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      if (values.length === 0) continue;
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h.toLowerCase()] = values[idx] ?? '';
      });
      rows.push(row);
    }

    return { rows, fileName };
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  }

  private parseXlsx(buffer: ArrayBuffer, fileName: string): ParsedFile {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error('Excel file has no sheets');

    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
    if (json.length === 0) throw new Error('Excel sheet is empty');

    const rows = json.map(row => {
      const normalized: Record<string, string> = {};
      for (const [key, val] of Object.entries(row)) {
        normalized[key.toLowerCase()] = String(val ?? '');
      }
      return normalized;
    });

    return { rows, fileName };
  }

  private async parseParquet(buffer: ArrayBuffer, fileName: string): Promise<ParsedFile> {
    const initWasm = (await import('parquet-wasm')).default;
    await initWasm('/parquet_wasm_bg.wasm');

    const { readParquet } = await import('parquet-wasm');
    const table = readParquet(new Uint8Array(buffer));
    const batches = table.recordBatches();

    const { tableFromIPC } = await import('apache-arrow');

    const rows: Record<string, string>[] = [];
    for (const batch of batches) {
      const ipc = batch.intoIPCStream();
      const arrowTable = tableFromIPC(ipc);
      const schemaFields = arrowTable.schema.fields;

      const batchRows = arrowTable.toArray().map((row: unknown) => {
        const r: Record<string, string> = {};
        const obj = row as Record<string, unknown>;
        schemaFields.forEach((f: { name: string }) => {
          const name = f.name.toLowerCase();
          r[name] = obj[name] == null ? '' : String(obj[name]);
        });
        return r;
      });
      rows.push(...batchRows);
    }

    return { rows, fileName };
  }
}
