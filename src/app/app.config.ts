import { ApplicationConfig } from '@angular/core';
import { provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideCharts(withDefaultRegisterables()),
  ]
};
