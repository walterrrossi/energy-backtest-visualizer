import { Component, computed } from '@angular/core';
import { StateService } from '../../services/state.service';
import {
  formatCurrency,
  formatMetric,
  formatPercentage,
} from '../../shared/formatting/metric-formatters';

interface MetricRow {
  label: string;
  value: string;
  hint?: string;
  tone?: 'positive' | 'negative' | 'neutral';
}

interface MetricGroup {
  title: string;
  rows: MetricRow[];
}

@Component({
  selector: 'app-risk-metrics-panel',
  standalone: true,
  template: `
    <div class="rounded-xl border border-slate-600/30 bg-slate-800/60 p-5">
      <h3 class="text-sm font-semibold text-slate-300 mb-4">Risk &amp; Performance Detail</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        @for (group of groups(); track group.title) {
          <div class="rounded-lg border border-slate-700/40 bg-slate-900/40 p-4">
            <p class="text-[11px] text-slate-500 uppercase tracking-wider mb-2">
              {{ group.title }}
            </p>
            <dl class="space-y-1.5">
              @for (row of group.rows; track row.label) {
                <div class="flex items-baseline justify-between gap-3 text-xs">
                  <dt class="text-slate-400">{{ row.label }}</dt>
                  <dd
                    class="font-mono font-medium tabular-nums"
                    [class.text-positive]="row.tone === 'positive'"
                    [class.text-rose-400]="row.tone === 'negative'"
                    [class.text-slate-200]="row.tone === 'neutral' || !row.tone"
                    [attr.title]="row.hint ?? null"
                  >
                    {{ row.value }}
                  </dd>
                </div>
              }
            </dl>
          </div>
        }
      </div>
    </div>
  `,
})
export class RiskMetricsPanelComponent {
  constructor(private state: StateService) {}

