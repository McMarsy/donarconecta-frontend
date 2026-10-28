import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay, map, tap } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { modules } from './config';
export type RecordData = Record<string,any>;
const initial: Record<string,RecordData[]> = {
 users:[{id:1,name:'Administración',email:'admin@donarconecta.test',role_id:1,status:'ACTIVO'},{id:2,name:'María López',email:'maria@donarconecta.test',role_id:2,status:'ACTIVO'}],
 roles:[{id:1,name:'Administrador'},{id:2,name:'Encargado de donaciones'},{id:3,name:'Encargado de inventario'},{id:4,name:'Encargado de entregas'},{id:5,name:'Supervisor'},{id:6,name:'Donante'},{id:7,name:'Beneficiario'}],
 donantes:[{id:1,tipo_donante:'PERSONA',nombre:'Ana',apellido:'García',telefono:'5555-0101',email:'ana@ejemplo.com',estado:'ACTIVO'},{id:2,tipo_donante:'EMPRESA',nombre:'Fundación',apellido:'',empresa:'Solidaridad GT',telefono:'5555-0102',estado:'ACTIVO'}],
 'tipos-donacion':[{id:1,nombre:'Alimentos',descripcion:'Víveres y alimentos no perecederos'},{id:2,nombre:'Ropa',descripcion:'Prendas en buen estado'},{id:3,nombre:'Medicinas',descripcion:'Medicamentos permitidos'}],
 donaciones:[{id:1,donante_id:1,tipo_donacion_id:1,cantidad:100,fecha_recepcion:'2026-10-10',estado:'DISPONIBLE',observaciones:'Bolsas de víveres'},{id:2,donante_id:2,tipo_donacion_id:2,cantidad:50,fecha_recepcion:'2026-10-12',estado:'RECIBIDA'}],
 inventario:[{id:1,recurso:'Bolsas de víveres',donacion_id:1,existencia:100,ubicacion:'Bodega central'},{id:2,recurso:'Ropa',donacion_id:2,existencia:50,ubicacion:'Bodega central'}],
 'inventario/movimientos':[{id:1,inventario_id:1,tipo:'ENTRADA',cantidad:100,created_at:'2026-10-10'}],
 beneficiarios:[{id:1,nombre:'Pedro Ramírez',telefono:'5555-0123',necesidad:'Alimentación',estado:'ACTIVO'},{id:2,nombre:'Lucía Pérez',telefono:'5555-0423',necesidad:'Ropa',estado:'ACTIVO'}],
 solicitudes:[{id:1,beneficiario_id:1,tipo_necesidad:'Alimentos',fecha:'2026-10-12',estado:'APROBADA',descripcion:'Apoyo familiar'}],
 asignaciones:[{id:1,beneficiario_id:1,inventario_id:1,cantidad:10,estado:'PENDIENTE'}], entregas:[], bitacora:[{id:1,usuario:'Administración',accion:'INICIO_DEMO',registro:'Sistema',created_at:'2026-10-14'}]
};
@Injectable({providedIn:'root'})
export class DataService {
 private db:Record<string,RecordData[]> = structuredClone(initial);
 private nextId=20;
 changes=signal(0);
 constructor(private http:HttpClient){}
 private notify(){this.changes.update(v=>v+1);}
 private items(endpoint:string){return this.db[endpoint] ?? (this.db[endpoint]=[]);}
 list(endpoint:string,filters:RecordData={}):Observable<RecordData[]> {
  if(!environment.demo){let params=new HttpParams();Object.entries(filters).forEach(([k,v])=>{if(v!==''&&v!==undefined&&v!==null)params=params.set(k,String(v));});return this.http.get<any>(`${environment.apiUrl}/${endpoint}`,{params}).pipe(map(r=>Array.isArray(r)?r:(r.data??[])));}
  let data=this.items(endpoint).filter(row=>Object.entries(filters).every(([k,v])=>!v||String(row[k]??'').toLowerCase().includes(String(v).toLowerCase())));return of(structuredClone(data)).pipe(delay(100));
 }
 one(endpoint:string,id:number){return environment.demo?of(structuredClone(this.items(endpoint).find(r=>r['id']===id)??{})):this.http.get<RecordData>(`${environment.apiUrl}/${endpoint}/${id}`);}
 create(endpoint:string,payload:RecordData):Observable<any>{
  if(!environment.demo)return this.http.post(`${environment.apiUrl}/${endpoint}`,payload);
  const obj={id:this.nextId++,...payload};
  if(endpoint==='asignaciones') {const inv=this.items('inventario').find(r=>r['id']==payload['inventario_id']);const q=Number(payload['cantidad']);if(!inv||!Number.isFinite(q)||q<=0||q>Number(inv['existencia']))return throwError(()=>new Error('Cantidad inválida o inventario insuficiente'));inv['existencia']-=q;this.movement(inv['id'],'RESERVA',q);(obj as RecordData)['estado']='PENDIENTE';}
  if(endpoint==='entregas'){const ass=this.items('asignaciones').find(r=>r['id']==payload['asignacion_id']);const q=Number(payload['cantidad']);const delivered=this.items('entregas').filter(e=>e['asignacion_id']==payload['asignacion_id']).reduce((sum,e)=>sum+Number(e['cantidad']),0);if(!ass||q<=0||q>Number(ass['cantidad'])-delivered)return throwError(()=>new Error('La cantidad excede el saldo asignado'));if(!payload['responsable_id'])return throwError(()=>new Error('Debes indicar responsable'));ass['estado']=q+delivered===Number(ass['cantidad'])?'ENTREGADA':'PARCIAL';this.movement(ass['inventario_id'],'ENTREGA',q);}
  this.items(endpoint).unshift(obj);this.log('CREAR_'+endpoint,obj['id']);this.notify();return of(obj).pipe(delay(100));
 }
 update(endpoint:string,id:number,payload:RecordData){
  if(!environment.demo)return this.http.put(`${environment.apiUrl}/${endpoint}/${id}`,payload);
  if(['asignaciones','entregas'].includes(endpoint))return throwError(()=>new Error('No se permite modificar esta operación histórica en modo demostración'));
  const obj=this.items(endpoint).find(r=>r['id']===id);if(!obj)return throwError(()=>new Error('Registro no encontrado'));Object.assign(obj,payload);this.log('ACTUALIZAR_'+endpoint,id);this.notify();return of(obj).pipe(delay(100));
 }
 status(endpoint:string,id:number,status:string){
  if(!environment.demo)return this.http.patch(`${environment.apiUrl}/${endpoint}/${id}/estado`,{estado:status});
  const obj=this.items(endpoint).find(r=>r['id']===id);if(!obj)return throwError(()=>new Error('No existe'));obj['estado']=status;this.log('ESTADO_'+endpoint,id);this.notify();return of(obj);}
 movement(id:number,type:string,q:number){this.items('inventario/movimientos').unshift({id:this.nextId++,inventario_id:id,tipo:type,cantidad:q,created_at:new Date().toISOString()});}
 inventoryMovement(type:'entrada'|'salida',inventario_id:number,cantidad:number){
  if(!environment.demo)return this.http.post(`${environment.apiUrl}/inventario/${type}`,{inventario_id,cantidad});
  const obj=this.items('inventario').find(r=>r['id']==inventario_id);if(!obj||!Number.isFinite(cantidad)||cantidad<=0||type==='salida'&&cantidad>Number(obj['existencia']))return throwError(()=>new Error('Recurso o cantidad no válidos'));
  obj['existencia']+=type==='entrada'?cantidad:-cantidad;this.movement(inventario_id,type.toUpperCase(),cantidad);this.log('INVENTARIO_'+type,inventario_id);this.notify();return of(obj);
 }
 uploadEvidence(id:number,file:File){if(!environment.demo){const form=new FormData();form.append('archivo',file);return this.http.post(`${environment.apiUrl}/entregas/${id}/evidencia`,form);}this.log('EVIDENCIA_ENTREGA',id);return of({success:true});}
 tracking(id:number){if(!environment.demo)return this.http.get<any>(`${environment.apiUrl}/donaciones/${id}/trazabilidad`);const donation=this.items('donaciones').find(d=>d['id']===id);const inv=this.items('inventario').find(i=>i['donacion_id']===id);const assignments=this.items('asignaciones').filter(a=>a['inventario_id']===inv?.['id']);return of({donacion:donation,donante:this.items('donantes').find(d=>d['id']===donation?.['donante_id']),inventario:inv,asignaciones:assignments,entregas:this.items('entregas').filter(e=>assignments.some(a=>a['id']===e['asignacion_id']))});}
 report(endpoint:string,filters:RecordData){if(!environment.demo){let params=new HttpParams();Object.entries(filters).forEach(([k,v])=>{if(v)params=params.set(k,String(v));});return this.http.get<any>(`${environment.apiUrl}/reportes/${endpoint}`,{params});}return of(this.demoReport(endpoint));}
 private demoReport(e:string):RecordData[]{if(e==='inventario')return this.items('inventario');if(e==='donantes')return this.items('donantes');if(e==='beneficiarios')return this.items('beneficiarios');if(e==='movimientos')return this.items('inventario/movimientos');if(e==='donaciones-entregadas')return this.items('donaciones').filter(d=>d['estado']==='ENTREGADA');if(e==='donaciones-pendientes')return this.items('donaciones').filter(d=>d['estado']!=='ENTREGADA');return this.items('donaciones');}
 dashboard(){if(!environment.demo)return this.http.get<RecordData>(`${environment.apiUrl}/dashboard`);return of({donaciones_recibidas:this.items('donaciones').length,donaciones_pendientes:this.items('donaciones').filter(x=>x['estado']!=='ENTREGADA').length,donaciones_entregadas:this.items('entregas').length,beneficiarios:this.items('beneficiarios').length,donantes:this.items('donantes').length,recursos_disponibles:this.items('inventario').reduce((s,x)=>s+Number(x['existencia']),0)});}
 log(action:string,id:number){this.items('bitacora').unshift({id:this.nextId++,usuario:'Usuario demostración',accion:action,registro:'#'+id,created_at:new Date().toLocaleString('es-GT')});}
}
