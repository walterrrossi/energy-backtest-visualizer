import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FileParserService } from '../../services/file-parser.service';
import { SchemaValidatorService } from '../../services/schema-validator.service';
import { GranularityDetectorService } from '../../services/granularity-detector.service';
import { MetricsEngineService } from '../../services/metrics-engine.service';
import { StateService } from '../../services/state.service';
import type { BacktestDataset, BacktestRow, ValidationError } from '../../models/backtest.models';

@Component({
  selector: 'app-inbound-panel',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div
      class="border border-dotted rounded-xl p-8 text-center cursor-pointer transition-all duration-300"
      [class.border-positive]="isDragOver()"
      [class.border-slate-600]="!isDragOver()"
      [class.bg-positive/5]="isDragOver()"
      class="hover:border-slate-500"
      (dragenter)="onDragEnter($event)"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
      (click)="fileInput.click()"
      role="button"
      tabindex="0"
      (keydown.enter)="fileInput.click()"
    >
      <input #fileInput type="file" accept=".csv,.xlsx,.parquet" class="hidden" (change)="onFileSelect($event)" />

      @if (isLoading()) {
        <div class="flex flex-col items-center gap-3">
          <div class="w-8 h-8 border-2 border-positive border-t-transparent rounded-full animate-spin"></div>
          <p class="text-slate-400 text-sm">Processing file...</p>
        </div>
      } @else {
        <svg class="w-12 h-12 mx-auto mb-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p class="text-slate-300 font-medium">Drop your file here, or click to browse</p>
        <p class="text-slate-500 text-sm mt-1">.csv &middot; .xlsx &middot; .parquet</p>
      }
    </div>

    @if (fileName()) {
      <div class="mt-3 flex items-center gap-2 text-sm">
        <span class="text-positive font-medium">&#10003;</span>
        <span class="text-slate-300">{{ fileName() }}</span>
        <span class="text-slate-500">({{ rowCount() }} rows, {{ granularity() }})</span>
        <button class="ml-auto text-rose-400 hover:text-rose-300 text-xs" (click)="clear()">Clear</button>
      </div>
    }

    @if (errors().length > 0) {
      <div class="mt-3 p-3 rounded-lg bg-rose-900/20 border border-rose-800/50">
        <p class="text-rose-400 font-medium text-sm mb-1">Validation Errors:</p>
        <ul class="text-rose-300 text-xs space-y-0.5">
          @for (e of errors(); track e) {
            <li>&bull; {{ e.message }}{{ e.row ? ' (row ' + e.row + ')' : '' }}</li>
          }
        </ul>
      </div>
    }

    <div class="mt-4 flex items-center gap-3">
      <label class="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" [checked]="engine.invertPnl()" (change)="toggleInvert()"
          class="rounded border-slate-600 bg-slate-700 text-positive focus:ring-positive/50" />
        <span class="text-xs text-slate-400">Invert P&amp;L sign (Short = positive)</span>
      </label>
    </div>
  `,
})
export class InboundPanelComponent {
  isDragOver = signal(false);
  isLoading = signal(false);
  fileName = signal('');
  rowCount = signal(0);
  granularity = signal('');
  errors = signal<ValidationError[]>([]);

  constructor(
    private fileParser: FileParserService,
    private validator: SchemaValidatorService,
    private granularityDetector: GranularityDetectorService,
    protected engine: MetricsEngineService,
    private state: StateService,
  ) {}

  onDragEnter(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    this.isDragOver.set(true);
  }

  onDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragOver.set(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) this.processFile(file);
  }

  onFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.processFile(file);
    input.value = '';
  }

  toggleInvert() {
    this.engine.invertPnl.set(!this.engine.invertPnl());
  }

  clear() {
    this.fileName.set('');
    this.rowCount.set(0);
    this.granularity.set('');
    this.errors.set([]);
    this.state.clear();
  }

  private async processFile(file: File) {
    this.isLoading.set(true);
    this.errors.set([]);
    this.fileName.set('');

    try {
      const parsed = await this.fileParser.parse(file);

      if (parsed.rows.length > 100000) {
        this.errors.set([{
          field: 'file',
          message: `File has ${parsed.rows.length.toLocaleString()} rows. Processing may be slow — consider filtering to a smaller date range.`,
        }]);
      }

      const validationErrors = this.validator.validate(parsed.rows);
      if (validationErrors.length > 0) {
        this.errors.set(validationErrors);
        this.isLoading.set(false);
        return;
      }

      const positionKey = parsed.rows[0]['qty_mw'] !== undefined ? 'qty_mw' : 'position';
      const zoneKey = parsed.rows[0]['zone'] !== undefined ? 'zone' : null;
      const country = parsed.rows[0]['country']?.trim() || '';

      const backtestRows: BacktestRow[] = parsed.rows.map(r => ({
        datetime: this.parseDatetime(r['datetime']),
        country,
        zone: zoneKey ? (r[zoneKey]?.trim() || '') : '',
        strategyTag: r['strategy_tag']?.trim() || '',
        qtyMw: parseFloat(r[positionKey]),
        spread: parseFloat(r['spread']),
      }));

      const datetimes = backtestRows.map(r => r.datetime);
      const gran = this.granularityDetector.detect(datetimes);

      const zones = [...new Set(backtestRows.map(r => r.zone).filter(Boolean))];
      const strategyTags = [...new Set(backtestRows.map(r => r.strategyTag).filter(Boolean))];

      const dataset: BacktestDataset = {
        rows: backtestRows,
        granularity: gran,
        country,
        zones,
        strategyTags,
        fileName: file.name,
        rawRowCount: parsed.rows.length,
      };

      this.state.setDataset(dataset);
      this.fileName.set(file.name);
      this.rowCount.set(backtestRows.length);
      this.granularity.set(gran);
    } catch (err) {
      this.errors.set([{ field: 'file', message: (err as Error).message }]);
    } finally {
      this.isLoading.set(false);
    }
  }

  private parseDatetime(raw: string): Date {
    raw = raw.trim();
    if (raw.endsWith('Z')) return new Date(raw);
    if (/[+-]\d{2}:\d{2}$/.test(raw)) return new Date(raw);
    if (/[+-]\d{4}$/.test(raw)) {
      const tz = raw.slice(-5);
      return new Date(raw.slice(0, -5) + tz.slice(0, 3) + ':' + tz.slice(3));
    }
    const iso = raw.replace(' ', 'T');
    return new Date(iso);
  }
}