  groups = computed<MetricGroup[]>(() => {
    const m = this.state.metrics();
    if (!m) return [];

    const pnl = (n: number): string => formatCurrency(n, 0, true);
    const pnl2 = (n: number): string => formatCurrency(n, 2, true);
    const num = (n: number, d = 2): string => formatMetric(n, d);
    const pct = (n: number, d = 1): string => formatPercentage(n, d);

    const toneFor = (v: number): 'positive' | 'negative' => (v >= 0 ? 'positive' : 'negative');

    return [
      {
        title: 'Returns',
        rows: [
          { label: 'Total P&L', value: pnl(m.totalPnl), tone: toneFor(m.totalPnl) },
          { label: 'Gross P&L', value: pnl(m.grossPnl), tone: toneFor(m.grossPnl) },
          { label: 'Net P&L', value: pnl(m.netPnl), tone: toneFor(m.netPnl) },
          {
            label: 'Long P&L',
            value: pnl(m.longPnl),
            tone: toneFor(m.longPnl),
            hint: 'P&L contribution from long positions',
          },
          {
            label: 'Short P&L',
            value: pnl(m.shortPnl),
            tone: toneFor(m.shortPnl),
            hint: 'P&L contribution from short positions',
          },
          {
            label: 'Annualized P&L',
            value: pnl(m.annualizedPnl),
            tone: toneFor(m.annualizedPnl),
            hint: 'Projected P&L over the annualization horizon',
          },
          {
            label: 'Best Day',
            value: pnl(m.bestDay),
            tone: toneFor(m.bestDay),
          },
          {
            label: 'Worst Day',
            value: pnl(m.worstDay),
            tone: toneFor(m.worstDay),
          },
        ],
      },
      {
        title: 'Risk-Adjusted',
        rows: [
          {
            label: 'Sharpe Ratio',
            value: num(m.sharpeRatio),
            tone: toneFor(m.sharpeRatio),
            hint: 'Mean return / std dev, annualized',
          },
          {
            label: 'Sortino Ratio',
            value: num(m.sortinoRatio),
            tone: toneFor(m.sortinoRatio),
            hint: 'Mean return / downside deviation, annualized',
          },
          {
            label: 'Calmar Ratio',
            value: num(m.calmarRatio),
            tone: toneFor(m.calmarRatio),
            hint: 'Annualized P&L / max drawdown',
          },
          {
            label: 'Ann. Volatility',
            value: pnl(m.annualizedVolatility),
            tone: 'neutral',
            hint: 'Annualized standard deviation of returns',
          },
          {
            label: 'Daily Volatility',
            value: pnl2(m.dailyVolatility),
            tone: 'neutral',
            hint: 'Standard deviation of daily returns',
          },
          {
            label: 'VaR 95% (daily)',
            value: pnl2(m.var95),
            tone: toneFor(m.var95),
            hint: '5th-percentile daily P&L (historical)',
          },
          {
            label: 'CVaR 95% (daily)',
            value: pnl2(m.cvar95),
            tone: toneFor(m.cvar95),
            hint: 'Average loss on days below the 5th percentile',
          },
        ],
      },
      {
        title: 'Drawdown',
        rows: [
          {
            label: 'Max Drawdown',
            value: pnl(m.maximumDrawdown),
            tone: toneFor(m.maximumDrawdown),
          },
          {
            label: 'Current Drawdown',
            value: pnl(m.currentDrawdown),
            tone: toneFor(m.currentDrawdown),
          },
          {
            label: 'DD Duration (days)',
            value: num(m.drawdownDurationDays, 0),
            tone: 'neutral',
            hint: 'How long the current drawdown has lasted',
          },
          {
            label: 'Max DD Duration (days)',
            value: num(m.maximumDrawdownDurationDays, 0),
            tone: 'neutral',
            hint: 'Longest drawdown period observed',
          },
          {
            label: 'Recovery Time (days)',
            value: num(m.recoveryTimeDays, 0),
            tone: 'neutral',
            hint: 'Days from trough back to a new high',
          },
        ],
      },
      {
        title: 'Trade / Day Stats',
        rows: [
          { label: 'Hit Rate', value: pct(m.hitRate, 1), tone: toneFor(m.hitRate - 50) },
          { label: 'Coverage', value: pct(m.coverage, 1), tone: 'neutral' },
          {
            label: 'Positive Days',
            value: pct(m.positiveDaysPct, 1),
            tone: toneFor(m.positiveDaysPct - 50),
          },
          { label: 'Avg Winning Trade', value: pnl2(m.averageWinningTrade), tone: 'positive' },
          { label: 'Avg Losing Trade', value: pnl2(m.averageLosingTrade), tone: 'negative' },
          { label: 'Avg Winning Day', value: pnl2(m.averageWinningDay), tone: 'positive' },
          { label: 'Avg Losing Day', value: pnl2(m.averageLosingDay), tone: 'negative' },
          {
            label: 'Profit Factor',
            value: num(m.profitFactor, 2),
            tone: toneFor(m.profitFactor - 1),
            hint: 'Gross profit / gross loss',
          },
          {
            label: 'Payoff Ratio',
            value: num(m.payoffRatio, 2),
            tone: toneFor(m.payoffRatio - 1),
            hint: 'Avg win / avg loss',
          },
        ],
      },
      {
        title: 'Streaks',
        rows: [
          {
            label: 'Max Consecutive Win Days',
            value: num(m.maxConsecutiveWinDays, 0),
            tone: 'positive',
            hint: 'Longest run of positive daily P&L',
          },
          {
            label: 'Max Consecutive Loss Days',
            value: num(m.maxConsecutiveLossDays, 0),
            tone: 'negative',
            hint: 'Longest run of negative daily P&L',
          },
        ],
      },
      {
        title: 'Distribution & Concentration',
        rows: [
          {
            label: 'Skewness',
            value: num(m.skewness, 2),
            tone: 'neutral',
            hint: 'Asymmetry of daily returns (>0 = right tail)',
          },
          {
            label: 'Excess Kurtosis',
            value: num(m.kurtosis, 2),
            tone: 'neutral',
            hint: 'Tail heaviness vs normal (>0 = fat tails)',
          },
          {
            label: 'Top 5 Days Concentration',
            value: pct(m.topFiveDayConcentration, 1),
            tone: m.topFiveDayConcentration > 50 ? 'negative' : 'neutral',
            hint: 'Share of total P&L from the 5 best days',
          },
          {
            label: 'Top 10 Days Concentration',
            value: pct(m.topTenDayConcentration, 1),
            tone: m.topTenDayConcentration > 80 ? 'negative' : 'neutral',
            hint: 'Share of total P&L from the 10 best days',
          },
          {
            label: 'Profitable Rolling %',
            value: pct(m.profitableRollingWindowPercentage, 1),
            tone: toneFor(m.profitableRollingWindowPercentage - 50),
            hint: '% of rolling windows that were profitable',
          },
        ],
      },
    ];
  });
}
