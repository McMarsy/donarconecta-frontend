import { ApplicationConfig, inject, provideAppInitializer } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  HttpInterceptorFn,
  provideHttpClient,
  withInterceptors,
  withXsrfConfiguration
} from '@angular/common/http';
import { catchError, firstValueFrom, of, throwError } from 'rxjs';
import { routes } from './app.routes';
import { AuthService } from './auth.service';
import { environment } from '../environments/environment';

const apiInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const isApi = request.url.startsWith(`${environment.apiUrl}/`);
  const isSanctum = request.url.includes('/sanctum/');

  if (isApi || isSanctum) {
    request = request.clone({
      withCredentials: true,
      setHeaders: { Accept: 'application/json' }
    });
  }

  return next(request).pipe(
    catchError(error => {
      // Al cargar la aplicación, /api/me puede devolver 401 si aún no hay sesión.
      // Solo redirigimos cuando existía un usuario autenticado.
      if (isApi && error.status === 401 && auth.user()) auth.clear();
      return throwError(() => error);
    })
  );
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withXsrfConfiguration({
        cookieName: 'XSRF-TOKEN',
        headerName: 'X-XSRF-TOKEN'
      }),
      withInterceptors([apiInterceptor])
    ),
    provideAppInitializer(() => {
      if (environment.demo) return;
      const auth = inject(AuthService);
      return firstValueFrom(auth.me().pipe(catchError(() => of(null)))).then(() => undefined);
    })
  ]
};
