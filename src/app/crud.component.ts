import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DataService,RecordData } from './data.service';
import { ModuleDef } from './config';
import { AuthService } from './auth.service';
@Component({standalone:true,imports:[FormsModule],template:`
<div class="section-heading"><div><p class="eyebrow">GESTIÓN DE REGISTROS</p><h1>{{cfg.title}}</h1><p class="muted">Consulta y administra la información de {{cfg.title.toLowerCase()}}.</p></div>@if(!cfg.readonly&&canEdit()){<button class="btn primary" (click)="openNew()">+ Nuevo registro</button>}</div>
<section class="card table-card"><div class="table-toolbar"><div class="search-wrap"><span>⌕</span><input placeholder="Buscar en todos los campos..." [(ngModel)]="search" (ngModelChange)="page=1"></div><div class="toolbar-right"><span class="count">{{filtered().length}} registros</span><button class="btn ghost" (click)="load()">↻ Actualizar</button></div></div>
@if(error()){<div class="error">{{error()}}</div>}
@if(loading()){<div class="empty">Cargando datos...</div>}@else if(!filtered().length){<div class="empty"><div>▤</div><h3>No hay registros</h3><p>Prueba otra búsqueda o agrega uno nuevo.</p></div>}@else{<div class="table-scroll"><table><thead><tr><th>ID</th>@for(c of cfg.columns;track c){<th>{{label(c)}}</th>}<th>Acciones</th></tr></thead><tbody>@for(row of paged();track row['id']){<tr><td class="id-cell">#{{row['id']}}</td>@for(c of cfg.columns;track c){<td>@if(c==='estado'||c==='status'){<span class="status" [class.green]="row[c]==='ACTIVO'||row[c]==='APROBADA'||row[c]==='ENTREGADA'||row[c]==='DISPONIBLE'" [class.amber]="row[c]==='PENDIENTE'||row[c]==='RECIBIDA'">{{row[c]??'—'}}</span>}@else{ {{display(row[c])}} }</td>}<td class="row-actions"><button title="Ver detalle" (click)="view(row)">👁</button>@if(!cfg.readonly&&canEdit()&&cfg.key!=='asignaciones'&&cfg.key!=='entregas'){<button title="Editar" (click)="edit(row)">✎</button>}</td></tr>}</tbody></table></div><div class="pagination"><span>Página {{page}} de {{pages()}}</span><div><button (click)="page=page-1" [disabled]="page<=1">Anterior</button><button (click)="page=page+1" [disabled]="page>=pages()">Siguiente</button></div></div>}</section>
@if(modal()){<div class="overlay" (click)="close()"><div class="modal" (click)="$event.stopPropagation()"><div class="modal-header"><div><p class="eyebrow">{{mode==='new'?'CREAR REGISTRO':mode==='edit'?'EDITAR REGISTRO':'DETALLE'}}</p><h2>{{cfg.title}}</h2></div><button class="close" (click)="close()">✕</button></div>
@if(mode==='view'){<dl class="detail-grid">@for(entry of entries();track entry[0]){<div><dt>{{label(entry[0])}}</dt><dd>{{display(entry[1])}}</dd></div>}</dl>@if(cfg.key==='entregas'){<div class="evidence-box"><h3>Evidencia de entrega</h3><p class="muted">Adjunta PDF o imagen (máximo 5 MB). El backend verifica el archivo.</p><input type="file" accept=".pdf,.jpg,.jpeg,.png" (change)="uploadEvidence($event)"></div>}}@else{<form (ngSubmit)="save()" id="itemForm"><div class="form-grid">@for(f of cfg.fields;track f.key){<label [class.wide]="f.type==='textarea'">{{f.label}} @if(f.required){<em>*</em>}
@if(f.type==='select'){<select [name]="f.key" [(ngModel)]="form[f.key]" [required]="!!f.required"><option value="">Seleccionar</option>@for(o of f.options??[];track o){<option [value]="o">{{o}}</option>}</select>}
@else if(f.type==='textarea'){<textarea [name]="f.key" [(ngModel)]="form[f.key]" rows="3"></textarea>}
@else{<input [name]="f.key" [type]="f.type??'text'" [(ngModel)]="form[f.key]" [required]="!!f.required && !(f.key==='password'&&mode==='edit')" [min]="f.type==='number'?0:null">}</label>}</div></form>}
@if(error()){<div class="error">{{error()}}</div>}
<div class="modal-footer"><button class="btn ghost" (click)="close()">Cerrar</button>@if(mode!=='view'){<button class="btn primary" form="itemForm" type="submit" [disabled]="saving()">{{saving()?'Guardando...':'Guardar registro'}}</button>}</div></div></div>}
`})
export class CrudComponent implements OnInit {
 private route=inject(ActivatedRoute);private api=inject(DataService);private auth=inject(AuthService);
 cfg!:ModuleDef;rows=signal<RecordData[]>([]);loading=signal(false);error=signal('');saving=signal(false);modal=signal(false);mode:'new'|'edit'|'view'='new';form:RecordData={};selected:RecordData={};search='';page=1;size=8;
 ngOnInit(){this.route.data.subscribe(d=>{this.cfg=d['module'];this.page=1;this.search='';this.load();});}
 canEdit(){return !['Supervisor','Donante','Beneficiario'].includes(this.auth.user()?.role??'');}
 load(){this.loading.set(true);this.error.set('');this.api.list(this.cfg.endpoint).subscribe({next:d=>{this.rows.set(d);this.loading.set(false);},error:e=>{this.error.set(e.error?.message??'No se pudieron cargar los registros. Verifica la API.');this.loading.set(false);}});}
 label(k:string){const special:Record<string,string>={id:'ID',role_id:'Rol (ID)',donante_id:'Donante (ID)',tipo_donacion_id:'Tipo de donación (ID)',beneficiario_id:'Beneficiario (ID)',inventario_id:'Recurso (ID)',responsable_id:'Responsable (ID)',created_at:'Fecha de registro',fecha_recepcion:'Fecha de recepción',status:'Estado'};return special[k]??k.replaceAll('_',' ').replace(/^./,s=>s.toUpperCase());}
 display(v:any){return v===null||v===undefined||v===''?'—':typeof v==='object'?JSON.stringify(v):String(v);}
 filtered(){const q=this.search.toLowerCase().trim();return this.rows().filter(r=>Object.values(r).some(v=>String(v??'').toLowerCase().includes(q)));}
 pages(){return Math.max(1,Math.ceil(this.filtered().length/this.size));}
 paged(){return this.filtered().slice((this.page-1)*this.size,this.page*this.size);}
 entries(){return Object.entries(this.selected).filter(([k])=>k!=='password');}
 openNew(){this.mode='new';this.form={};this.selected={};this.error.set('');this.modal.set(true);}
 edit(row:RecordData){this.mode='edit';this.selected=row;this.form={...row};delete this.form['password'];this.error.set('');this.modal.set(true);}
 view(row:RecordData){this.mode='view';this.selected=row;this.error.set('');this.modal.set(true);}
 uploadEvidence(event:Event){const input=event.target as HTMLInputElement;const file=input.files?.[0];if(!file)return;const types=['application/pdf','image/jpeg','image/png'];if(!types.includes(file.type)||file.size>5*1024*1024){this.error.set('Solo PDF/JPG/PNG de hasta 5 MB');return;}this.api.uploadEvidence(Number(this.selected['id']),file).subscribe({next:()=>this.error.set('Evidencia enviada (en DEMO no se almacena el archivo)'),error:e=>this.error.set(e.error?.message??'No se pudo subir la evidencia')});}
 close(){this.modal.set(false);this.error.set('');}
 save(){for(const f of this.cfg.fields){const v=this.form[f.key];if(f.required&&(v===undefined||v===null||v==='')&&!(f.key==='password'&&this.mode==='edit')){this.error.set('Completa el campo: '+f.label);return;}}
 for(const f of this.cfg.fields.filter(f=>f.type==='number')){if(this.form[f.key]!==undefined&&this.form[f.key]!==''&&Number(this.form[f.key])<0){this.error.set('No se permiten cantidades negativas');return;}}
 if(['donaciones','asignaciones','entregas'].includes(this.cfg.key)&&Number(this.form['cantidad'])<=0){this.error.set('La cantidad debe ser mayor a cero');return;}
 const data={...this.form};if(!data['password'])delete data['password'];this.error.set('');this.saving.set(true);
 const req=this.mode==='new'?this.api.create(this.cfg.endpoint,data):this.api.update(this.cfg.endpoint,Number(this.selected['id']),data);
 req.subscribe({next:()=>{this.saving.set(false);this.close();this.load();},error:e=>{this.saving.set(false);this.error.set(e.error?.message??e.message??'No se pudo guardar');}});
 }
}
