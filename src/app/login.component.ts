import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../environments/environment';
@Component({standalone:true,imports:[FormsModule],template:`
<div class="login-page"><section class="login-story"><div class="wordmark"><span class="logo">◆</span> DonarConecta</div><div><p class="eyebrow">GESTIÓN SOLIDARIA</p><h1>Conectamos donaciones con quienes más las necesitan.</h1><p>Organiza cada recurso desde su recepción hasta la entrega, con control y transparencia.</p><div class="story-pills"><span>✓ Transparencia</span><span>✓ Trazabilidad</span><span>✓ Impacto</span></div></div><small>Sistema de gestión de donaciones</small></section>
<section class="login-panel"><div class="login-card"><div class="mobile-brand">◆ DonarConecta</div><p class="eyebrow">BIENVENIDO</p><h2>{{mode==='login'?'Iniciar sesión':mode==='forgot'?'Recuperar acceso':'Restablecer contraseña'}}</h2><p class="muted">{{mode==='login'?'Ingresa tus credenciales para continuar.':'Completa los datos para gestionar tu acceso.'}}</p>
<form (ngSubmit)="submit()"><label>Correo electrónico<input type="email" name="email" [(ngModel)]="email" autocomplete="username" required></label>
@if(mode!=='forgot'){<label>{{mode==='login'?'Contraseña':'Nueva contraseña'}}<input type="password" name="password" [(ngModel)]="password" [attr.autocomplete]="mode==='login'?'current-password':'new-password'" required minlength="8"></label>}
@if(mode==='reset'){<label>Token de recuperación<input name="token" [(ngModel)]="token" required></label><label>Confirmar contraseña<input name="confirmation" type="password" [(ngModel)]="confirmation" required></label>}
@if(error()){<div class="error">{{error()}}</div>}
@if(message()){<div class="success">{{message()}}</div>}
<button class="btn primary full" type="submit" [disabled]="busy()">{{busy()?'Procesando...':mode==='login'?'Ingresar':mode==='forgot'?'Enviar enlace':'Restablecer'}}</button></form>
<button class="linkbtn" (click)="mode=mode==='login'?'forgot':'login';error.set('');message.set('')">{{mode==='login'?'¿Olvidó su contraseña?':'Volver al inicio de sesión'}}</button>
@if(mode==='forgot'){<button class="linkbtn" (click)="mode='reset'">Ya tengo un token</button>}
@if(demo){<div class="demo-login"><strong>Modo demostración</strong><span>admin@donarconecta.test</span><span>Demo123!</span><button class="btn ghost" (click)="fillDemo()">Usar credenciales de prueba</button></div>}
</div></section></div>`})
export class LoginComponent {
 private auth=inject(AuthService);private router=inject(Router);demo=environment.demo;
 email='';password='';token='';confirmation='';mode:'login'|'forgot'|'reset'='login';busy=signal(false);error=signal('');message=signal('');
 fillDemo(){this.email='admin@donarconecta.test';this.password='Demo123!';}
 submit(){this.error.set('');this.message.set('');this.busy.set(true);if(this.mode==='login'){this.auth.login(this.email,this.password).subscribe({next:()=>{this.busy.set(false);void this.router.navigateByUrl('/dashboard');},error:e=>{this.error.set(e.error?.message??e.message??'No se pudo iniciar sesión');this.busy.set(false);}});return;}
 if(this.demo){this.busy.set(false);this.message.set('La recuperación requiere conexión al backend Laravel.');return;}
 const req=this.mode==='forgot'?this.auth.recover(this.email):this.auth.reset({email:this.email,token:this.token,password:this.password,password_confirmation:this.confirmation});req.subscribe({next:()=>{this.message.set('Solicitud procesada. Revisa tu correo o intenta iniciar sesión.');this.busy.set(false);},error:e=>{this.error.set(e.error?.message??'No fue posible completar la solicitud');this.busy.set(false);}});
 }
}
