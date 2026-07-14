import { Component, computed } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { StateService } from '../../services/state.service';

@Component({
  selector: 'app-equity-curve',
  standalone: true,
  imports: [BaseChartDirective],
  template: `
    <div class="rounded-xl border border-slate-600/30 bg-slate-800/60 p-5">
      <h3 class="text-sm font-semibold text-slate-300 mb-3">Cumulative P&L</h3>
      <div class="h-[250px]">
        <canvas baseChart
          [data]="chartData()"
          [options]="chartOptions()"
          type="line">
        </canvas>
      </div>
    </div>
  `,
})
export class EquityCurveComponent {
  constructor(private state: StateService) {}

  chartData = computed(() => {
    const m = this.state.metrics();
    if (!m) return { labels: [], datasets: [] };

    return {
      labels: m.cumulativePnl.map(p => {
        const d = p.date;
        return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
      }),
      datasets: [{
        label: 'Cumulative P&L (€)',
        data: m.cumulativePnl.map(p => Number(p.value.toFixed(2))),
        borderColor: '#14b8a6',
        backgroundColor: 'rgba(20,184,166,0.08)',
        fill: true,
        tension: 0.2,
        pointRadius: 0,
        borderWidth: 2,
      }],
    };
  });

  chartOptions = computed(() => {
    const cb = (tickValue: string | number) => {
      const v = typeof tickValue === 'number' ? tickValue : parseFloat(tickValue);
      return '€' + v.toLocaleString();
    };
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 800, easing: 'easeOutQuart' as const },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1e293b',
          titleColor: '#94a3b8',
          bodyColor: '#e2e8f0',
          borderColor: '#334155',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 10,
        },
      },
      scales: {
        x: {
          display: true,
          ticks: { color: '#64748b', maxTicksLimit: 10, font: { size: 10 } },
          grid: { color: 'rgba(51,65,85,0.3)' },
        },
        y: {
          display: true,
          ticks: { color: '#64748b', font: { size: 10 }, callback: cb },
          grid: { color: 'rgba(51,65,85,0.3)' },
        },
      },
      interaction: { intersect: false, mode: 'index' as const },
    };
  });
}
