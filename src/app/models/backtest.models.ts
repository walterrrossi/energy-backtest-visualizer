export type Granularity = 'hourly' | 'half-hourly' | 'quarter-hourly';

export type Direction = 'long' | 'short' | 'flat';

export type MetadataValue = string | number | boolean | null;

export interface BacktestRow {
  id: string;
  datetime: Date;

  market: {
    country: string;
    zone?: string;
    currency: string;
    timezone?: string;
  };

  strategy: {
    tag: string;
    version?: string;
    modelVersion?: string;
    calibrationVersion?: string;
  };

  position: {
    quantityMw: number;
    direction: Direction;
  };

  prices: {
    spread: number;
    dayAheadPrice?: number;
    imbalancePrice?: number;
  };

  signal?: {
    rawValue?: number;
    prediction?: number;
    probability?: number;
    confidence?: number;
    target?: number;
  };

  execution?: {
    costs?: number;
    slippage?: number;
    executedQuantityMw?: number;
  };

  metadata?: Record<string, MetadataValue>;
}

export interface ColumnMapping {
  datetime: string;
  country: string;
  zone?: string;
  strategyTag: string;
  quantityMw: string;
  spread: string;
  currency?: string;
  timezone?: string;
  probability?: string;
  prediction?: string;
  target?: string;
  confidence?: string;
  rawValue?: string;
  costs?: string;
  slippage?: string;
  executedQuantityMw?: string;
  modelVersion?: string;
  calibrationVersion?: string;
}

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface DataDiagnostic {
  code: string;
  severity: DiagnosticSeverity;
  field?: string;
  row?: number;
  message: string;
  details?: Record<string, unknown>;
}

export interface DataQualityReport {
  diagnostics: DataDiagnostic[];
  invalidRowCount: number;
  duplicateTimestampCount: number;
  missingIntervalCount: number;
  qualityScore: number;
}

export interface DatasetMetadata {
  granularity: Granularity;
  timezone?: string;
  currency: string;
  countries: string[];
  zones: string[];
  strategyTags: string[];
  start: Date;
  end: Date;
}

export interface BacktestDataset {
  id: string;
  name: string;
  fileName: string;
  importedAt: Date;
  rows: BacktestRow[];
  rawRowCount: number;
  metadata: DatasetMetadata;
  mapping: ColumnMapping;
  qualityReport: DataQualityReport;
}

export interface EnrichedBacktestRow extends BacktestRow {
  intervalHours: number;
  volumeMwh: number;
  grossPnl: number;
  netPnl: number;
  cumulativePnl?: number;
}

export type ReturnAggregation = 'interval' | 'daily' | 'weekly';

export interface AnalysisSettings {
  pnlMode: 'gross' | 'net';
  invertPnl: boolean;
  returnAggregation: ReturnAggregation;
  annualizationDays: number;
  rollingWindowDays: number;
  timezoneMode: 'utc' | 'market' | 'browser';
}

export const DEFAULT_ANALYSIS_SETTINGS: AnalysisSettings = {
  pnlMode: 'gross',
  invertPnl: false,
  returnAggregation: 'daily',
  annualizationDays: 365,
  rollingWindowDays: 30,
  timezoneMode: 'utc',
};

export interface FrequencyMetric {
  count: number;
  pct: number;
}

export interface SummaryMetrics {
  totalPnl: number;
  grossPnl: number;
  netPnl: number;
  efficiencyEuroPerMwh: number;
  longFrequency: FrequencyMetric;
  shortFrequency: FrequencyMetric;
  coverage: number;
  hitRate: number;
  sharpeRatio: number;
  sortinoRatio: number;
  annualizedPnl: number;
  annualizedVolatility: number;
  maximumDrawdown: number;
  currentDrawdown: number;
  drawdownDurationDays: number;
  maximumDrawdownDurationDays: number;
  recoveryTimeDays: number;
  calmarRatio: number;
  profitFactor: number;
  averageWinningTrade: number;
  averageLosingTrade: number;
  payoffRatio: number;
  bestDay: number;
  worstDay: number;
  topFiveDayConcentration: number;
  topTenDayConcentration: number;
  profitableRollingWindowPercentage: number;
  longPnl: number;
  shortPnl: number;
  totalVolumeMwh: number;
  totalAbsVolumeMwh: number;
}

export interface DailyPerformance {
  date: Date;
  grossPnl: number;
  netPnl: number;
  value: number;
  volumeMwh: number;
  activeCount: number;
  rowCount: number;
}

export interface DrawdownPoint {
  date: Date;
  value: number;
  peak: number;
}

export interface PerformanceSeries {
  cumulativePnl: { date: Date; value: number }[];
  dailyPnl: DailyPerformance[];
  drawdown: DrawdownPoint[];
  pnlByHour: { hour: number; long: number; short: number; total: number }[];
  pnlByMonth: { month: number; long: number; short: number; total: number }[];
  longPnlByDay: { label: string; value: number }[];
  shortPnlByDay: { label: string; value: number }[];
}

export interface RiskMetrics {
  maximumDrawdown: number;
  currentDrawdown: number;
  drawdownDurationDays: number;
  maximumDrawdownDurationDays: number;
  recoveryTimeDays: number;
  annualizedPnl: number;
  annualizedVolatility: number;
  sortinoRatio: number;
  calmarRatio: number;
  profitFactor: number;
  averageWinningTrade: number;
  averageLosingTrade: number;
  payoffRatio: number;
  bestDay: number;
  worstDay: number;
  topFiveDayConcentration: number;
  topTenDayConcentration: number;
  profitableRollingWindowPercentage: number;
}

export interface RollingMetricPoint {
  date: Date;
  pnl: number;
  sharpe: number;
  sortino: number;
  volatility: number;
  hitRate: number;
  coverage: number;
  euroPerMwh: number;
}

export interface RollingMetricSeries {
  windowDays: number;
  points: RollingMetricPoint[];
}

export interface SegmentPerformance {
  key: string;
  label: string;
  rowCount: number;
  activeCount: number;
  pnl: number;
  pnlPerMwh: number;
  volumeMwh: number;
  hitRate: number;
  coverage: number;
  maxDrawdown: number;
}

export interface SegmentCollection {
  byHour: SegmentPerformance[];
  byMonth: SegmentPerformance[];
  byWeekday: SegmentPerformance[];
}

export interface BacktestAnalysis {
  enrichedRows: EnrichedBacktestRow[];
  summary: SummaryMetrics;
  performance: PerformanceSeries;
  risk: RiskMetrics;
  rolling: RollingMetricSeries;
  segments: SegmentCollection;
}

export interface NormalizationResult {
  rows: BacktestRow[];
  mapping: ColumnMapping;
  qualityReport: DataQualityReport;
  metadata: DatasetMetadata;
}

export interface ValidationError {
  field: string;
  message: string;
  row?: number;
}
