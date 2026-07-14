import { Injectable, computed, signal } from '@angular/core';
import type { BacktestDataset } from '../models/backtest.models';
import type { MetricsResult } from '../models/backtest.models';
import { MetricsEngineService } from './metrics-engine.service';

@Injectable({ providedIn: 'root' })
export class StateService {
  dataset = signal<BacktestDataset | null>(null);
  metrics = computed<MetricsResult | null>(() => {
    const d = this.dataset();
    if (!d) return null;
    return this.engine.compute(d);
  });

  hasData = computed(() => this.dataset() !== null);

  constructor(private engine: MetricsEngineService) {}

  setDataset(ds: BacktestDataset) {
    this.dataset.set(ds);
  }

  clear() {
    this.dataset.set(null);
  }
}
