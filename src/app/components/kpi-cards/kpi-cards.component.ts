import { Component, computed } from '@angular/core';
import { StateService } from '../../services/state.service';
import { formatCurrency, formatMetric, formatMwh, formatPercentage } from '../../shared/formatting/metric-formatters';

@Component({
  selector: 'app-kpi-cards',
  standalone: true,
  template: `
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      @for (card of cards(); track card.label) {
        <div class="rounded-xl border border-slate-600/30 bg-slate-800/60 p-5 backdrop-blur-sm animate-fade-in">
          <p class="text-xs text-slate-500 font-medium tracking-wider uppercase">{{ card.label }}</p>
          <p class="text-2xl font-bold mt-1" [class.text-positive]="card.color === 'positive'" [class.text-rose-400]="card.color === 'negative'" [class.text-slate-100]="card.color === 'neutral'">
            {{ card.value }}
          </p>
          @if (card.sub) {
            <p class="text-xs text-slate-500 mt-0.5">{{ card.sub }}</p>
          }
        </div>
      }
    </div>
  `,
})
export class KpiCardsComponent {
  constructor(private state: StateService) {}

  cards = computed(() => {
    const m = this.state.metrics();
    if (!m) return [];

    return [
      {
        label: 'Total P&L',
        value: formatCurrency(m.totalPnl, 0),
        color: m.totalPnl >= 0 ? 'positive' : 'negative',
        sub: undefined,
      },
      {
        label: '€ / MWh',
        value: formatMetric(m.efficiencyEuroPerMwh, 2),
        color: m.efficiencyEuroPerMwh >= 0 ? 'positive' : 'negative',
        sub: `${formatMwh(m.totalAbsVolumeMwh, 0)} volume`,
      },
      {
        label: 'Hit Rate',
        value: formatPercentage(m.hitRate, 1),
        color: m.hitRate >= 50 ? 'positive' : 'negative',
        sub: undefined,
      },
      {
        label: 'Sharpe Ratio',
        value: formatMetric(m.sharpeRatio, 2),
        color: m.sharpeRatio >= 0 ? 'positive' : 'negative',
        sub: `${this.state.analysisSettings().returnAggregation} annualized`,
      },
      {
        label: 'Coverage',
        value: formatPercentage(m.coverage, 1),
        color: 'neutral',
        sub: `${formatPercentage(m.longFrequency.pct, 1)} long / ${formatPercentage(m.shortFrequency.pct, 1)} short`,
      },
    ];
  });
}
