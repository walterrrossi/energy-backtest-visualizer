import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../services/state.service';

const toUtcDateInputValue = (value: Date | null): string => {
  if (!value) return '';
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const fromUtcDateInputValue = (value: string): Date | null => {
  if (!value) return null;
  const [y, m, d] = value.split('-').map((n) => Number(n));
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
};

@Component({
  selector: 'app-filter-panel',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (state.hasData()) {
      <div
        class="rounded-xl border border-slate-600/30 bg-slate-800/60 p-4 flex flex-wrap items-end gap-4"
      >
        <div class="flex flex-col gap-1">
          <label class="text-xs text-slate-500 uppercase tracking-wider" for="filter-start"
            >Start date</label
          >
          <input
            id="filter-start"
            type="date"
            class="rounded border-slate-600 bg-slate-700 text-slate-200 text-sm px-2 py-1.5"
            [ngModel]="startValue()"
            (ngModelChange)="onStartChange($event)"
            [min]="minValue()"
            [max]="maxValue()"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-xs text-slate-500 uppercase tracking-wider" for="filter-end"
            >End date</label
          >
          <input
            id="filter-end"
            type="date"
            class="rounded border-slate-600 bg-slate-700 text-slate-200 text-sm px-2 py-1.5"
            [ngModel]="endValue()"
            (ngModelChange)="onEndChange($event)"
            [min]="minValue()"
            [max]="maxValue()"
          />
        </div>

        @if (state.hasMultipleZones()) {
          <div class="flex flex-col gap-1">
            <label class="text-xs text-slate-500 uppercase tracking-wider" for="filter-zone"
              >Zone</label
            >
            <select
              id="filter-zone"
              class="rounded border-slate-600 bg-slate-700 text-slate-200 text-sm px-2 py-1.5"
              [ngModel]="zoneValue()"
              (ngModelChange)="onZoneChange($event)"
            >
              <option value="">All zones ({{ state.availableZones().length }})</option>
              @for (zone of state.availableZones(); track zone) {
                <option [value]="zone">{{ zone }}</option>
              }
            </select>
          </div>
        }

        <button
          class="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2 self-center disabled:opacity-40 disabled:no-underline"
          (click)="onReset()"
          [disabled]="!isFiltering()"
        >
          Reset filters
        </button>

        @if (!state.hasFilteredData()) {
          <p class="text-xs text-rose-400 self-center ml-auto">No rows in selection</p>
        } @else {
          <p class="text-xs text-slate-500 self-center ml-auto">
            Showing {{ filteredRowsLabel() }}
          </p>
        }
      </div>
    }
  `,
})
export class FilterPanelComponent {
  state = inject(StateService);

  startValue = computed(() => toUtcDateInputValue(this.state.filters().start));
  endValue = computed(() => toUtcDateInputValue(this.state.filters().end));
  zoneValue = computed(() => this.state.filters().zone ?? '');
  minValue = computed(() => toUtcDateInputValue(this.state.datasetRange()?.start ?? null));
  maxValue = computed(() => toUtcDateInputValue(this.state.datasetRange()?.end ?? null));

  isFiltering = computed(() => {
    const f = this.state.filters();
    const range = this.state.datasetRange();
    if (!range) return false;
    const startMatch = !f.start || (range.start && f.start.getTime() === range.start.getTime());
    const endMatch = !f.end || (range.end && f.end.getTime() === range.end.getTime());
    const zoneMatch = !f.zone;
    return !(startMatch && endMatch && zoneMatch);
  });

  filteredRowsLabel = computed(() => {
    const enriched = this.state.analysis()?.enrichedRows ?? [];
    return `${enriched.length.toLocaleString()} rows`;
  });

  onStartChange(value: string) {
    const date = fromUtcDateInputValue(value);
    this.state.setFilters({ start: date });
  }

  onEndChange(value: string) {
    const date = fromUtcDateInputValue(value);
    this.state.setFilters({ end: date });
  }

  onZoneChange(value: string) {
    this.state.setFilters({ zone: value || null });
  }

  onReset() {
    this.state.resetFilters();
  }
}
