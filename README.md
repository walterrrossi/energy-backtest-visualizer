# Energy Backtest Visualizer

A client-side Angular application for visualizing and analyzing energy trading backtest results. Upload CSV, Excel, or Parquet files and instantly compute P&L metrics, view interactive charts, and explore position-level performance — all in the browser, no server required.

## Features

- **Multi-format import** — CSV, Excel (.xlsx), and Parquet files
- **Real-time KPI calculation** — total P&L, Sharpe ratio, hit rate, efficiency, coverage, and more
- **Interactive charts** — cumulative equity curve, hourly/monthly P&L breakdowns, long vs short analysis by day of week
- **Automatic granularity detection** — hourly, half-hourly, and quarter-hourly data
- **P&L inversion toggle** — switch long/short sign convention without re-uploading
- **Drag-and-drop upload** — simple file upload with inline validation
- **Fully client-side** — no data is sent to any server
- **Docker ready** — single-command deployment with Docker Compose

## Demo

> Drop a `.csv`, `.xlsx`, or `.parquet` backtest file onto the upload panel. The dashboard renders KPI cards, an equity curve, and breakdown charts within milliseconds.

## File Format

### Required Columns

| Column | Description | Accepts |
|--------|-------------|---------|
| `datetime` | Timestamp of the trade | ISO 8601, `YYYY-MM-DD HH:mm`, or any parseable date string |
| `country` | Country code (single country per file) | Any string |
| `strategy_tag` | Strategy identifier | Any string |
| `spread` | Price spread in €/MWh | Numeric |
| `qty_mw` or `position` | Position size in MW (positive = long, negative = short) | Numeric |

### Optional Columns

| Column | Description |
|--------|-------------|
| `zone` | Bidding zone |

> **Note**: All column names are case-insensitive. Files must contain exactly one country; validation will reject rows with mismatched country values.

### Granularity

The granularity detector samples the first 50 timestamps to classify data:

| Detected Granularity | Interval |
|----------------------|----------|
| Hourly | ~60 minutes |
| Half-hourly | ~30 minutes |
| Quarter-hourly | ~15 minutes |

## Key Metrics

| Metric | Definition |
|--------|------------|
| **Total P&L** | Sum of all trade P&L (€) |
| **€ / MWh** | Total P&L ÷ absolute traded volume |
| **Hit Rate** | Percentage of active trades with positive P&L |
| **Sharpe Ratio** | Annualized risk-adjusted return |
| **Coverage** | Percentage of time intervals with an active position |
| **Long / Short Frequency** | Distribution of long vs short positions |

## Quick Start

### Development

```bash
npm install
npm start            # serves at http://localhost:4200
```

### Production Build

```bash
npm run build        # outputs to dist/
```

### Docker

```bash
docker-compose up -d   # serves at http://localhost:80
```

Or build manually:

```bash
docker build -t energy-backtest-visualizer .
docker run -p 80:80 energy-backtest-visualizer
```

## Usage

1. Open the app in your browser
2. Drag a backtest file onto the upload panel (or click to browse)
3. KPI cards and charts render automatically
4. Toggle **Invert P&L** to flip the long/short sign convention
5. Click **Clear** to reset and upload a new file

## Project Structure

```
src/
└── app/
    ├── components/
    │   ├── charts/
    │   │   ├── equity-curve.component.ts          # Cumulative P&L line chart
    │   │   ├── pnl-breakdown.component.ts          # Hourly & monthly P&L bar charts
    │   │   └── long-short-analysis.component.ts    # Long vs short metrics + day-of-week bar chart
    │   ├── inbound-panel/
    │   │   └── inbound-panel.component.ts          # Drag-and-drop file upload + validation
    │   └── kpi-cards/
    │       └── kpi-cards.component.ts              # KPI metric cards
    ├── models/
    │   └── backtest.models.ts                      # TypeScript interfaces & types
    ├── services/
    │   ├── file-parser.service.ts                  # CSV / XLSX / Parquet parsing
    │   ├── granularity-detector.service.ts         # Auto-detect data granularity
    │   ├── metrics-engine.service.ts               # P&L and KPI computation
    │   ├── schema-validator.service.ts             # Column & row-level validation
    │   └── state.service.ts                        # Reactive state management
    ├── app.ts                                      # Root standalone component
    └── app.config.ts                               # Angular application config
```

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Angular 22 (standalone components) |
| Charts | Chart.js 4 via ng2-charts |
| Styling | Tailwind CSS 3 |
| CSV/Excel | xlsx |
| Parquet | parquet-wasm + apache-arrow |
| State | Angular signals |
| Packaging | Docker + nginx (production) |

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start development server on `:4200` |
| `npm run build` | Production build |
| `npm run watch` | Dev build with watch mode |

## Browser Support

Chrome 90+, Firefox 88+, Safari 14+, Edge 90+.

## Limitations

- **Single country per file**: files with multiple countries trigger a validation error
- **Large files** (>100k rows) may cause performance degradation during parsing and chart rendering
- **Memory-bound**: all data stays in the browser heap; the recommended upper limit is ~100 MB per file
- **No persistence**: data is ephemeral and lost on page refresh

## License

Private.
