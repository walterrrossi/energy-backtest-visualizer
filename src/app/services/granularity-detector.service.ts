import { Injectable } from '@angular/core';
import type { Granularity } from '../models/backtest.models';

@Injectable({ providedIn: 'root' })
export class GranularityDetectorService {
  detect(datetimes: Date[]): Granularity {
    if (datetimes.length < 2) return 'hourly';

    const sorted = [...datetimes].sort((a, b) => a.getTime() - b.getTime());
    const deltas: number[] = [];

    for (let i = 1; i < Math.min(sorted.length, 50); i++) {
      deltas.push(sorted[i].getTime() - sorted[i - 1].getTime());
    }

    const medianDelta = this.median(deltas);
    const minutes = medianDelta / 1000 / 60;

    if (minutes <= 15) return 'quarter-hourly';
    if (minutes <= 30) return 'half-hourly';
    return 'hourly';
  }

  grainFactor(granularity: Granularity): number {
    switch (granularity) {
      case 'hourly': return 1;
      case 'half-hourly': return 0.5;
      case 'quarter-hourly': return 0.25;
    }
  }

  periodsPerYear(granularity: Granularity): number {
    switch (granularity) {
      case 'hourly': return 8760;
      case 'half-hourly': return 17520;
      case 'quarter-hourly': return 35040;
    }
  }

  private median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }
}
