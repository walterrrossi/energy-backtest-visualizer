import { Injectable } from '@angular/core';
import { computeBacktestAnalysis } from '../analytics/compute-backtest-analysis';
import { DEFAULT_ANALYSIS_SETTINGS } from '../models/backtest.models';
import type { AnalysisSettings, BacktestAnalysis, BacktestDataset } from '../models/backtest.models';

@Injectable({ providedIn: 'root' })
export class MetricsEngineService {
  compute(dataset: BacktestDataset, settings: AnalysisSettings = DEFAULT_ANALYSIS_SETTINGS): BacktestAnalysis {
    return computeBacktestAnalysis(dataset, settings);
  }
}
