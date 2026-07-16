import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FileParserService } from '../../services/file-parser.service';
import { SchemaValidatorService } from '../../services/schema-validator.service';
import { BacktestNormalizerService } from '../../core/normalization/backtest-normalizer.service';
import { StateService } from '../../services/state.service';
import { ColumnMapperService } from '../../core/normalization/column-mapper.service';
import type { ColumnMapping, DataDiagnostic, ValidationError } from '../../models/backtest.models';
import type { ColumnMappingAmbiguity } from '../../core/normalization/column-mapper.service';

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

    @if (warnings().length > 0) {
      <div class="mt-3 p-3 rounded-lg bg-amber-900/20 border border-amber-800/50">
        <p class="text-amber-400 font-medium text-sm mb-1">Data Quality Notes:</p>
        <ul class="text-amber-300 text-xs space-y-0.5">
          @for (warning of warnings(); track warning.code + warning.row) {
            <li>&bull; {{ warning.message }}{{ warning.row ? ' (row ' + warning.row + ')' : '' }}</li>
          }
        </ul>
      </div>
    }

    @if (mappingReview(); as review) {
      <div class="mt-3 p-3 rounded-lg bg-sky-900/20 border border-sky-800/50 text-left">
        <p class="text-sky-300 font-medium text-sm mb-2">Confirm ambiguous column mappings</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          @for (ambiguity of review.ambiguities; track ambiguity.field) {
            <label class="flex items-center justify-between gap-2 text-xs text-slate-300">
              <span>{{ ambiguity.field }}</span>
              <select [value]="review.mapping[ambiguity.field]" (change)="updateMapping(ambiguity.field, $any($event.target).value)"
                class="rounded border-slate-600 bg-slate-700 text-slate-300 text-xs">
                @for (candidate of ambiguity.candidates; track candidate) {
                  <option [value]="candidate">{{ candidate }}</option>
                }
              </select>
            </label>
          }
        </div>
        <button class="mt-3 rounded bg-sky-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-600" (click)="applyMapping()">
          Apply mappings
        </button>
      </div>
    }

    <div class="mt-4 flex items-center gap-3">
      <label class="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" [checked]="state.analysisSettings().invertPnl" (change)="toggleInvert()"
          class="rounded border-slate-600 bg-slate-700 text-positive focus:ring-positive/50" />
        <span class="text-xs text-slate-400">Invert P&amp;L sign (Short = positive)</span>
      </label>
      <label class="flex items-center gap-2 text-xs text-slate-400">
        <span>P&amp;L:</span>
        <select [value]="state.analysisSettings().pnlMode" (change)="setPnlMode($any($event.target).value)"
          class="rounded border-slate-600 bg-slate-700 text-slate-300 text-xs">
          <option value="gross">Gross</option>
          <option value="net">Net</option>
        </select>
      </label>
      <label class="flex items-center gap-2 text-xs text-slate-400">
        <span>Returns:</span>
        <select [value]="state.analysisSettings().returnAggregation" (change)="setReturnAggregation($any($event.target).value)"
          class="rounded border-slate-600 bg-slate-700 text-slate-300 text-xs">
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="interval">Interval</option>
        </select>
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
  warnings = signal<DataDiagnostic[]>([]);
  mappingReview = signal<{
    rows: Record<string, string>[];
    fileName: string;
    mapping: Partial<ColumnMapping>;
    ambiguities: ColumnMappingAmbiguity[];
  } | null>(null);

  constructor(
    private fileParser: FileParserService,
    private validator: SchemaValidatorService,
    private normalizer: BacktestNormalizerService,
    private columnMapper: ColumnMapperService,
    protected state: StateService,
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
    this.state.setAnalysisSettings({ invertPnl: !this.state.analysisSettings().invertPnl });
  }

  setPnlMode(mode: 'gross' | 'net') {
    this.state.setAnalysisSettings({ pnlMode: mode });
  }

  setReturnAggregation(returnAggregation: 'interval' | 'daily' | 'weekly') {
    this.state.setAnalysisSettings({ returnAggregation });
  }

  updateMapping(field: keyof ColumnMapping, value: string) {
    this.mappingReview.update(review => review ? { ...review, mapping: { ...review.mapping, [field]: value } } : review);
  }

  applyMapping() {
    const review = this.mappingReview();
    if (!review) return;
    this.mappingReview.set(null);
    this.isLoading.set(true);
    try {
      this.importRows(review.rows, review.fileName, review.mapping);
    } catch (err) {
      this.errors.set([{ field: 'file', message: (err as Error).message }]);
    } finally {
      this.isLoading.set(false);
    }
  }

  clear() {
    this.fileName.set('');
    this.rowCount.set(0);
    this.granularity.set('');
    this.errors.set([]);
    this.warnings.set([]);
    this.mappingReview.set(null);
    this.state.clear();
  }

  private async processFile(file: File) {
    this.isLoading.set(true);
    this.errors.set([]);
    this.warnings.set([]);
    this.fileName.set('');

    try {
      const parsed = await this.fileParser.parse(file);

      if (parsed.rows.length > 100000) {
        this.errors.set([{
          field: 'file',
          message: `File has ${parsed.rows.length.toLocaleString()} rows. Processing may be slow — consider filtering to a smaller date range.`,
        }]);
      }

      const detection = this.columnMapper.detect(parsed.rows);
      if (detection.ambiguities.length > 0) {
        this.mappingReview.set({
          rows: parsed.rows,
          fileName: file.name,
          mapping: detection.mapping,
          ambiguities: detection.ambiguities,
        });
        return;
      }
      this.importRows(parsed.rows, file.name, detection.mapping);
    } catch (err) {
      this.errors.set([{ field: 'file', message: (err as Error).message }]);
    } finally {
      this.isLoading.set(false);
    }
  }

  private importRows(rows: Record<string, string>[], fileName: string, mapping: Partial<ColumnMapping>) {
    const validationErrors = this.validator.validate(rows, mapping);
    if (validationErrors.length > 0) {
      this.errors.set(validationErrors);
      return;
    }

    const normalized = this.normalizer.normalize(rows, mapping, fileName);
    this.state.setDataset({
      id: `${fileName}:${Date.now()}`,
      name: fileName,
      fileName,
      importedAt: new Date(),
      rows: normalized.rows,
      rawRowCount: rows.length,
      metadata: normalized.metadata,
      mapping: normalized.mapping,
      qualityReport: normalized.qualityReport,
    });
    this.warnings.set(normalized.qualityReport.diagnostics.filter(diagnostic => diagnostic.severity !== 'error'));
    this.fileName.set(fileName);
    this.rowCount.set(normalized.rows.length);
    this.granularity.set(normalized.metadata.granularity);
  }

}
