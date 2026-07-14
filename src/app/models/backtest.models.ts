export interface BacktestRow {
  datetime: Date;
  country: string;
  zone: string;
  strategyTag: string;
  qtyMw: number;
  spread: number;
}

export type Granularity = 'hourly' | 'half-hourly' | 'quarter-hourly';

export interface BacktestDataset {
  rows: BacktestRow[];
  granularity: Granularity;
  country: string;
  zones: string[];
  strategyTags: string[];
  fileName: string;
  rawRowCount: number;
}

export interface PnlResult {
  value: number;
  isLong: boolean;
  qtyMw: number;
}

export interface MetricsResult {
  totalPnl: number;
  efficiencyEuroPerMwh: number;
  longFrequency: { count: number; pct: number };
  shortFrequency: { count: number; pct: number };
  coverage: number;
  hitRate: number;
  sharpeRatio: number;
  cumulativePnl: { date: Date; value: number }[];
  pnlByHour: { hour: number; long: number; short: number; total: number }[];
  pnlByMonth: { month: number; long: number; short: number; total: number }[];
  longPnl: number;
  shortPnl: number;
  longPnlByDay: { label: string; value: number }[];
  shortPnlByDay: { label: string; value: number }[];
  totalVolumeMwh: number;
  totalAbsVolumeMwh: number;
}

export interface ValidationError {
  field: string;
  message: string;
  row?: number;
}
