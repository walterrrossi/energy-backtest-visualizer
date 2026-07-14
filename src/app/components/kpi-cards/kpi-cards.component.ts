import { Component, computed } from '@angular/core';
import { StateService } from '../../services/state.service';

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

    const fmt = (v: number, d: number = 2) => v.toFixed(d);

    return [
      {
        label: 'Total P&L',
        value: `€${fmt(m.totalPnl, 0)}`,
        color: m.totalPnl >= 0 ? 'positive' : 'negative',
        sub: undefined,
      },
      {
        label: '€ / MWh',
        value: fmt(m.efficiencyEuroPerMwh, 2),
        color: m.efficiencyEuroPerMwh >= 0 ? 'positive' : 'negative',
        sub: `${fmt(m.totalAbsVolumeMwh, 0)} MWh volume`,
      },
      {
        label: 'Hit Rate',
        value: `${fmt(m.hitRate, 1)}%`,
        color: m.hitRate >= 50 ? 'positive' : 'negative',
        sub: undefined,
      },
      {
        label: 'Sharpe Ratio',
        value: fmt(m.sharpeRatio, 2),
        color: m.sharpeRatio >= 0 ? 'positive' : 'negative',
        sub: 'annualized',
      },
      {
        label: 'Coverage',
        value: `${fmt(m.coverage, 1)}%`,
        color: 'neutral',
        sub: `${m.longFrequency.pct.toFixed(1)}% long / ${m.shortFrequency.pct.toFixed(1)}% short`,
      },
    ];
  });
}
