import { Injectable, computed, signal } from '@angular/core';
import { DEFAULT_ANALYSIS_SETTINGS } from '../models/backtest.models';
import type { AnalysisSettings, BacktestAnalysis, BacktestDataset, SummaryMetrics } from '../models/backtest.models';
import { MetricsEngineService } from './metrics-engine.service';

@Injectable({ providedIn: 'root' })
export class StateService {
  dataset = signal<BacktestDataset | null>(null);
  analysisSettings = signal<AnalysisSettings>({ ...DEFAULT_ANALYSIS_SETTINGS });
  analysis = computed<BacktestAnalysis | null>(() => {
    const d = this.dataset();
    if (!d) return null;
    return this.engine.compute(d, this.analysisSettings());
  });
  metrics = computed<SummaryMetrics | null>(() => this.analysis()?.summary ?? null);

  hasData = computed(() => this.dataset() !== null);

  constructor(private engine: MetricsEngineService) {}

  setDataset(ds: BacktestDataset) {
    this.dataset.set(ds);
  }

  setAnalysisSettings(settings: Partial<AnalysisSettings>) {
    this.analysisSettings.update(current => ({ ...current, ...settings }));
  }

  clear() {
    this.dataset.set(null);
  }
}
