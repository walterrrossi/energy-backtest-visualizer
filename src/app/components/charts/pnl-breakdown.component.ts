import { Component, computed } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { StateService } from '../../services/state.service';
import { formatCurrency } from '../../shared/formatting/metric-formatters';

@Component({
  selector: 'app-pnl-breakdown',
  standalone: true,
  imports: [BaseChartDirective],
  template: `
    <div class="rounded-xl border border-slate-600/30 bg-slate-800/60 p-5">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <h3 class="text-sm font-semibold text-slate-300 mb-3">P&L by Hour of Day</h3>
          <div class="h-[220px]">
            <canvas baseChart [data]="hourData()" [options]="barOptions()" type="bar"></canvas>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-semibold text-slate-300 mb-3">P&L by Month</h3>
          <div class="h-[220px]">
            <canvas baseChart [data]="monthData()" [options]="barOptions()" type="bar"></canvas>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class PnlBreakdownComponent {
  constructor(private state: StateService) {}

  private months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  hourData = computed(() => {
    const performance = this.state.analysis()?.performance;
    if (!performance) return { labels: [], datasets: [] };
    return {
      labels: performance.pnlByHour.map(h => String(h.hour)),
      datasets: [
        { label: 'Long', data: performance.pnlByHour.map(h => Number(h.long.toFixed(2))), backgroundColor: '#14b8a6', borderRadius: 3 },
        { label: 'Short', data: performance.pnlByHour.map(h => Number(h.short.toFixed(2))), backgroundColor: '#f43f5e', borderRadius: 3 },
      ],
    };
  });

  monthData = computed(() => {
    const performance = this.state.analysis()?.performance;
    if (!performance) return { labels: [], datasets: [] };
    return {
      labels: performance.pnlByMonth.map(h => this.months[h.month]),
      datasets: [
        { label: 'Long', data: performance.pnlByMonth.map(h => Number(h.long.toFixed(2))), backgroundColor: '#14b8a6', borderRadius: 3 },
        { label: 'Short', data: performance.pnlByMonth.map(h => Number(h.short.toFixed(2))), backgroundColor: '#f43f5e', borderRadius: 3 },
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
          stacked: true,
          ticks: { color: '#64748b', font: { size: 9 } },
          grid: { display: false },
        },
        y: {
          stacked: true,
          ticks: { color: '#64748b', font: { size: 9 }, callback: cb },
          grid: { color: 'rgba(51,65,85,0.3)' },
        },
      },
    };
  });
}
