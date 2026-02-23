import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { routes } from './app.routes';
import { LayoutModule } from './layout/layout.module';
import { authInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withFetch()),

    // Angular Material / Animations
    provideAnimations(),
    provideAnimationsAsync(),

    // Layout module (router-outlet fix)
    importProvidersFrom(LayoutModule),
      provideHttpClient(
        withInterceptors([authInterceptor])
    )
  ]
};
