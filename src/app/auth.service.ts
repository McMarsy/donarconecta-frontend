import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { ALL_ROLES } from './config';

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  user = signal<User | null>(null);

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string): Observable<User> {
    if (environment.demo) {
      if (email === 'admin@donarconecta.test' && password === 'Demo123!') {
        const u: User = { id: 1, name: 'Administración', email, role: 'Administrador' };
        this.user.set(u);
        return of(u);
      }
      return throwError(() => new Error('Credenciales de demostración incorrectas'));
    }

    // Laravel Sanctum requiere obtener la cookie XSRF antes del POST.
    return this.http.get(`${environment.backendUrl}/sanctum/csrf-cookie`, {
      withCredentials: true
    }).pipe(
      switchMap(() => this.http.post<{ user: unknown }>(
        `${environment.apiUrl}/login`,
        { email, password },
        { withCredentials: true }
      )),
      map(response => this.normalized(response.user)),
      tap(u => this.user.set(u))
    );
  }

  me(): Observable<User | null> {
    if (environment.demo) return of(this.user());
    return this.http.get<{ user: unknown }>(`${environment.apiUrl}/me`, {
      withCredentials: true
    }).pipe(
      map(response => this.normalized(response.user)),
      tap(u => this.user.set(u))
    );
  }

  private normalized(raw: any): User {
    let role = raw?.role;
    if (role && typeof role === 'object') role = role.name;
    if (!role && raw?.role_id) role = ALL_ROLES[Number(raw.role_id) - 1];
    return {
      id: Number(raw?.id),
      name: String(raw?.name ?? ''),
      email: String(raw?.email ?? ''),
      role: String(role ?? 'Sin rol'),
      status: raw?.status
    };
  }

  logout(): void {
    if (environment.demo) {
      this.clear();
      return;
    }
    this.http.post(`${environment.apiUrl}/logout`, {}, {
      withCredentials: true
    }).subscribe({
      next: () => this.clear(),
      error: () => this.clear()
    });
  }

  clear(): void {
    this.user.set(null);
    void this.router.navigateByUrl('/login');
  }

  can(roles: string[]): boolean {
    const u = this.user();
    return !!u && roles.includes(u.role);
  }

  recover(email: string): Observable<unknown> {
    return this.http.post(`${environment.apiUrl}/forgot-password`, { email }, {
      withCredentials: true
    });
  }

  reset(data: any): Observable<unknown> {
    return this.http.post(`${environment.apiUrl}/reset-password`, data, {
      withCredentials: true
    });
  }
}
