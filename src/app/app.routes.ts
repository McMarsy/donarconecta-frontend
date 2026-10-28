import { Routes, CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { modules } from './config';
import { LoginComponent } from './login.component';
import { ShellComponent } from './shell.component';
import { DashboardComponent } from './dashboard.component';
import { CrudComponent } from './crud.component';
import { ReportsComponent } from './reports.component';
import { InventoryComponent } from './inventory.component';
import { TrackingComponent } from './tracking.component';
const guard:CanActivateFn=route=>{const a=inject(AuthService),router=inject(Router);if(!a.user())return router.createUrlTree(['/login']);const roles=route.data['roles'] as string[]|undefined;return !roles||a.can(roles)?true:router.createUrlTree(['/dashboard']);};
export const routes:Routes=[
 {path:'login',component:LoginComponent},
 {path:'',component:ShellComponent,canActivate:[guard],children:[
  {path:'dashboard',component:DashboardComponent},
  {path:'inventario',component:InventoryComponent,data:{roles:modules.find(m=>m.key==='inventario')!.roles},canActivate:[guard]},
  {path:'reportes',component:ReportsComponent,data:{roles:['Administrador','Supervisor','Encargado de donaciones','Encargado de inventario']},canActivate:[guard]},
  {path:'trazabilidad',component:TrackingComponent,data:{roles:['Administrador','Supervisor','Encargado de donaciones','Encargado de inventario','Encargado de entregas']},canActivate:[guard]},
  ...modules.filter(m=>m.key!=='inventario').map(m=>({path:m.key,component:CrudComponent,data:{module:m,roles:m.roles},canActivate:[guard]})),
  {path:'',pathMatch:'full',redirectTo:'dashboard'}
 ]}, {path:'**',redirectTo:'dashboard'}
];
