import { Component, inject, signal } from '@angular/core';
import { RouterLink,RouterLinkActive,RouterOutlet } from '@angular/router';
import { AuthService } from './auth.service';
import { modules } from './config';
import { environment } from '../environments/environment';
@Component({standalone:true,imports:[RouterOutlet,RouterLink,RouterLinkActive],template:`
<div class="app-shell"><aside class="sidebar" [class.open]="mobile()"><div class="brand"><span class="brand-icon">◆</span><div><strong>DonarConecta</strong><small>Panel de gestión</small></div></div>
<div class="nav-scroll"><p class="nav-label">GENERAL</p><a routerLink="/dashboard" routerLinkActive="selected" (click)="mobile.set(false)"><span>▦</span> Dashboard</a>
<p class="nav-label">OPERACIONES</p>
@for(m of mods;track m.key){@if(can(m.roles)&&m.key!=='roles'&&m.key!=='bitacora'&&m.key!=='movimientos'&&m.key!=='tipos'){<a [routerLink]="'/'+m.key" routerLinkActive="selected" (click)="mobile.set(false)"><span>{{m.icon}}</span> {{m.title}}</a>}}
@if(can(['Administrador','Supervisor','Encargado de donaciones','Encargado de inventario','Encargado de entregas'])){<a routerLink="/trazabilidad" routerLinkActive="selected" (click)="mobile.set(false)"><span>🔎</span> Trazabilidad</a>}
@if(can(['Administrador','Supervisor','Encargado de donaciones','Encargado de inventario'])){<a routerLink="/reportes" routerLinkActive="selected" (click)="mobile.set(false)"><span>📊</span> Reportes</a>}
<p class="nav-label">ADMINISTRACIÓN</p>
@for(m of mods;track m.key){@if(can(m.roles)&&(m.key==='roles'||m.key==='bitacora'||m.key==='movimientos'||m.key==='tipos')){<a [routerLink]="'/'+m.key" routerLinkActive="selected" (click)="mobile.set(false)"><span>{{m.icon}}</span> {{m.title}}</a>}}
</div><div class="sidebar-foot"><div class="avatar">{{(auth.user()?.name??'U').charAt(0)}}</div><div><strong>{{auth.user()?.name}}</strong><small>{{auth.user()?.role}}</small></div><button (click)="auth.logout()" title="Cerrar sesión">⇥</button></div></aside>
<main class="main"><header class="topbar"><button class="mobile-menu" (click)="mobile.set(!mobile())">☰</button><div><span class="bread">Sistema de gestión de donaciones</span><strong>Panel de administración</strong></div><div class="top-actions">@if(demo){<span class="demo-badge">● DEMO</span>}<span class="top-avatar">{{(auth.user()?.name??'U').charAt(0)}}</span></div></header><div class="page"><router-outlet /></div></main></div>`})
export class ShellComponent {auth=inject(AuthService);mods=modules;mobile=signal(false);demo=environment.demo;can(roles:string[]){return this.auth.can(roles);}}
