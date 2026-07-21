import { Component, DestroyRef, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { InboundPanelComponent } from './components/inbound-panel/inbound-panel.component';
import { FilterPanelComponent } from './components/filter-panel/filter-panel.component';
import { KpiCardsComponent } from './components/kpi-cards/kpi-cards.component';
import { EquityCurveComponent } from './components/charts/equity-curve.component';
import { PnlBreakdownComponent } from './components/charts/pnl-breakdown.component';
import { LongShortAnalysisComponent } from './components/charts/long-short-analysis.component';
import { RiskMetricsPanelComponent } from './components/risk-metrics-panel/risk-metrics-panel.component';
import { StateService } from './services/state.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    InboundPanelComponent,
    FilterPanelComponent,
    KpiCardsComponent,
    EquityCurveComponent,
    PnlBreakdownComponent,
    LongShortAnalysisComponent,
    RiskMetricsPanelComponent,
  ],
  template: `
    <div class="min-h-screen bg-surface text-slate-100">
      <header class="border-b border-slate-800/80 px-6 py-4">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              class="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center"
            >
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
            <h1 class="text-lg font-bold tracking-tight">Energy Backtest Visualizer</h1>
          </div>
          <span class="text-xs text-slate-600">local &middot; client-side</span>
        </div>
      </header>

      <main class="max-w-7xl mx-auto px-6 py-6">
        <app-inbound-panel />

        @if (state.hasData()) {
          <div class="flex flex-col gap-8">
            <app-filter-panel />

            @if (state.hasFilteredData()) {
              <app-kpi-cards />
              <app-equity-curve />
              <app-pnl-breakdown />
              <app-long-short-analysis />
              <app-risk-metrics-panel />
            } @else {
              <div
                class="rounded-xl border border-slate-700/50 bg-slate-800/50 p-10 text-center text-slate-400"
              >
                <p class="text-sm">No rows match the current filters.</p>
                <p class="text-xs text-slate-600 mt-1">Adjust or reset the filters above.</p>
              </div>
            }
          </div>
        } @else {
          <div class="flex flex-col items-center justify-center py-20 text-slate-600">
            <svg
              class="w-16 h-16 mb-4 opacity-30"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <p class="text-lg font-medium">Upload a backtest file to get started</p>
            <p class="text-sm mt-1">Supports .csv, .xlsx, and .parquet formats</p>
          </div>
        }
      </main>
    </div>
  `,
})
export class App {
  constructor(public state: StateService) {
    const document = inject(DOCUMENT);
    const destroyRef = inject(DestroyRef);

    const prevent = (e: DragEvent) => e.preventDefault();
    document.addEventListener('dragover', prevent);
    document.addEventListener('drop', prevent);

    destroyRef.onDestroy(() => {
      document.removeEventListener('dragover', prevent);
      document.removeEventListener('drop', prevent);
    });
  }
}
