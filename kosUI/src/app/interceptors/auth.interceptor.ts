import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { BASE_URL } from '../apiUrls';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  const token        = localStorage.getItem('token');
  const user         = JSON.parse(localStorage.getItem('kos_user') || 'null');
  const restaurantId = user?.restaurantId;

  const headers: Record<string, string> = {};
  if (token)        headers['Authorization']   = `Bearer ${token}`;
  if (restaurantId) headers['X-Restaurant-Id'] = String(restaurantId);

  const authReq = req.clone({ setHeaders: headers });

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // Don't retry for auth endpoints — prevents infinite loops
      if (err.status === 401 && !req.url.includes('/auth/')) {
        const refreshToken = localStorage.getItem('refresh_token');

        if (refreshToken) {
          return from(
            fetch(`${BASE_URL}/auth/refresh`, {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({ refreshToken })
            }).then(res => {
              if (!res.ok) throw new Error('Refresh failed');
              return res.json();
            })
          ).pipe(
            switchMap((data: any) => {
              localStorage.setItem('token', data.accessToken);
              const retried = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${data.accessToken}`,
                  ...(restaurantId ? { 'X-Restaurant-Id': String(restaurantId) } : {})
                }
              });
              return next(retried);
            }),
            catchError(() => {
              clearSession();
              router.navigate(['/login']);
              return throwError(() => err);
            })
          );
        }

        clearSession();
        router.navigate(['/login']);
      }
      return throwError(() => err);
    })
  );
};

function clearSession(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('kos_user');
}
