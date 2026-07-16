import { Component, computed } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { StateService } from '../../services/state.service';
import { formatCurrency } from '../../shared/formatting/metric-formatters';

@Component({
  selector: 'app-long-short-analysis',
  standalone: true,
  imports: [BaseChartDirective],
  template: `
    <div class="rounded-xl border border-slate-600/30 bg-slate-800/60 p-5">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <h3 class="text-sm font-semibold text-slate-300 mb-3">Long vs Short P&L by Day of Week</h3>
          <div class="h-[220px]">
            <canvas baseChart [data]="dayData()" [options]="barOptions()" type="bar"></canvas>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-semibold text-slate-300 mb-3">Position Distribution</h3>
          <div class="h-[220px] flex items-center justify-center gap-8">
            @if (metrics(); as m) {
              <div class="text-center">
                <p class="text-xs text-slate-500 uppercase tracking-wider mb-1">Long</p>
                <p class="text-3xl font-bold text-positive">{{ longPct() }}%</p>
                <p class="text-xs text-slate-500 mt-1">{{ m.longFrequency.count }} positions</p>
              </div>
              <div class="w-px h-16 bg-slate-700"></div>
              <div class="text-center">
                <p class="text-xs text-slate-500 uppercase tracking-wider mb-1">Short</p>
                <p class="text-3xl font-bold text-rose-400">{{ shortPct() }}%</p>
                <p class="text-xs text-slate-500 mt-1">{{ m.shortFrequency.count }} positions</p>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LongShortAnalysisComponent {
  metrics = computed(() => this.state.metrics());
  
  constructor(private state: StateService) {}

  longPct = computed(() => { const m = this.metrics(); return m ? Number(m.longFrequency.pct.toFixed(1)) : 0; });
  shortPct = computed(() => { const m = this.metrics(); return m ? Number(m.shortFrequency.pct.toFixed(1)) : 0; });

  dayData = computed(() => {
    const performance = this.state.analysis()?.performance;
    if (!performance) return { labels: [], datasets: [] };
    return {
      labels: performance.longPnlByDay.map(d => d.label),
      datasets: [
        { label: 'Long', data: performance.longPnlByDay.map(d => Number(d.value.toFixed(2))), backgroundColor: '#14b8a6', borderRadius: 3 },
        { label: 'Short', data: performance.shortPnlByDay.map(d => Number(d.value.toFixed(2))), backgroundColor: '#f43f5e', borderRadius: 3 },
      ],
    };
  });

  barOptions = computed(() => {
    const cb = (tickValue: string | number) => {
      const v = typeof tickValue === 'number' ? tickValue : parseFloat(tickValue);
      return formatCurrency(v, 0, true);
    };
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600, easing: 'easeOutQuart' as const },
      plugins: {
        legend: {
          labels: { color: '#94a3b8', boxWidth: 12, padding: 12, font: { size: 10 } },
        },
        tooltip: {
          backgroundColor: '#1e293b',
          titleColor: '#94a3b8',
          bodyColor: '#e2e8f0',
          borderColor: '#334155',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 8,
        },
      },
      scales: {
        x: {
          ticks: { color: '#64748b', font: { size: 9 } },
          grid: { display: false },
        },
        y: {
          ticks: { color: '#64748b', font: { size: 9 }, callback: cb },
          grid: { color: 'rgba(51,65,85,0.3)' },
        },
      },
    };
  });
}
