export const formatMetric = (value: number, decimals = 2): string =>
  Number.isFinite(value) ? value.toFixed(decimals) : 'N/A';

export const formatCurrency = (value: number, decimals = 2, useGrouping = false): string =>
  Number.isFinite(value)
    ? `€${value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping,
      })}`
    : 'N/A';

export const formatPercentage = (value: number, decimals = 1): string =>
  Number.isFinite(value) ? `${formatMetric(value, decimals)}%` : 'N/A';

export const formatMwh = (value: number, decimals = 0): string =>
  Number.isFinite(value) ? `${formatMetric(value, decimals)} MWh` : 'N/A';

export const formatUtcDate = (value: Date): string =>
  Number.isNaN(value.getTime()) ? 'N/A' : `${value.getUTCDate()}/${value.getUTCMonth() + 1}`;
