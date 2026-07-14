# AGENTS.md — Energy Backtest Visualizer

Guidelines for AI agents working on this project.

## Project Overview

Energy Backtest Visualizer is a fully client-side Angular 22 application that ingests energy trading backtest files (CSV, XLSX, Parquet) and renders P&L metrics, charts, and position analysis. All processing happens in the browser via Angular signals and Chart.js.

## Architecture

```
Component (standalone) ──> Service (providedIn: root) ──> StateService (signals)
```

- **Components** are standalone, use inline templates and inline SCSS styles, and pull data reactively from `StateService` via `computed`.
- **Services** are `providedIn: 'root'`. Each owns a single responsibility (parsing, validation, metrics computation, granularity detection).
- **State** is managed through `StateService`, which exposes a `signal<BacktestDataset | null>` and a `computed<MetricsResult | null>` derived from it.
- **No NgModules** — the app uses the standalone API throughout.

## Code Conventions

### TypeScript

- Strict mode; always define explicit types for public APIs
- Use `import type` for type-only imports
- Use Angular signals (`signal`, `computed`) over RxJS `BehaviorSubject` for local state
- Use `providedIn: 'root'` for all services (no manual registration)
- `BacktestRow`, `BacktestDataset`, `MetricsResult`, and `ValidationError` live in `models/backtest.models.ts`
- File format column names are normalized to lowercase in `FileParserService` before any downstream usage

### Angular

- Components are standalone, inline templates + inline styles (`inlineTemplate: true`, `inlineStyle: true`)
- No NgModules — everything uses the standalone API
- Components use `OnPush` change detection by default (Angular 22 default)
- Component selectors are prefixed `app-`
- Impure pipes are forbidden; use `computed` instead
- Direct DOM manipulation is forbidden; use Angular bindings and `ng2-charts` directives

### Styling

- Tailwind CSS utility classes only — no custom CSS files
- Custom theme colors are defined in `tailwind.config.js` under `theme.extend.colors`:
  - `positive`: teal scale (`#14b8a6` primary)
  - `negative`: rose scale (`#f43f5e` primary)
  - `surface`: slate scale (`#0f172a` primary)
- Dark mode is the only mode (`darkMode: 'class'`)
- Use `border-slate-700/50`, `bg-slate-800/50` for card/chart container surfaces
- Charts use a dark theme: `#1e293b` tooltip backgrounds, `#334155` borders

### Charts

- Chart.js via `ng2-charts` `BaseChartDirective`
- Each chart component is a standalone component importing `BaseChartDirective`
- Chart data and options are `computed` signals derived from `StateService.metrics()`
- Common pattern: `chartData = computed(() => { ... return { labels, datasets } })`
- Use `animation: { duration: 600, easing: 'easeOutQuart' }` for consistent chart animations
- All chart y-axes use a `callback` formatter for Euro display: `` `€${v.toLocaleString()}` ``

### File Parsing

- `FileParserService` is the single entry point — switch on file extension, return `ParsedFile`
- CSV is parsed manually (handles quoted fields and escaped quotes)
- XLSX uses the `xlsx` library
- Parquet uses `parquet-wasm` (WASM initialized from `/parquet_wasm_bg.wasm`) + `apache-arrow` for IPC deserialization
- Column names are lowercased during parsing; all downstream code uses lowercase
- Datetime parsing lives in `InboundPanelComponent.parseDatetime()` — handles ISO 8601, timezone offsets, and space-separated formats

### Validation

- `SchemaValidatorService` checks for required columns (`datetime`, `country`, `strategy_tag`, `spread`) and position column (`qty_mw` or `position`)
- `qty_mw` and `spread` must be parseable as numbers
- Multiple countries in a single file are rejected
- Row-level errors are capped at 10; a summary line is appended for additional errors

### State Management

- `StateService` is the central store
- `StateService.dataset` is a `signal<BacktestDataset | null>`
- `StateService.metrics` is a `computed` that runs `MetricsEngineService.compute()` whenever the dataset changes
- Components read `StateService.metrics()` inside their `computed` to derive chart data and display values
- `MetricsEngineService.invertPnl` is a `signal` that flips the P&L sign — changing it triggers all downstream `computed` reactively

## Common Tasks

### Add a new chart

1. Create `src/app/components/charts/<name>.component.ts`
2. Import `BaseChartDirective` from `ng2-charts`
3. Inject `StateService` and expose chart data/options as `computed`
4. Register the component in `app.ts` imports array

### Add a new KPI

1. Add the field to `MetricsResult` in `models/backtest.models.ts`
2. Compute it in `MetricsEngineService.compute()`
3. Display it in `KpiCardsComponent.cards()`

### Add a new file format

1. Add a `parse<Format>()` method to `FileParserService`
2. Add the extension to the `switch` in `parse()`
3. If WASM-based, add the `.wasm` file to `angular.json` loader config

## Build & Deployment

- Build: `ng build` (uses `@angular/build:application` builder)
- Dev server: `ng serve`
- Docker: multi-stage build — `node:20-alpine` for build, `nginx:alpine` for serving
- The nginx config enables `gzip` on text and WASM assets, sets 1-year cache for static assets, and uses `try_files` for SPA fallback routing
- WASM files are loaded via `"loader": { ".wasm": "file" }` in `angular.json`

## Testing

- No test suite is currently configured (Vitest scaffolding exists in the default Angular CLI template)
- When adding tests, use Vitest with Angular TestBed
- Test services in isolation; for components, mock `StateService`
- Use `provideZoneChangeDetection` and `ComponentFixture` for component tests
