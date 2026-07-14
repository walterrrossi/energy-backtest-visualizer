import { Injectable, signal } from '@angular/core';
import type { BacktestDataset, Granularity, MetricsResult, PnlResult } from '../models/backtest.models';
import { GranularityDetectorService } from './granularity-detector.service';

@Injectable({ providedIn: 'root' })
export class MetricsEngineService {
  invertPnl = signal(false);

  constructor(private granularity: GranularityDetectorService) {}

  compute(dataset: BacktestDataset): MetricsResult {
    const factor = this.granularity.grainFactor(dataset.granularity);
    const rows = dataset.rows;

    const pnlResults: PnlResult[] = rows.map(r => {
      const mwh = r.qtyMw * factor;
      const sign = this.invertPnl() ? -1 : 1;
      return { value: mwh * r.spread * sign, isLong: r.qtyMw > 0, qtyMw: r.qtyMw };
    });

    const totalPnl = pnlResults.reduce((s, p) => s + p.value, 0);
    const totalVolumeMwh = rows.reduce((s, r) => s + r.qtyMw * factor, 0);
    const totalAbsVolumeMwh = rows.reduce((s, r) => s + Math.abs(r.qtyMw * factor), 0);
    const efficiencyEuroPerMwh = totalAbsVolumeMwh > 0 ? totalPnl / totalAbsVolumeMwh : 0;

    const longRows = pnlResults.filter(p => p.isLong);
    const shortRows = pnlResults.filter(p => !p.isLong && p.qtyMw !== 0);
    const activeRows = pnlResults.filter(p => p.qtyMw !== 0);

    const longFrequency = { count: longRows.length, pct: rows.length > 0 ? (longRows.length / rows.length) * 100 : 0 };
    const shortFrequency = { count: shortRows.length, pct: rows.length > 0 ? (shortRows.length / rows.length) * 100 : 0 };

    const coverage = rows.length > 0 ? (activeRows.length / rows.length) * 100 : 0;
    const hitRate = activeRows.length > 0 ? (pnlResults.filter(p => p.qtyMw !== 0 && p.value > 0).length / activeRows.length) * 100 : 0;

    const sharpeRatio = this.computeSharpe(pnlResults.map(p => p.value), dataset.granularity);

    const sorted = rows.map((r, i) => ({ date: r.datetime, value: pnlResults[i].value }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    let cum = 0;
    const cumulativePnl = sorted.map(s => { cum += s.value; return { date: s.date, value: cum }; });

    const pnlByHourMap = new Map<number, { long: number; short: number }>();
    const pnlByMonthMap = new Map<number, { long: number; short: number }>();

    rows.forEach((r, i) => {
      const hour = r.datetime.getUTCHours();
      const month = r.datetime.getUTCMonth();
      const p = pnlResults[i];

      if (!pnlByHourMap.has(hour)) pnlByHourMap.set(hour, { long: 0, short: 0 });
      if (!pnlByMonthMap.has(month)) pnlByMonthMap.set(month, { long: 0, short: 0 });

      const h = pnlByHourMap.get(hour)!;
      const m = pnlByMonthMap.get(month)!;

      if (p.isLong) {
        h.long += p.value;
        m.long += p.value;
      } else {
        h.short += p.value;
        m.short += p.value;
      }
    });

    const pnlByHour = Array.from(pnlByHourMap.entries())
      .map(([hour, v]) => ({ hour, long: v.long, short: v.short, total: v.long + v.short }))
      .sort((a, b) => a.hour - b.hour);

    const pnlByMonth = Array.from(pnlByMonthMap.entries())
      .map(([month, v]) => ({ month, long: v.long, short: v.short, total: v.long + v.short }))
      .sort((a, b) => a.month - b.month);

    const longPnl = pnlResults.filter(p => p.isLong).reduce((s, p) => s + p.value, 0);
    const shortPnl = pnlResults.filter(p => !p.isLong && p.qtyMw !== 0).reduce((s, p) => s + p.value, 0);

    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const longByDay: number[] = new Array(7).fill(0);
    const shortByDay: number[] = new Array(7).fill(0);
    rows.forEach((r, i) => {
      const day = r.datetime.getUTCDay();
      const idx = day === 0 ? 6 : day - 1;
      const p = pnlResults[i];
      if (p.isLong) longByDay[idx] += p.value;
      else if (p.qtyMw !== 0) shortByDay[idx] += p.value;
    });

    const longPnlByDay = longByDay.map((v, i) => ({ label: dayLabels[i], value: v }));
    const shortPnlByDay = shortByDay.map((v, i) => ({ label: dayLabels[i], value: v }));

    return {
      totalPnl, efficiencyEuroPerMwh, longFrequency, shortFrequency,
      coverage, hitRate, sharpeRatio, cumulativePnl, pnlByHour, pnlByMonth,
      longPnl, shortPnl, longPnlByDay, shortPnlByDay,
      totalVolumeMwh, totalAbsVolumeMwh,
    };
  }

  private computeSharpe(pnlValues: number[], granularity: Granularity): number {
    if (pnlValues.length < 2) return 0;

    const mean = pnlValues.reduce((s, v) => s + v, 0) / pnlValues.length;
    const variance = pnlValues.reduce((s, v) => s + (v - mean) ** 2, 0) / (pnlValues.length - 1);
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0;

    const periodsPerYear = this.granularity.periodsPerYear(granularity);
    return (mean / stdDev) * Math.sqrt(periodsPerYear);
  }
}
