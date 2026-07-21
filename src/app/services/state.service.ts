import { Injectable, computed, signal } from '@angular/core';
import { DEFAULT_ANALYSIS_SETTINGS, EMPTY_FILTERS } from '../models/backtest.models';
import type {
  AnalysisSettings,
  BacktestAnalysis,
  BacktestDataset,
  DatasetFilters,
  SummaryMetrics,
} from '../models/backtest.models';
import { MetricsEngineService } from './metrics-engine.service';

@Injectable({ providedIn: 'root' })
export class StateService {
  dataset = signal<BacktestDataset | null>(null);
  analysisSettings = signal<AnalysisSettings>({ ...DEFAULT_ANALYSIS_SETTINGS });
  filters = signal<DatasetFilters>({ ...EMPTY_FILTERS });

  availableZones = computed<string[]>(() => this.dataset()?.metadata.zones ?? []);
  hasMultipleZones = computed(() => this.availableZones().length > 1);
  datasetRange = computed(() => {
    const meta = this.dataset()?.metadata;
    if (!meta) return null;
    return { start: meta.start, end: meta.end };
  });

  filteredDataset = computed<BacktestDataset | null>(() => {
    const dataset = this.dataset();
    if (!dataset) return null;
    const filters = this.filters();
    const hasFilters = filters.start !== null || filters.end !== null || filters.zone !== null;
    if (!hasFilters) return dataset;

    const startMs = filters.start ? filters.start.getTime() : -Infinity;
    const endMs = filters.end ? filters.end.getTime() + (24 * 60 * 60 * 1000 - 1) : Infinity;
    const zone = filters.zone;
    const rows = dataset.rows.filter((row) => {
      if (zone !== null && row.market.zone !== zone) return false;
      const t = row.datetime.getTime();
      if (t < startMs || t > endMs) return false;
      return true;
    });

    if (rows.length === 0) {
      return {
        ...dataset,
        rows: [],
        rawRowCount: 0,
        metadata: { ...dataset.metadata, start: dataset.metadata.start, end: dataset.metadata.end },
      };
    }
    const sorted = [...rows].sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
    return {
      ...dataset,
      rows,
      metadata: { ...dataset.metadata, start: sorted[0].datetime, end: sorted.at(-1)!.datetime },
    };
  });

  analysis = computed<BacktestAnalysis | null>(() => {
    const d = this.filteredDataset();
    if (!d || d.rows.length === 0) return null;
    return this.engine.compute(d, this.analysisSettings());
  });
  metrics = computed<SummaryMetrics | null>(() => this.analysis()?.summary ?? null);

  hasData = computed(() => this.dataset() !== null);
  hasFilteredData = computed(() => this.analysis() !== null);

  constructor(private engine: MetricsEngineService) {}

  setDataset(ds: BacktestDataset) {
    this.filters.set({ start: ds.metadata.start, end: ds.metadata.end, zone: null });
    this.dataset.set(ds);
  }

  setFilters(filters: Partial<DatasetFilters>) {
    this.filters.update((current) => ({ ...current, ...filters }));
  }

  resetFilters() {
    const meta = this.dataset()?.metadata;
    if (!meta) {
      this.filters.set({ ...EMPTY_FILTERS });
      return;
    }
    this.filters.set({ start: meta.start, end: meta.end, zone: null });
  }

  setAnalysisSettings(settings: Partial<AnalysisSettings>) {
    this.analysisSettings.update((current) => ({ ...current, ...settings }));
  }

  clear() {
    this.dataset.set(null);
    this.filters.set({ ...EMPTY_FILTERS });
  }
}
