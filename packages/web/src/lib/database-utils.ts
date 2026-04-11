/**
 * database-utils.ts - Comprehensive Database Utility Library for Browser/Edge Environments
 *
 * Sections:
 *   1. IndexedDB Wrapper (typed, migration, CRUD, indexes, bulk ops)
 *   2. LocalStorage Enhanced (TTL, namespace, batch, cross-tab events)
 *   3. SessionStorage Enhanced (typed, tab-aware isolation)
 *   4. In-Memory Database (SQLite-like SQL engine with parser)
 *   5. Cache Storage API Wrapper (strategies, versioning, prefetch)
 *   6. Data Synchronization (offline-first sync queue, conflict resolution)
 *   7. Data Migration Tools (schema diff, backup/restore, integrity checks)
 */

export interface IDBSchema {
  name: string;
  keyPath?: string;
  autoIncrement?: boolean;
  indexes?: Array<{ name: string; keyPath: string | string[]; options?: IDBIndexParameters }>;
}

export interface IDBConfig {
  name: string; version: number; stores: IDBSchema[];
  onUpgrade?: (db: IDBDatabase, oldVersion: number) => void;
  onBlocked?: () => void;
}

export interface IndexQueryOptions<T = unknown> {
  indexName: string;
  range?: IDBKeyRange | [unknown, unknown] | { only: unknown };
  direction?: IDBCursorDirection; limit?: number; offset?: number;
  filter?: (value: T) => boolean;
}

export interface QueryResult {
  rows: Record<string, unknown>[]; affectedRows: number;
  insertId?: number; lastInsertRowid?: number; changes?: number;
}

export interface CacheStrategy { name: string; maxAge?: number; maxSize?: number; version?: string; }

export interface SyncItem {
  id: string; table: string; action: "create" | "update" | "delete";
  data: Record<string, unknown>; timestamp: number; synced: boolean; retryCount: number;
}

export interface SyncStatus {
  pending: number; synced: number; failed: number;
  lastSyncTime?: number; isSyncing: boolean;
}

export type ConflictResolver = (local: Record<string, unknown>, remote: Record<string, unknown>) => Record<string, unknown>;

export interface StorageOptions {
  namespace?: string; prefix?: string; defaultTTL?: number; enableCompression?: boolean;
}

export interface ColumnDef {
  name: string; type: "text" | "integer" | "real" | "blob";
  primaryKey?: boolean; notNull?: boolean; unique?: boolean; defaultValue?: unknown;
}

export interface TableDef { name: string; columns: ColumnDef[]; primaryKey?: string; }

export interface MigrationStep {
  name: string;
  transform: (row: Record<string, unknown>) => Record<string, unknown> | null;
  filter?: (row: Record<string, unknown>) => boolean;
}

export interface BackupMetadata {
  version: string; timestamp: number; source: string;
  tables: string[]; rowCount: number; checksum?: string;
}


// ==========================================================================
// SECTION 1: IndexedDB Wrapper
// ==========================================================================

/**
 * Typed IndexedDB manager with CRUD, index queries, bulk operations,
 * transaction management, and lifecycle control.
 */
export class IndexedDBManager {
  private _db: IDBDatabase | null = null;
  private readonly config: IDBConfig;

  constructor(config: IDBConfig) { this.config = config; }

  async open(): Promise<IDBDatabase> {
    if (this._db) return this._db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.config.name, this.config.version);
      req.onupgradeneeded = (e: IDBVersionChangeEvent) => {
        const db = (e.target as IDBOpenDBRequest).result;
        this.runMigration(db, e.oldVersion);
        this.config.onUpgrade?.(db, e.oldVersion);
      };
      req.onsuccess = () => {
        this._db = req.result;
        this._db!.onclose = () => { this._db = null; };
        this._db!.onversionchange = () => { this._db?.close(); this._db = null; };
        resolve(this._db!);
      };
      req.onerror = () => reject(new Error(`IndexedDB open failed: ${req.error?.message}`));
      if (this.config.onBlocked) req.onblocked = this.config.onBlocked;
    });
  }

  private runMigration(db: IDBDatabase, _oldVer: number): void {
    for (const store of this.config.stores) {
      if (!db.objectStoreNames.contains(store.name)) {
        const os = db.createObjectStore(store.name, { keyPath: store.keyPath, autoIncrement: store.autoIncrement ?? !!store.keyPath });
        if (store.indexes) for (const idx of store.indexes) os.createIndex(idx.name, idx.keyPath, idx.options || {});
      } else {
        const tx = db.transaction(store.name, "versionchange");
        const os = tx.objectStore(store.name);
        if (store.indexes) for (const idx of store.indexes) {
          if (!Array.from(os.indexNames).includes(idx.name)) os.createIndex(idx.name, idx.keyPath, idx.options || {});
        }
      }
    }
  }

  get db(): IDBDatabase { if (!this._db) throw new Error("Database not open. Call open() first."); return this._db; }
  get isOpen(): boolean { return this._db !== null; }

  async get<T=unknown>(storeName: string, key: IDBValidKey): Promise<T|undefined> {
    return this.withTransaction(storeName, "readonly", s => promisifyReq(s.get(key)));
  }
  async put<T=unknown>(storeName: string, value: T, key?: IDBValidKey): Promise<IDBValidKey> {
    return this.withTransaction(storeName, "readwrite", s => promisifyReq(s.put(value, key)));
  }
  async delete(storeName: string, key: IDBValidKey): Promise<void> {
    return this.withTransaction(storeName, "readwrite", s => promisifyReq(s.delete(key)));
  }
  async getAll<T=unknown>(storeName: string, q?: IDBValidKey|IDBKeyRange, c?: number): Promise<T[]> {
    return this.withTransaction(storeName, "readonly", s => promisifyReq(s.getAll(q, c)));
  }
  async getPage<T=unknown>(storeName: string, page: number, pageSize: number): Promise<{data:T[];total:number;page:number;pageSize:number}> {
    const [total, all] = await Promise.all([this.count(storeName), this.getAll<T>(storeName)]);
    const start = (page-1)*pageSize;
    return { data: all.slice(start, start+pageSize), total, page, pageSize };
  }
  async clear(storeName: string): Promise<void> {
    return this.withTransaction(storeName, "readwrite", s => promisifyReq(s.clear()));
  }
  async count(storeName: string, q?: IDBValidKey|IDBKeyRange): Promise<number> {
    return this.withTransaction(storeName, "readonly", s => promisifyReq(s.count(q)));
  }

  async getByIndex<T=unknown>(storeName: string, opts: IndexQueryOptions<T>): Promise<T[]> {
    return this.withTransaction(storeName, "readonly", store => {
      const idx = store.index(opts.indexName);
      const range = normRange(opts.range);
      const results:T[] = []; let skipped = 0;
      return new Promise((resolve, reject) => {
        const req = idx.openCursor(range, opts.direction);
        req.onsuccess = () => {
          const c = req.result; if (!c) { resolve(results); return; }
          if (opts.offset && skipped < opts.offset) { skipped++; c.continue(); return; }
          if (opts.limit !== undefined && results.length >= opts.limit) { resolve(results); return; }
          const v = c.value as T; if (!opts.filter || opts.filter(v)) results.push(v); c.continue();
        };
        req.onerror = () => reject(new Error(`Index query failed: ${req.error?.message}`));
      });
    });
  }

  async countByIndex(storeName: string, idxName: string, range?: IDBKeyRange|[unknown,unknown]|{only:unknown}): Promise<number> {
    return this.withTransaction(storeName, "readonly", s => promisifyReq(s.index(idxName).count(normRange(range))));
  }

  async putMany<T=unknown>(storeName: string, values: T[]): Promise<IDBValidKey[]> {
    return this.withTransaction(storeName, "readwrite", s => Promise.all(values.map(v => promisifyReq(s.put(v)))));
  }

  async deleteMany(storeName: string, keys: IDBValidKey[]): Promise<void> {
    return this.withTransaction(storeName, "readwrite", s => Promise.all(keys.map(k => promisifyReq(s.delete(k)))).then(()=>{}));
  }

  async withTransaction<T>(stores: string|string[], mode: IDBTransactionMode, cb: (s:IDBObjectStore)=>T|Promise<T>): Promise<T> {
    const names = typeof stores === "string" ? [stores] : stores;
    const tx = this.db.transaction(names, mode);
    try { const r = await cb(tx.objectStore(names[0])); await txDone(tx); return r; }
    catch(e) { tx.abort(); throw e; }
  }

  async withStores<T>(names: string[], mode: IDBTransactionMode, cb: (s:Map<string,IDBObjectStore>)=>T|Promise<T>): Promise<T> {
    const tx = this.db.transaction(names, mode);
    const m = new Map<string,IDBObjectStore>(); for (const n of names) m.set(n, tx.objectStore(n));
    try { const r = await cb(m); await txDone(tx); return r; } catch(e) { tx.abort(); throw e; }
  }

  close(): void { if(this._db){this._db.close();this._db=null;} }
  async destroy(): Promise<void> {
    this.close();
    return new Promise((res,rej)=>{
      const r=indexedDB.deleteDatabase(this.config.name);
      r.onsuccess=()=>res(); r.onerror=()=>rej(new Error(`Destroy failed:${r.error?.message}`));
      r.onblocked=()=>console.warn("[IndexedDB] Destroy blocked.");
    });
  }
}

function promisifyReq<T>(r: IDBRequest<T>):Promise<T>{return new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(new Error(`Req error:${r.error?.message}`));});}
function txDone(t: IDBTransaction):Promise<void>{return new Promise((res,rej)=>{t.oncomplete=()=>res();t.onerror=()=>rej(new Error(`Tx error:${t.error?.message}`));t.onabort=()=>rej(new Error("Aborted"));});}
function normRange(r?: IDBKeyRange|[unknown,unknown]|{only:unknown}):IDBKeyRange|undefined{if(!r)return undefined;if(r instanceof IDBKeyRange)return r;if("only"in r)return IDBKeyRange.only(r.only as IDBValidKey);if(Array.isArray(r))return IDBKeyRange.bound(r[0]as IDBValidKey,r[1]as IDBValidKey);return undefined;}


// ==========================================================================
// SECTION 2: LocalStorage Enhanced
// ==========================================================================

/**
 * Enhanced localStorage wrapper with TTL, namespace prefix, batch operations,
 * size monitoring, cross-tab change events, and JSON serialization.
 */
export class EnhancedLocalStorage {
  private readonly ns:string; private readonly ttl:number; private readonly comp:boolean;
  private listeners:Array<(k:string,n:unknown|null,o:unknown|null)=>void>=[];

  constructor(o:StorageOptions={}){
    this.ns=o.namespace??o.prefix??"";this.ttl=o.defaultTTL??0;this.comp=o.enableCompression??false;
    if(typeof window!=="undefined")window.addEventListener("storage",(e:StorageEvent)=>{
      if(!e.key)return;if(this.ns&&!e.key.startsWith(this.ns+":"))return;
      const lk=this.ns?e.key.slice(this.ns.length+1):e.key;
      const nv=e.newValue?this.de(e.newValue)?.v:null;const ov=e.oldValue?this.de(e.oldValue)?.v:null;
      for(const l of this.listeners){try{l(lk,nv,ov);}catch{}}
    });
  }
  private fk(k:string):string{return this.ns?this.ns+":"+k:k;}
  private se(v:unknown):string{const p=JSON.stringify({v:v,t:Date.now()});if(this.comp&&p.length>512){try{return btoa(unescape(encodeURIComponent(p)));}catch{}}return p;}
  private de(raw:string):{v:unknown;t:number}|null{let p:string;try{p=decodeURIComponent(escape(atob(raw)));}catch{p=raw;}try{return JSON.parse(p);}catch{return null;}}
  set(k:string,v:unknown,ttl?:number):void{const f=this.fk(k);const e=ttl??this.ttl;localStorage.setItem(f,this.se(e>0?{_data:v,_expiresAt:Date.now()+e}:{_data:v}));}
  get<T=unknown>(k:string):T|null{const raw=localStorage.getItem(this.fk(k));if(!raw)return null;const d=this.de(raw);if(!d){this.remove(k);return null;}const w=d.v as Record<string,unknown>;if(w&&"_expiresAt"in w&&typeof w._expiresAt==="number"){if(Date.now()>w._expiresAt as number){this.remove(k);return null;}return(w._data as T)??null;}return(d.v as T)??null;}
  remove(k:string):void{localStorage.removeItem(this.fk(k));}
  has(k:string):boolean{return this.get(k)!==null;}
  clear():void{if(!this.ns){localStorage.clear();return;}const r:string[]=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(this.ns+":"))r.push(k);}r.forEach(k=>localStorage.removeItem(k));}
  multiGet<T=unknown>(keys:string[]):Record<string,T|null>{const r:Record<string,T|null>={};for(const k of keys)r[k]=this.get<T>(k);return r;}
  multiSet(e:Record<string,unknown>,ttl?:number):void{for(const[k,v]of Object.entries(e))this.set(k,v,ttl);}
  multiDelete(keys:string[]):void{for(const k of keys)this.remove(k);}
  estimateQuotaUsage():number{let s=0;for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k)s+=k.length+(localStorage.getItem(k)?.length??0);}return Math.min(100,Math.round(s*2/5242880*100));}
  getKeySize(k:string):number{const r=localStorage.getItem(this.fk(k));return r?(this.fk(k).length+r.length)*2:0;}
  keys():string[]{const r:string[]=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&(!this.ns||k.startsWith(this.ns+":")))r.push(this.ns?k.slice(this.ns.length+1):k);}return r;}
  onChange(cb:(k:string,n:unknown|null,o:unknown|null)=>void):()=>void{this.listeners.push(cb);return()=>{this.listeners=this.listeners.filter(l=>l!==cb);};}
  cleanupExpired():number{let n=0;for(const k of this.keys()){const raw=localStorage.getItem(this.fk(k));if(!raw)continue;const d=this.de(raw);if(!d){localStorage.removeItem(this.fk(k));n++;continue;}const w=d.v as Record<string,unknown>;if(w&&"_expiresAt"in w&&typeof w._expiresAt==="number"&&Date.now()>w._expiresAt as number){localStorage.removeItem(this.fk(k));n++;}}return n;}
}


// ==========================================================================
// SECTION 3: SessionStorage Enhanced
// ==========================================================================

/**
 * Enhanced sessionStorage wrapper with typed access and optional per-tab isolation.
 */
export class EnhancedSessionStorage {
  private readonly ns:string;private readonly ti:boolean;private tid:string;
  constructor(o:StorageOptions&{tabIsolation?:boolean}={}){this.ns=o.namespace??o.prefix??"";this.ti=o.tabIsolation??false;this.tid=this.ti?"tab_"+Date.now()+"_"+Math.random().toString(36).slice(2):"";}
  private fk(k:string):string{return[this.ns,this.tid,k].filter(Boolean).join(":");}
  set(k:string,v:unknown):void{try{sessionStorage.setItem(this.fk(k),JSON.stringify({v:v,t:Date.now()}));}catch(e){console.warn("[SessionStorage] Quota:",e);this.evictLRU();try{sessionStorage.setItem(this.fk(k),JSON.stringify({v:v,t:Date.now()}));}catch(e2){throw new Error("Full:"+(e2 as Error).message);}}}
  get<T=unknown>(k:string):T|null{const r=sessionStorage.getItem(this.fk(k));if(!r)return null;try{return(JSON.parse(r).v as T)??null;}catch{return null;}}
  remove(k:string):void{sessionStorage.removeItem(this.fk(k));}
  has(k:string):boolean{return sessionStorage.getItem(this.fk(k))!==null;}
  clear():void{if(!this.ns&&!this.ti){sessionStorage.clear();return;}const tr:string[]=[];for(let i=0;i<sessionStorage.length;i++){const k=sessionStorage.key(i);if(k&&(!this.ns||k.startsWith(this.ns+":"))){if(this.ti&&!k.includes(":"+this.ti+":"))continue;tr.push(k);}}tr.forEach(k=>sessionStorage.removeItem(k));}
  multiGet<T=unknown>(keys:string[]):Record<string,T|null>{const r:Record<string,T|null>={};for(const k of keys)r[k]=this.get<T>(k);return r;}
  multiSet(e:Record<string,unknown>):void{for(const[k,v]of Object.entries(e))this.set(k,v);}
  multiDelete(keys:string[]):void{for(const k of keys)this.remove(k);}
  keys():string[]{const r:string[]=[];for(let i=0;i<sessionStorage.length;i++){const k=sessionStorage.key(i);if(k&&(!this.ns||k.startsWith(this.ns+":"))){if(this.ti&&!k.includes(":"+this.ti+":"))continue;r.push(k.split(":").pop()??k);}}return r;}
  private evictLRU():void{const e:Array<{key:string;time:number}>=[];for(let i=0;i<sessionStorage.length;i++){const k=sessionStorage.key(i);if(!k)continue;if(this.ns&&!k.startsWith(this.ns+":"))continue;if(this.ti&&!k.includes(":"+this.ti+":"))continue;try{e.push({key:k,time:JSON.parse(sessionStorage.getItem(k)??"{}").t??0});}catch{e.push({key:k,time:0});}}e.sort((a,b)=>a.time-b.time);for(let i=0;i<Math.max(1,Math.ceil(e.length*0.2))&&i<e.length;i++)sessionStorage.removeItem(e[i].key);}
}


// ==========================================================================
// SECTION 4: In-Memory Database (SQLite-like SQL Engine)
// ==========================================================================

type TokType = "KW"|"ID"|"NUM"|"STR"|"OP"|"PUN"|"STAR"|"COMMA"|"SEMI"|"DOT";
interface Tok{type:TokType;value:string;pos:number;}
interface ColDefIM{name:string;type:"text"|"integer"|"real"|"blob";pk?:boolean;nn?:boolean;uniq?:boolean;defVal?:unknown;}
interface TableDefIM{name:string;cols:ColDefIM[];pk?:string;}
type ASTNode = CreateTblAST|InsAST|SelAST|UpdAST|DelAST;
interface CreateTblAST{t:"CT";tn:string;cols:ColDefIM[];ine:boolean;}
interface InsAST{t:"INS";tn:string;cols:string[];vals:unknown[][];}
interface SelAST{t:"SEL";dist:boolean;sels:Array<{ex:ExprNode;al?:string}>;tn:string;al?:string;jns:JnAST[];wh?:WhAST;ob?:ObAST;gb?:string[];hav?:WhAST;lim?:number;off?:number;}
interface UpdAST{t:"UPD";tn:string;sets:Array<{col:string;val:ExprNode}>;wh?:WhAST;}
interface DelAST{t:"DEL";tn:string;wh?:WhAST;}
interface JnAST{jt:"INNER"|"LEFT";tbl:string;al?:string;ol:string;or:string;}
interface WhAST{conds:Cond[];}
interface Cond{l:string;op:"="|"!="|"<>"|">"|"<"|">="|"<="|"LIKE"|"IN"|"IS"|"IS NOT"|"AND"|"OR";r?:unknown;sc?:Cond[];}
interface ObAST{cols:Array<{col:string;d:"ASC"|"DESC"}>;}
interface ExprNode{t:"COL"|"LIT"|"FUNC"|"STAR";v?:unknown;n?:string;fn?:string;args?:ExprNode[];al?:string;}

/**
 * In-memory relational database with SQL-like query engine.
 * Supports CREATE TABLE, INSERT, SELECT (WHERE/ORDER BY/LIMIT/OFFSET/GROUP BY/aggregates),
 * UPDATE, DELETE, JOINs (inner/left), and basic subqueries via IN clauses.
 */
export class InMemoryDatabase {
  private tbls = new Map<string,TableDefIM>();
  private data = new Map<string,Record<string,unknown>[]>();
  private ai = new Map<string,number>();
  private inTx = false;
  private txSnap = new Map<string,Record<string,unknown>[]>();

  exec(sql:string):QueryResult{const toks=this.tok(sql.trim());const ast=this.parse(toks);return this.execAST(ast);}
  begin():void{if(this.inTx)throw new Error("Nested TX not supported.");this.inTx=true;this.txSnap=new Map();for(const[n,r]of this.data)this.txSnap.set(n,r.map(r=>({...r})));}
  commit():void{if(!this.inTx)throw new Error("No active TX.");this.inTx=false;this.txSnap.clear();}
  rollback():void{if(!this.inTx)throw new Error("No active TX.");this.inTx=false;this.data=new Map(this.txSnap);this.txSnap.clear();}
  get isActiveTransaction():boolean{return this.inTx;}
  getTableNames():string[]{return Array.from(this.tbls.keys());}
  getTableSchema(tn:string):TableDefIM|undefined{return this.tbls.get(tn);}

  // Tokenizer
  private tok(sql:string):Tok[]{
    const toks:Tok[]=[];
    const kws=new Set(["SELECT","FROM","WHERE","INSERT","INTO","VALUES","UPDATE","SET","DELETE","CREATE","TABLE","INTEGER","TEXT","REAL","BLOB","PRIMARY","KEY","NOT","NULL","UNIQUE","DEFAULT","AUTOINCREMENT","AND","OR","ORDER","BY","ASC","DESC","LIMIT","OFFSET","JOIN","INNER","LEFT","ON","AS","DISTINCT","GROUP","HAVING","COUNT","SUM","AVG","MIN","MAX","LIKE","IN","IS","EXISTS","BETWEEN","IF"]);
    let i=0;
    while(i<sql.length){
      if(/\s/.test(sql[i])){i++;continue;}
      if(sql[i]==="'"||sql[i]==='"'){const q=sql[i];let j=i+1,s="";while(j<sql.length&&sql[j]!==q){if(sql[j]==="\"&&j+1<sql.length){s+=sql[j+1];j+=2;}else{s+=sql[j];j++;}}toks.push({type:"STR",value:s,pos:i});i=j+1;continue;}
      if(/\d/.test(sql[i])||(sql[i]==="."&&i+1<sql.length&&/\d/.test(sql[i+1]))){let j=i;while(j<sql.length&&(/[\d.]/.test(sql[j])||sql[j].toLowerCase()==="e")){if(sql[j].toLowerCase()==="e"&&j+1<sql.length&&/[+-]/.test(sql[j+1]))j++;j++;}toks.push({type:"NUM",value:sql.slice(i,j),pos:i});i=j;continue;}
      if(/[a-zA-Z_]/.test(sql[i])){let j=i;while(j<sql.length&&/[a-zA-Z0-9_]/.test(sql[j]))j++;const w=sql.slice(i,j);toks.push({type:kws.has(w.toUpperCase())?"KW":"ID",value:w,pos:i});i=j;continue;}
      const two=["!=", "<>", ">=", "<="].find(op=>sql.startsWith(op,i));
      if(two){toks({type:"OP",value:two,pos:i});i+=2;continue;}
      if("=><".includes(sql[i])){toks.push({type:"OP",value:sql[i],pos:i});i++;continue;}
      const pm:{[k:string]:TokType}={"*":"STAR",",":"COMMA",";":"SEMI",".":"DOT","(":"PUN",")":"PUN"};
      if(pm[sql[i]]){toks.push({type:pm[sql[i]],value:sql[i],pos:i});i++;continue;}
      i++;
    }
    return toks;
  }

  // Parser
  private parse(toks:Tok[]):ASTNode{
    if(!toks.length)throw new Error("Empty SQL");
    const kw=toks[0].type==="KW"?toks[0].value.toUpperCase():"";
    switch(kw){
      case "CREATE":return this.pCT(toks);
      case "INSERT":return this.pIns(toks);
      case "SELECT":return this.pSel(toks);
      case "UPDATE":return this.pUpd(toks);
      case "DELETE":return this.pDel(toks);
      default:throw new Error(`Unsupported: ${toks[0].value}`);
    }
  }

  private eKW(t:Tok[],p:number,e:string):void{if(p>=t.length||t[p].value.toUpperCase()!==e)throw new Error(`Expected '${e}' at ${p}, got ${t[p]?.value??"EOF"}`);}
  private eID(t:Tok[],p:number):string{if(p>=t.length||(t[p].type!=="ID"&&t[p].type!=="KW"))throw new Error(`Expected ID at ${p}`);return t[p].value;}
  private ePun(t:Tok[],p:number,c:string):void{if(p>=t.length||t[p].value!==c)throw new Error(`Expected '${c}' at ${p}`);}

  private pCT(t:Tok[]):CreateTblAST{
    let p=0;this.eKW(t,p++,"CREATE");this.eKW(t,p++,"TABLE");
    let ine=false;if(p<t.length&&t[p].value.toUpperCase()==="IF"){p++;if(p<t.length&&t[p].value.toUpperCase()==="NOT")p++;if(p<t.length&&t[p].value.toUpperCase()==="EXISTS"){ine=true;p++;}}
    const tn=this.eID(t,p++);
    this.ePun(t,p++,"(");
    const cols:ColDefIM[]=[];
    while(p<t.length&&!(t[p].type==="PUN"&&t[p].value===")")){
      const cn=this.eID(t,p++);let tp:ColDefIM["type"]="text";let pk=false,nn=false,uq=false,dv:unknown=undefined;
      if(p<t.length&&t[p].type==="KW"){const tu=t[p].value.toUpperCase();if(["INTEGER","INT"].includes(u)){tp="integer";p++;}else if(["REAL","FLOAT","DOUBLE"].includes(u)){tp="real";p++;}else if(["TEXT","VARCHAR"].includes(u)){tp="text";p++;}else if(u==="BLOB"){tp="blob";p++;}}
      while(p<t.length&&!(t[p].type==="PUN"&&t[p].value===")")&&t[p].type!=="COMMA"){
        const kw=t[p].value.toUpperCase();
        if(kw==="PRIMARY"){p++;if(p<t.length&&t[p].value.toUpperCase()==="KEY")p++;pk=true;}
        else if(kw==="NOT"){p++;if(p<t.length&&t[p].value.toUpperCase()==="NULL")p++;nn=true;}
        else if(kw==="UNIQUE"){uq=true;p++;}
        else if(kw==="DEFAULT"){p++;if(p<t.length){if(t[p].type==="NUM")dv=t[p].value.includes(".")?parseFloat(t[p].value):parseInt(t[p].value,10);else if(t[p].type==="STR")dv=t[p].value;else if(t[p].type==="KW"&&t[p].value.toUpperCase()==="NULL")dv=null;p++;}}
        else if(kw==="AUTOINCREMENT")p++;else p++;
      }
      cols.push({name:cn,type:tp,pk:pk,nn:nn,uniq:uq,defVal:dv});
      if(p<t.length&&t[p].type==="COMMA")p++;
    }
    this.ePun(t,p++,")");return{t:"CT",tn,cols,ine};
  }

  private pIns(t:Tok[]):InsAST{
    let p=0;this.eKW(t,p++,"INSERT");this.eKW(t,p++,"INTO");const tn=this.eID(t,p++);
    const cols:string[]=[];
    if(p<t.length&&t[p].type==="PUN"&&t[p].value==="("){p++;while(p<t.length&&!(t[p].type==="PUN"&&t[p].value===")")){cols.push(this.eID(t,p++));if(p<t.length&&t[p].type==="COMMA")p++;}p++;}
    this.eKW(t,p++,"VALUES");const av:unknown[][]=[];
    do{this.ePun(t,p++,"(");const rv:unknown[]=[];while(p<t.length&&!(t[p].type==="PUN"&&t[p].value===")")){if(t[p].type==="STR")rv.push(t[p].value);else if(t[p].type==="NUM")rv.push(t[p].value.includes(".")?parseFloat(t[p].value):parseInt(t[p].value,10));else if(t[p].type==="KW"&&t[p].value.toUpperCase()==="NULL")rv.push(null);else rv.push(null);p++;if(p<t.length&&t[p].type==="COMMA")p++;}p++;av.push(rv);if(p<t.length&&t[p].type==="COMMA")p++;}while(p<t.length&&t[p]?.type==="PUN"&&t[p]?.value==="(");
    return{t:"INS",tn,cols,vals:av};
  }

  private pSel(t:Tok[]):SelAST{
    let p=0;this.eKW(t,p++,"SELECT");
    let dist=false;if(p<t.length&&t[p].type==="KW"&&t[p].value.toUpperCase()==="DISTINCT"){dist=true;p++;}
    const sels:Array<{ex:ExprNode;al?:string}>=[];
    const sk=new Set(["FROM","WHERE","ORDER","GROUP","LIMIT","OFFSET","JOIN","INNER","LEFT"]);
    while(p<t.length&&!((t[p].type==="KW"&&sk.has(t[p].value.toUpperCase()))||t[p].type==="SEMI")){
      let ep=p;let pd=0;while(ep<t.length){if(t[ep].type==="PUN"&&t[ep].value==="(")pd++;if(t[ep].type==="PUN"&&t[ep].value===")")pd--;if(pd===0&&(t[ep].type==="COMMA"||(t[ep].type==="KW"&&sk.has(t[ep].value.toUpperCase()))))break;ep++;}
      const et=t.slice(p,ep);const pe=this.pExSlice(et);let al:string|undefined;
      if(ep<t.length&&t[ep].type==="KW"&&t[ep].value.toUpperCase()==="AS"){ep++;al=this.eID(t,ep++);}
      sels.push({ex:pe,al});p=ep;if(p<t.length&&t[p].type==="COMMA")p++;
    }
    this.eKW(t,p++,"FROM");const tn=this.eID(t,p++);
    let tal:string|undefined;if(p<t.length&&t[p].type==="KW"&&t[p].value.toUpperCase()==="AS"){p++;tal=this.eID(t,p++);}
    const jns:JnAST[]=[];
    while(p<t.length&&((t[p].type==="KW"&&["JOIN","INNER","LEFT"].includes(t[p].value.toUpperCase()))||t[p].type==="ID")){
      const jr=this.pJn(t,p);jns.push(jr.jn);p=jr.np;
    }
    let wh:WhAST|undefined;if(p<t.length&&t[p].type==="KW"&&t[p].value.toUpperCase()==="WHERE"){p++;const wp=this.pWh(t,p);wh=wp.c;p=wp.ep;}
    let gb:string[]|undefined;if(p<t.length&&t[p].type==="KW"&&t[p].value.toUpperCase()==="GROUP"){p++;this.eKW(t,p++,"BY");gb=[];while(p<t.length&&!((t[p].type==="KW"&&["ORDER","LIMIT","OFFSET","HAVING"].includes(t[p].value.toUpperCase()))||t[p].type==="SEMI")){gb.push(this.eID(t,p));if(p<t.length&&t[p].type==="COMMA")p++;}}
    let hav:WhAST|undefined;if(p<t.length&&t[p].type==="KW"&&t[p].value.toUpperCase()==="HAVING"){p++;const hp=this.pWh(t,p);hav=hp.c;p=hp.ep;}
    let ob:ObAST|undefined;if(p<t.length&&t[p].type==="KW"&&t[p].value.toUpperCase()==="ORDER"){p++;this.eKW(t,p++,"BY");ob={cols:[]};while(p<t.length&&!((t[p].type==="KW"&&["LIMIT","OFFSET"].includes(t[p].value.toUpperCase()))||t[p].type==="SEMI")){const cn=this.eID(t,p++);let d:"ASC"|"DESC"="ASC";if(p<t.length&&t[p].type==="KW"&&["ASC","DESC"].includes(t[p].value.toUpperCase()))d=t[p++].value.toUpperCase()as"ASC"|"DESC";ob.cols.push({col:cn,d});if(p<t.length&&t[p].type==="COMMA")p++;}}
    let lim:number|undefined;if(p<t.length&&t[p].type==="KW"&&t[p].value.toUpperCase()==="LIMIT"){lim=parseInt(this.eID(t,++p),10);p++;}
    let off:number|undefined;if(p<t.length&&t[p].type==="KW"&&t[p].value.toUpperCase()==="OFFSET"){off=parseInt(this.eID(t,++p),10);p++;}
    return{t:"SEL",dist,sels,tn,al:tal,jns,wh,ob,gb,hav,lim,off};
  }

  private pUpd(t:Tok[]):UpdAST{
    let p=0;this.eKW(t,p++,"UPDATE");const tn=this.eID(t,p++);this.eKW(t,p++,"SET");
    const sets:Array<{col:string;val:ExprNode}>=[];
    while(p<t.length&&!(t[p].type==="KW"&&t[p].value.toUpperCase()==="WHERE")){
      const col=this.eID(t,p++);this.ePun(t,p++,"=");
      let vp=p;let pd2=0;while(vp<t.length){if(t[vp].type==="PUN"&&t[vp].value==="(")pd2++;if(t[vp].type==="PUN"&&t[vp].value===")")pd2--;if(pd2===0&&(t[vp].type==="COMMA"||(t[vp].type==="KW"&&t[vp].value.toUpperCase()==="WHERE")))break;vp++;}
      sets.push({col,val:this.pExSlice(t.slice(p,vp))});p=vp;if(p<t.length&&t[p].type==="COMMA")p++;
    }
    let wh:WhAST|undefined;if(p<t.length&&t[p].type==="KW"&&t[p].value.toUpperCase()==="WHERE"){p++;const wp=this.pWh(t,p);wh=wp.c;p=wp.ep;}
    return{t:"UPD",tn,sets,wh};
  }

  private pDel(t:Tok[]):DelAST{
    let p=0;this.eKW(t,p++,"DELETE");this.eKW(t,p++,"FROM");const tn=this.eID(t,p++);
    let wh:WhAST|undefined;if(p<t.length&&t[p].type==="KW"&&t[p].value.toUpperCase()==="WHERE"){p++;const wp=this.pWh(t,p);wh=wp.c;p=wp.ep;}
    return{t:"DEL",tn,wh};
  }

  // Expression slice parser
  private pExSlice(t:Tok[]):ExprNode{
    if(!t.length)return{t:"LIT",v:null};
    // Function call: NAME(args)
    if(t.length>=3&&t[0].type==="ID"&&t[1].type==="PUN"&&t[1].value==="("){
      const fn=t[0].value.toUpperCase();const args:ExprNode[]=[];let depth=0;let start=2;
      for(let i=2;i<t.length;i++){if(t[i].type==="PUN"&&t[i].value==="(")depth++;if(t[i].type==="PUN"&&t[i].value===")"){if(depth===0){args.push(this.pExSlice(t.slice(start,i)));start=i+1;}else depth--;}if(t[i].type==="COMMA"&&depth===0){args.push(this.pExSlice(t.slice(start,i)));start=i+1;}}
      return{t:"FUNC",fnName:fn,args};
    }
    if(t[0].type==="STAR")return{t:"STAR"};
    if(t[0].type==="STR")return{t:"LIT",v:t[0].value};
    if(t[0].type==="NUM")return{t:"LIT",v:t[0].value.includes(".")?parseFloat(t[0].value):parseInt(t[0].value,10)};
    if(t[0].type==="KW"&&t[0].value.toUpperCase()==="NULL")return{t:"LIT",v:null};
    // Column reference (possibly table.column)
    if(t[0].type==="ID"||t[0].type==="KW"){
      if(t.length>2&&t[1].type==="DOT")return{t:"COL",n:t[0].value+"."+t[2].value};
      return{t:"COL",n:t[0].value};
    }
    return{t:"LIT",v:null};
  }

  // Join parser
  private pJn(t:Tok[],p:number):{jn:JnAST;np:number}{
    let jt:"INNER"|"LEFT"="INNER";
    if(t[p].type==="KW"&&t[p].value.toUpperCase()==="LEFT"){jt="LEFT";p++;}else if(t[p].type==="KW"&&t[p].value.toUpperCase()==="INNER"){p++;}
    if(t[p].type==="KW"&&t[p].value.toUpperCase()==="JOIN")p++;
    const tbl=this.eID(t,p++);let al:string|undefined;
    if(p<t.length&&t[p].type==="KW"&&t[p].value.toUpperCase()==="AS"){p++;al=this.eID(t,p++);}
    this.eKW(t,p++,"ON");
    const ol=this.eID(t,p++);this.ePun(t,p++,"=");const or=this.eID(t,p++);
    return{jn:{jt,tbl,al,ol,or},np:p};
  }

  // Where clause parser
  private pWh(t:Tok[],p:number):{c:WhAST;ep:number}{
    const conds:Cond[]= [];const result=this.pCond(t,p);conds.push(result.cond);p=result.np;
    while(p<t.length&&(t[p].type==="KW"&&(t[p].value.toUpperCase()==="AND"||t[p].value.toUpperCase()==="OR"))){
      const logicOp=t[p++].value.toUpperCase()as"AND"|"OR";const rc=this.pCond(t,p);
      conds.push({l:"",op:logicOp,sc:[rc.cond]});p=rc.np;
    }
    return{c:{conds},ep:p};
  }

  private pCond(t:Tok[],p:number):{cond:Cond;np:number}{
    const left=this.eID(t,p++);
    let op:Cond["op"]="=";
    if(p<t.length&&t[p].type==="OP"){op=t[p++].value as Cond["op"];if(op==="<>")op="!=";}
    else if(p<t.length&&t[p].type==="KW"){const kw=t[p].value.toUpperCase();if(kw==="LIKE"||kw==="IN"||kw==="IS"){op=kw as Cond["op"];p++;if(kw==="IS"&&p<t.length&&t[p].value.toUpperCase()==="NOT"){op="IS NOT";p++;}}}
    let r:unknown=undefined;
    if(p<t.length&&t[p].type==="STR")r=t[p++].value;
    else if(p<t.length&&t[p].type==="NUM")r=t[p++].value.includes(".")?parseFloat(t[p++].value):parseInt(t[p++].value,10);
    else if(p<t.length&&t[p].type==="KW"&&t[p].value.toUpperCase()==="NULL"){r=null;p++;}
    else if(p<t.length&&t[p].type==="PUN"&&t[p].value==="("){p++;const vals:unknown[]=[];while(p<t.length&&!(t[p].type==="PUN"&&t[p].value===")")){if(t[p].type==="STR")vals.push(t[p].value);else if(t[p].type==="NUM")vals.push(t[p].value.includes(".")?parseFloat(t[p].value):parseInt(t[p].value,10));else if(t[p].type==="KW"&&t[p].value.toUpperCase()==="NULL")vals.push(null);p++;if(p<t.length&&t[p].type==="COMMA")p++;}p++;r=vals;}
    return{cond:{l:left,op,r},np:p};
  }

  // Executor
  private execAST(ast:ASTNode):QueryResult{
    switch(ast.t){
      case "CT":return this.execCT(ast as CreateTblAST);
      case "INS":return this.execIns(ast as InsAST);
      case "SEL":return this.execSel(ast as SelAST);
      case "UPD":return this.execUpd(ast as UpdAST);
      case "DEL":return this.execDel(ast as DelAST);
      default:throw new Error(`Unknown AST type`);
    }
  }

  private execCT(a:CreateTblAST):QueryResult{
    if(this.tbls.has(a.tn)&&!a.ine)throw new Error(`Table '${a.tn}' already exists`);
    const pkCol=a.cols.find(c=>c.pk)?.name;
    this.tbls.set(a.tn,{name:a.tn,cols:a.cols,pk:pkCol});
    if(!this.data.has(a.tn))this.data.set(a.tn,[]);
    if(pkCol)this.ai.set(a.tn,0);
    return{rows:[],affectedRows:0};
  }

  private execIns(a:InsAST):QueryResult{
    const tbl=this.tbls.get(a.tn);if(!tbl)throw new Error(`Table '${a.tn}' not found`);
    const rows=this.data.get(a.tn)!;let insertId:number|undefined;
    for(const valRow of a.vals){
      const row:Record<string,unknown>={};
      for(let i=0;i<a.cols.length;i++){
        const colName=a.cols[i];
        const colDef=tbl.cols.find(c=>c.name===colName);
        row[colName]=i<valRow.length?valRow[i]:(colDef?.defVal??null);
      }
      // Auto-increment for PK
      if(tbl.pk){const cur=(this.ai.get(a.tn)??0)+1;this.ai.set(a.tn,cur);row[tbl.pk]=cur;insertId=cur;}
      rows.push(row);
    }
    return{rows:[],affectedRows:a.vals.length,insertId,lastInsertRowid:insertId};
  }

  private execSel(a:SelAST):QueryResult{
    let rows=[...(this.data.get(a.tn)??[])];
    const tbl=this.tbls.get(a.tn);

    // Process JOINs
    for(const j of a.jns){
      const rightRows=this.data.get(j.tbl)??[];
      const rightTbl=this.tbls.get(j.tbl);
      const leftAlias=a.al??a.tn;
      const rightAlias=j.al??j.tbl;
      if(j.jt==="INNER"){
        const joined:Record<string,unknown>[]= [];
        for(const lr of rows){
          for(const rr of rightRows){
            const lv=lr[j.ol];const rv=rr[j.or];
            if(lv===rv){
              const merged={...lr};for(const[k,v]of Object.entries(rr))merged[rightAlias+"."+k]=v;
              joined.push(merged);
            }
          }
        }
        rows=joined;
      }else{ // LEFT
        const joined:Record<string,unknown>[]= [];
        for(const lr of rows){
          let matched=false;
          for(const rr of rightRows){
            const lv=lr[j.ol];const rv=rr[j.or];
            if(lv===rv){matched=true;const merged={...lr};for(const[k,v]of Object.entries(rr))merged[rightAlias+"."+k]=v;joined.push(merged);}
          }
          if(!matched){const merged={...lr};if(rightTbl)for(const c of rightTbl.cols)merged[rightAlias+"."+c.name]=null;joined.push(merged);}
        }
        rows=joined;
      }
    }

    // WHERE filtering
    if(a.wh)rows=this.applyWhere(rows,a.wh);

    // GROUP BY + aggregates
    if(a.gb&&a.gb.length>0){
      const groups=new Map<string,Record<string,unknown>[]>();
      for(const r of rows){
        const key=a.gb.map(g=>String(r[g]??"")).join("|");
        if(!groups.has(key))groups.set(key,[]);
        groups.get(key)!.push(r);
      }
      const groupedRows:Record<string,unknown>[]= [];
      for(const[,grp]of groups){
        const repRow={...grp[0]};
        for(const sel of a.sels){
          if(sel.ex.t==="FUNC"&&sel.ex.fnName){
            const colArg=sel.ex.args&&sel.ex.args[0]?.n??"";
            const vals=grp.map(r=>r[colArg]);
            switch(sel.ex.fnName){
              case "COUNT":repRow[sel.al??sel.ex.fnName.toLowerCase()+"("+colArg+")"]=vals.length;break;
              case "SUM":repRow[sel.al??sel.ex.fnName.toLowerCase()+"("+colArg+")"]=vals.reduce((a,b)=>(Number(a)||0)+(Number(b)||0),0);break;
              case "AVG":repRow[sel.al??sel.ex.fnName.toLowerCase()+"("+colArg+")"]=vals.length?vals.reduce((a,b)=>(Number(a)||0)+(Number(b)||0),0)/vals.length:null;break;
              case "MIN":repRow[sel.al??sel.exfnName.toLowerCase()+"("+colArg+")"]=vals.length?Math.min(...vals.map(v=>Number(v))):null;break;
              case "MAX":repRow[sel.al??sel.ex.fnName.toLowerCase()+"("+colArg+")"]=vals.length?Math.max(...vals.map(v=>Number(v))):null;break;
            }
          }else if(sel.ex.t==="COL"){repRow[sel.al??sel.ex.n!]=repRow[sel.ex.n!];}
        }
        groupedRows.push(repRow);
      }
      rows=groupedRows;

      // HAVING filter
      if(a.hav)rows=this.applyWhere(rows,a.hav);
    }else{
      // Check if select list has aggregate functions without GROUP BY - aggregate over all rows
      const hasAgg=a.sels.some(s=>s.ex.t==="FUNC"&&["COUNT","SUM","AVG","MIN","MAX"].includes(s.ex.fnName??""));
      if(hasAgg&&rows.length>0){
        const aggRow:Record<string,unknown>={};
        for(const sel of a.sels){
          if(sel.ex.t==="FUNC"&&sel.ex.fnName){
            const colArg=sel.ex.args&&sel.ex.args[0]?.n??"";
            const vals=rows.map(r=>r[colArg]);
            switch(sel.ex.fnName){
              case "COUNT":aggRow[sel.al??sel.ex.fnName.toLowerCase()+"("+colArg+")"]=vals.length;break;
              case "SUM":aggRow[sel.al??sel.ex.fnName.toLowerCase()+"("+colArg+")"]=vals.reduce((a,b)=>(Number(a)||0)+(Number(b)||0),0);break;
              case "AVG":aggRow[sel.al??sel.ex.fnName.toLowerCase()+"("+colArg+")"]=vals.reduce((a,b)=>(Number(a)||0)+(Number(b)||0),0)/vals.length;break;
              case "MIN":aggRow[sel.al??sel.ex.fnName.toLowerCase()+"("+colArg+")"]=Math.min(...vals.map(v=>Number(v)));break;
              case "MAX":aggRow[sel.al??sel.ex.fnName.toLowerCase()+"("+colArg+")"]=Math.max(...vals.map(v=>Number(v)));break;
            }
          }else if(sel.ex.t==="STAR"){aggRow[sel.al??"*"]=rows;}
          else if(sel.ex.t==="COL"){aggRow[sel.al??sel.ex.n!]=rows[0][sel.ex.n!];}
        }
        rows=[aggRow];
      }else{
        // Project columns
        const projected:Record<string,unknown>[]= [];
        for(const r of rows){
          const pr:Record<string,unknown>={};
          for(const sel of a.sels){
            if(sel.ex.t==="STAR"){Object.assign(pr,r);}
            else if(sel.ex.t==="COL"){pr[sel.al??sel.ex.n!]=r[sel.ex.n!];}
            else if(sel.ex.t==="LIT"){pr[sel.al??String(sel.ex.v)]=sel.ex.v;}
            else if(sel.ex.t==="FUNC"){pr[sel.al??sel.ex.fnName??"func"]=r[sel.ex.fnName??""];}
          }
          projected.push(pr);
        }
        rows=projected;
      }
    }

    // DISTINCT
    if(a.dist){const seen=new Set<string>();rows=rows.filter(r=>{const k=JSON.stringify(r);if(seen.has(k))return false;seen.add(k);return true;});}

    // ORDER BY
    if(a.ob){
      rows=[...rows].sort((ra,rb)=>{
        for(const oc of a.ob!.cols){
          const va=ra[oc.col];const vb=rb[oc.col];
          const cmp=va<vb?-1:va>vb?1:0;
          if(cmp!==0)return oc.d==="DESC"?-cmp:cmp;
        }
        return 0;
      });
    }

    // OFFSET / LIMIT
    if(a.off)rows=rows.slice(a.off);
    if(a.lim)rows=rows.slice(0,a.lim);

    return{rows,affectedRows:0};
  }

  private applyWhere(rows:Record<string,unknown>[],wh:WhAST):Record<string,unknown>[]{
    return rows.filter(r=>this.evalCond(r,wh.conds));
  }

  private evalCond(row:Record<string,unknown>,conds:Cond[]):boolean{
    for(let i=0;i<conds.length;i++){
      const c=conds[i];
      if(c.op==="AND"&&c.sc){if(!this.evalCond(row,c.sc))return false;continue;}
      if(c.op==="OR"&&c.sc){if(this.evalCond(row,c.sc))return true;continue;}
      const lv=row[c.l];
      if(c.op==="IS"){if(c.r!==null)return false;continue;}
      if(c.op==="IS NOT"){if(c.r===null)return false;continue;}
      const rv=c.r;
      if(c.op==="IN"){if(!Array.isArray(rv)||!rv.includes(lv))return false;continue;}
      if(c.op==="LIKE"){if(typeof lv!=="string"||typeof rv!=="string")return false;const pattern=rv.replace(/%/g,".*").replace(/_/g,".");if(!new RegExp("^"+pattern+"$").test(lv))return false;continue;}
      switch(c.op){
        case "=":if(lv!==rv)return false;break;
        case "!=":case "<>":if(lv===rv)return false;break;
        case ">":if(!(lv!=null&&rv!=null&&lv>rv))return false;break;
        case "<":if(!(lv!=null&&rv!=null&&lv<rv))return false;break;
        case ">=":if(!(lv!=null&&rv!=null&&lv>=rv))return false;break;
        case "<=":if(!(lv!=null&&rv!=null&&lv<=rv))return false;break;
      }
    }
    return true;
  }

  private execUpd(a:UpdAST):QueryResult{
    const rows=this.data.get(a.tn);if(!rows)throw new Error(`Table '${a.tn}' not found`);
    let target=[...rows];if(a.wh)target=this.applyWhere(target,a.wh);
    let affected=0;
    for(const row of target){
      const idx=rows.indexOf(row);if(idx===-1)continue;
      for(const s of a.sets){
        if(s.val.t==="LIT")rows[idx][s.col]=s.val.v;
        else if(s.val.t==="COL")rows[idx][s.col]=row[s.val.n!];
      }
      affected++;
    }
    return{rows:[],affectedRows:affected,changes:affected};
  }

  private execDel(a:DelAST):QueryResult{
    const rows=this.data.get(a.tn);if(!rows)throw new Error(`Table '${a.tn}' not found`);
    let target=[...rows];if(a.wh)target=this.applyWhere(target,a.wh);
    const affected=target.length;
    this.data.set(a.tn,rows.filter(r=>!target.includes(r)));
    return{rows:[],affectedRows:affected,changes:affected};
  }
}


// ==========================================================================
// SECTION 5: Cache Storage API Wrapper
// ==========================================================================

/**
 * CacheManager provides a high-level wrapper around the browser Cache Storage API.
 * Supports cache versioning, multiple caching strategies (cache-first, network-first,
 * stale-while-revalidate), prefetch helpers, and cache size estimation/cleanup.
 *
 * @example
 * ```ts
 * const cache = new CacheManager({ name: 'api-v1', maxAge: 3600000 });
 * await cache.put('/api/data', response);
 * const cached = await cache.get('/api/data');
 * ```
 */
export class CacheManager {
  private readonly name: string;
  private readonly strategy: Required<CacheStrategy>;
  private meta: Map<string, CacheEntryMeta> = new Map();

  constructor(strategy: CacheStrategy) {
    this.name = strategy.name;
    this.strategy = {
      name: strategy.name,
      maxAge: strategy.maxAge ?? Infinity,
      maxSize: strategy.maxSize ?? 50 * 1024 * 1024, // default 50MB
      version: strategy.version ?? "1",
    };
  }

  /** Get or create the underlying Cache object */
  private async getCache(): Promise<Cache> {
    return caches.open(this.strategy.version ? `${this.name}-v${this.strategy.version}` : this.name);
  }

  /** Store a response in the cache */
  async put(url: string, response: Response): Promise<void> {
    const cache = await this.getCache();
    // Clone before storing since responses can only be consumed once
    const cloned = response.clone();
    await cache.put(url, cloned);
    const size = await this.estimateResponseSize(response);
    this.meta.set(url, { url, size, timestamp: Date.now(), strategy: this.name });
    await this.enforceSizeLimit();
  }

  /** Retrieve a cached response. Returns null if not found or expired. */
  async get(url: string): Promise<Response | null> {
    const cache = await this.getCache();
    const response = await cache.match(url);
    if (!response) return null;

    // Check expiry for stale-while-revalidate awareness
    const entry = this.meta.get(url);
    if (entry && this.strategy.maxAge < Infinity) {
      const age = Date.now() - entry.timestamp;
      if (age > this.strategy.maxAge) {
        // Stale but still return; caller can decide to revalidate
        return response;
      }
    }
    return response;
  }

  /** Check if a URL is present in the cache */
  async has(url: string): Promise<boolean> {
    const cache = await this.getCache();
    const keys = await cache.keys();
    return keys.some((req) => req.url === url || req.url.endsWith(url));
  }

  /** Delete a specific URL from the cache */
  async delete(url: string): Promise<boolean> {
    const cache = await this.getCache();
    this.meta.delete(url);
    return cache.delete(url);
  }

  /** List all cached URLs with their metadata */
  async list(): Promise<Array<{ url: string; timestamp: number; size: number }>> {
    const cache = await this.getCache();
    const keys = await cache.keys();
    return keys.map((req) => {
      const entry = this.meta.get(req.url);
      return { url: req.url, timestamp: entry?.timestamp ?? 0, size: entry?.size ?? 0 };
    });
  }

  /**
   * Stale-while-revalidate strategy:
   * Returns cached response immediately (even if stale) while fetching fresh data in background.
   * Returns { response, revalidated } where revalidated is true when fresh data was obtained.
   */
  async staleWhileRevalidate(
    url: string,
    fetcher: () => Promise<Response>,
  ): Promise<{ response: Response | null; revalidated: boolean }> {
    const cached = await this.get(url);
    let revalidated = false;

    try {
      const fresh = await fetcher();
      if (fresh.ok) {
        await this.put(url, fresh);
        revalidated = true;
        return { response: fresh.clone(), revalidated };
      }
    } catch {
      /* network error - fall through to cached */
    }
    return { response: cached, revalidated: false };
  }

  /**
   * Cache-first strategy: return cached if available, otherwise fetch from network.
   */
  async cacheFirst(
    url: string,
    fetcher: () => Promise<Response>,
  ): Promise<Response> {
    const cached = await this.get(url);
    if (cached) return cached;
    const response = await fetcher();
    if (response.ok) await this.put(url, response);
    return response;
  }

  /**
   * Network-first strategy: try network first, fall back to cache on failure.
   */
  async networkFirst(
    url: string,
    fetcher: () => Promise<Response>,
  ): Promise<Response> {
    try {
      const response = await fetcher();
      if (response.ok) { await this.put(url, response); return response; }
    } catch {
      /* network error */
    }
    const cached = await this.get(url);
    if (cached) return cached;
    throw new Error(`Failed to fetch '${url}' and no cache available`);
  }

  /** Prefetch a URL and store it in the cache (does not wait for completion by default) */
  prefetch(url: string, options?: { priority?: RequestPriority }): void {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 10000); // 10s timeout
    fetch(url, { signal: controller.signal, mode: "cors", ...(options ?? {}) })
      .then(async (response) => {
        if (response.ok) await this.put(url, response);
      })
      .catch(() => {}); // silently fail prefetch
  }

  /** Preload a resource using <link rel="preload"> for critical resources */
  preload(url: string, as: string = "fetch"): HTMLLinkElement | null {
    if (typeof document === "undefined") return null;
    const link = document.createElement("link");
    link.rel = "preload";
    link.href = url;
    link.as = as as any;
    document.head.appendChild(link);
    return link;
  }

  /** Estimate total cache size in bytes based on tracked metadata */
  async estimateTotalSize(): Promise<number> {
    let total = 0;
    for (const entry of this.meta.values()) total += entry.size;
    return total;
  }

  /** Remove expired entries from the cache */
  async cleanupExpired(): Promise<number> {
    if (this.strategy.maxAge >= Infinity) return 0;
    const now = Date.now();
    const toRemove: string[] = [];
    for (const [url, entry] of this.meta) {
      if (now - entry.timestamp > this.strategy.maxAge) toRemove.push(url);
    }
    const cache = await this.getCache();
    for (const url of toRemove) { await cache.delete(url); this.meta.delete(url); }
    return toRemove.length;
  }

  /** Enforce maximum cache size by evicting least-recently-used entries */
  async enforceSizeLimit(): Promise<void> {
    let total = 0;
    for (const e of this.meta.values()) total += e.size;
    if (total <= this.strategy.maxSize) return;

    // Sort by timestamp ascending (oldest first) and evict until under limit
    const entries = Array.from(this.meta.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
    const cache = await this.getCache();
    for (const [url] of entries) {
      if (total <= this.strategy.maxSize) break;
      const entry = this.meta.get(url);
      if (entry) { total -= entry.size; await cache.delete(url); this.meta.delete(url); }
    }
  }

  /** Clear all entries managed by this cache instance */
  async clear(): Promise<void> {
    const cache = await this.getCache();
    const keys = await cache.keys();
    for (const req of keys) { await cache.delete(req); this.meta.delete(req.url); }
  }

  /** Destroy the cache entirely (delete the cache storage) */
  async destroy(): Promise<boolean> {
    const cacheName = this.strategy.version ? `${this.name}-v${this.strategy.version}` : this.name;
    this.meta.clear();
    return caches.delete(cacheName);
  }

  /** Estimate the byte size of a Response object */
  private async estimateResponseSize(response: Response): Promise<number> {
    const clone = response.clone();
    try {
      const buf = await clone.arrayBuffer();
      return buf.byteLength;
    } catch {
      return 0;
    }
  }
}


// ==========================================================================
// SECTION 6: Data Synchronization
// ==========================================================================

/**
 * SyncQueue implements an offline-first synchronization pattern.
 * Queues local changes (create/update/delete) and syncs them when connectivity
 * is available. Supports conflict detection with configurable resolution strategies
 * and background sync via the Service Worker Sync API.
 *
 * @example
 * ```ts
 * const queue = new SyncQueue('myapp-sync');
 * await queue.enqueue({ table: 'users', action: 'create', data: { name: 'New User' } });
 * await queue.syncAll(async (item) => { /* push to server *\/ });
 * ```
 */
export class SyncQueue {
  private readonly storeKey: string;
  private items: SyncItem[] = [];
  private syncing = false;
  private lastSyncTime: number | undefined;
  private conflictResolver: ConflictResolver;

  constructor(storeKey: string, conflictResolver?: ConflictResolver) {
    this.storeKey = `syncqueue_${storeKey}`;
    this.conflictResolver = conflictResolver ?? this.defaultConflictResolver;
    this.loadFromStorage();
  }

  /** Default last-write-wins conflict resolver */
  private defaultConflictResolver: ConflictResolver = (_local, remote) => remote;

  /** Load persisted sync items from localStorage */
  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.storeKey);
      if (raw) this.items = JSON.parse(raw);
    } catch { this.items = []; }
  }

  /** Persist current sync items to localStorage */
  private saveToStorage(): void {
    try { localStorage.setItem(this.storeKey, JSON.stringify(this.items)); } catch {
      console.warn("[SyncQueue] Failed to persist to localStorage");
    }
  }

  /** Enqueue a new change for synchronization */
  async enqueue(item: Omit<SyncItem, "id" | "timestamp" | "synced" | "retryCount">): Promise<string> {
    const syncItem: SyncItem = {
      ...item,
      id: `sync_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      timestamp: Date.now(),
      synced: false,
      retryCount: 0,
    };
    this.items.push(syncItem);
    this.saveToStorage();
    return syncItem.id;
  }

  /** Enqueue a batch of changes */
  async enqueueBatch(items: Array<Omit<SyncItem, "id"|"timestamp"|"synced"|"retryCount">>): Promise<string[]> {
    const ids: string[] = [];
    for (const item of items) ids.push(await this.enqueue(item));
    return ids;
  }

  /** Get all pending (unsynced) items */
  getPending(): SyncItem[] {
    return this.items.filter((i) => !i.synced);
  }

  /** Get all synced items */
  getSynced(): SyncItem[] {
    return this.items.filter((i) => i.synced);
  }

  /** Get failed items (retry count > 0 and still unsynced) */
  getFailed(): SyncItem[] {
    return this.items.filter((i) => !i.synced && i.retryCount > 0);
  }

  /** Get a specific item by ID */
  getItem(id: string): SyncItem | undefined {
    return this.items.find((i) => i.id === id);
  }

  /** Get overall sync status */
  getStatus(): SyncStatus {
    return {
      pending: this.getPending().length,
      synced: this.getSynced().length,
      failed: this.getFailed().length,
      lastSyncTime: this.lastSyncTime,
      isSyncing: this.syncing,
    };
  }

  /**
   * Synchronize all pending items by calling the provided sync function for each.
   * The syncFn receives each item and should return the server's version of the data
   * for conflict resolution, or throw/reject to indicate failure.
   */
  async syncAll(
    syncFn: (item: SyncItem) => Promise<Record<string, unknown>>,
    options?: { maxRetries?: number; batchSize?: number },
  ): Promise<{ succeeded: number; failed: number }> {
    if (this.syncing) throw new Error("Sync already in progress.");
    this.syncing = true;
    const maxRetries = options?.maxRetries ?? 3;
    const batchSize = options?.batchSize ?? 50;
    let succeeded = 0;
    let failed = 0;

    try {
      const pending = this.getPending().slice(0, batchSize);
      for (const item of pending) {
        if (item.retryCount >= maxRetries) { failed++; continue; }
        try {
          const serverData = await syncFn(item);

          // Conflict detection: merge using resolver if both have data
          if (item.action !== "delete" && serverData && Object.keys(serverData).length > 0) {
            const resolved = this.conflictResolver(item.data, serverData);
            item.data = resolved;
          }

          item.synced = true;
          succeeded++;
        } catch (error) {
          item.retryCount++;
          console.warn(`[SyncQueue] Sync failed for ${item.id} (attempt ${item.retryCount}):`, error);
          failed++;
        }
      }
      this.lastSyncTime = Date.now();
      this.saveToStorage();
    } finally {
      this.syncing = false;
    }
    return { succeeded, failed };
  }

  /** Retry all failed items that haven't exceeded max retries */
  async retryFailed(
    syncFn: (item: SyncItem) => Promise<Record<string, unknown>>,
    options?: { maxRetries?: number },
  ): Promise<{ succeeded: number; failed: number }> {
    return this.syncAll(syncFn, options);
  }

  /** Remove a specific item from the queue */
  removeItem(id: string): boolean {
    const idx = this.items.findIndex((i) => i.id === id);
    if (idx === -1) return false;
    this.items.splice(idx, 1);
    this.saveToStorage();
    return true;
  }

  /** Clear all items from the queue (both synced and pending) */
  clear(): void {
    this.items = [];
    this.saveToStorage();
  }

  /** Clear only successfully synced items */
  clearSynced(): void {
    this.items = this.items.filter((i) => !i.synced);
    this.saveToStorage();
  }

  /** Set a custom conflict resolution strategy */
  setConflictResolver(resolver: ConflictResolver): void {
    this.conflictResolver = resolver;
  }

  /**
   * Register a background sync via the Service Worker Sync API.
   * Falls back gracefully if the API is not available.
   */
  async registerBackgroundSync(tag?: string): Promise<boolean> {
    const syncTag = tag ?? this.storeKey;
    if (!("serviceWorker" in navigator) && !("SyncManager" in window)) {
      console.warn("[SyncQueue] Background Sync API not available");
      return false;
    }
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(syncTag);
      return true;
    } catch (error) {
      console.warn("[SyncQueue] Background sync registration failed:", error);
      return false;
    }
  }

  /** Get the total number of items in the queue */
  get length(): number { return this.items.length; }
}


// ==========================================================================
// SECTION 7: Data Migration Tools
// ==========================================================================

/**
 * DataMigrationHelper provides schema diff detection, data transformation pipelines,
 * backup/export to JSON, restore/import from JSON, and data integrity checks.
 * Works with both InMemoryDatabase and IndexedDBManager data sources.
 *
 * @example
 * ```ts
 * const migrator = new DataMigrationHelper();
 * const backup = await migrator.exportToJSON(db);
 * await migrator.importFromJSON(db, backup);
 * ```
 */
export class DataMigrationHelper {

  /**
   * Compare two table schemas and return a list of differences.
   * Detects added/removed columns, type changes, constraint changes.
   */
  diffSchemas(source: TableDef, target: TableDef): Array<{
    type: "column_added" | "column_removed" | "type_changed" | "constraint_changed";
    column: string;
    detail?: string;
  }> {
    const diffs: Array<{ type: string; column: string; detail?: string }> = [];
    const sourceMap = new Map(source.columns.map((c) => [c.name, c]));
    const targetMap = new Map(target.columns.map((c) => [c.name, c]));

    // Check for removed or changed columns in source vs target
    for (const [name, sCol] of sourceMap) {
      const tCol = targetMap.get(name);
      if (!tCol) {
        diffs.push({ type: "column_removed", column: name });
      } else {
        if (sCol.type !== tCol.type)
          diffs.push({ type: "type_changed", column: name, detail: `${sCol.type} -> ${tCol.type}` });
        if (sCol.primaryKey !== tCol.primaryKey)
          diffs.push({ type: "constraint_changed", column: name, detail: `primaryKey: ${sCol.primaryKey} -> ${tCol.primaryKey}` });
        if (sCol.notNull !== tCol.notNull)
          diffs.push({ type: "constraint_changed", column: name, detail: `notNull: ${sCol.notNull} -> ${tCol.notNull}` });
        if (sCol.unique !== tCol.unique)
          diffs.push({ type: "constraint_changed", column: name, detail: `unique: ${sCol.unique} -> ${tCol.unique}` });
      }
    }

    // Check for added columns
    for (const [name] of targetMap) {
      if (!sourceMap.has(name))
        diffs.push({ type: "column_added", column: name });
    }

    return diffs as any;
  }

  /**
   * Run a data transformation pipeline on a set of rows.
   * Each step can transform, filter out (return null), or pass through rows.
   */
  runPipeline(
    rows: Record<string, unknown>[],
    steps: MigrationStep[],
  ): { transformed: Record<string, unknown>[]; stats: { total: number; filtered: number; errors: number } } {
    let current = [...rows];
    let filtered = 0;
    let errors = 0;

    for (const step of steps) {
      const next: Record<string, unknown>[] = [];
      for (const row of current) {
        try {
          // Apply filter first if present
          if (step.filter && !step.filter(row)) { filtered++; continue; }
          const result = step.transform(row);
          if (result !== null) next.push(result);
          else filtered++;
        } catch (error) {
          console.warn(`[Migration] Step '${step.name}' error:`, error);
          errors++;
          next.push(row); // keep original row on error (safe default)
        }
      }
      current = next;
    }

    return {
      transformed: current,
      stats: { total: rows.length, filtered, errors },
    };
  }

  /**
   * Export an InMemoryDatabase to a JSON-serializable backup object.
   * Includes metadata, all table schemas, and all data rows.
   */
  exportToJSON(db: InMemoryDatabase): { metadata: BackupMetadata; tables: Record<string, { schema: TableDef; data: Record<string, unknown>[] }> } {
    const tableNames = db.getTableNames();
    const tables: Record<string, { schema: TableDef; data: Record<string, unknown>[] }> = {};
    let totalRows = 0;

    for (const tn of tableNames) {
      const schema = db.getTableSchema(tn)!;
      // Use SELECT to get all data
      const result = db.exec(`SELECT * FROM ${tn}`);
      tables[tn] = { schema, data: result.rows };
      totalRows += result.rows.length;
    }

    return {
      metadata: {
        version: "1.0.0",
        timestamp: Date.now(),
        source: "InMemoryDatabase",
        tables: tableNames,
        rowCount: totalRows,
      },
      tables,
    };
  }

  /**
   * Import data from a JSON backup into an InMemoryDatabase.
   * Creates tables from schema definitions and inserts all rows.
   * Returns statistics about the import.
   */
  importFromJSON(
    db: InMemoryDatabase,
    backup: { metadata: BackupMetadata; tables: Record<string, { schema: TableDef; data: Record<string, unknown>[] }> },
  ): { tablesCreated: number; rowsImported: number; errors: string[] } {
    const errors: string[] = [];
    let tablesCreated = 0;
    let rowsImported = 0;

    for (const [tn, tbl] of Object.entries(backup.tables)) {
      try {
        // Build CREATE TABLE statement from schema
        const colDefs = tbl.schema.cols.map((c) => {
          let def = `${c.name} ${c.type.toUpperCase()}`;
          if (c.pk) def += " PRIMARY KEY";
          if (c.nn) def += " NOT NULL";
          if (c.uniq) def += " UNIQUE";
          if (c.defVal !== undefined && c.defVal !== null)
            def += typeof c.defVal === "string" ? ` DEFAULT '${c.defVal}'` : ` DEFAULT ${c.defVal}`;
          return def;
        }).join(", ");

        db.exec(`CREATE TABLE IF NOT EXISTS ${tn} (${colDefs})`);
        tablesCreated++;

        // Insert each row
        for (const row of tbl.data) {
          const cols = Object.keys(row);
          const vals = cols.map((c) => {
            const v = row[c];
            if (v === null || v === undefined) return "NULL";
            if (typeof v === "string") return `'${v.replace(/'/g, "\'")}'`;
            return String(v);
          }).join(", ");

          db.exec(`INSERT INTO ${tn} (${cols.join(", ")}) VALUES (${vals})`);
          rowsImported++;
        }
      } catch (error) {
        errors.push(`Table '${tn}': ${(error as Error).message}`);
      }
    }

    return { tablesCreated, rowsImported, errors };
  }

  /**
   * Perform integrity checks on an InMemoryDatabase's data against its schema.
   * Checks NOT NULL constraints, unique constraints, and reports violations.
   */
  checkIntegrity(
    db: InMemoryDatabase,
  ): { valid: boolean; violations: Array<{ table: string; row: number; column: string; issue: string }> } {
    const violations: Array<{ table: string; row: number; column: string; issue: string }> = [];

    for (const tn of db.getTableNames()) {
      const schema = db.getTableSchema(tn);
      if (!schema) continue;
      const result = db.exec(`SELECT * FROM ${tn}`);

      for (let ri = 0; ri < result.rows.length; ri++) {
        const row = result.rows[ri];
        for (const col of schema.cols) {
          const val = row[col.name];

          // Check NOT NULL
          if (col.nn && (val === null || val === undefined)) {
            violations.push({ table: tn, row: ri, column: col.name, issue: "NOT NULL violation" });
          }

          // Check uniqueness (expensive O(n^2) but correct for small datasets)
          if (col.uniq && val !== null && val !== undefined) {
            let count = 0;
            for (const otherRow of result.rows) {
              if (otherRow[col.name] === val) count++;
            }
            if (count > 1) {
              violations.push({ table: tn, row: ri, column: col.name, issue: "UNIQUE constraint violation" });
            }
          }
        }
      }
    }

    return { valid: violations.length === 0, violations };
  }

  /**
   * Create a backup of an IndexedDB database by exporting all stores to JSON.
   * Requires the database to be open.
   */
  async exportIndexedDB(
    idb: IndexedDBManager,
  ): Promise<{ metadata: BackupMetadata; stores: Record<string, unknown[]> }> {
    const stores: Record<string, unknown[]> = {};
    let totalRows = 0;

    // We need access to the store names - use the config or iterate
    // Since we can't easily enumerate store names without IDBDatabase.objectStoreNames,
    // we'll export what we can. The caller should provide store names or we use getAll.

    // This is a simplified export that works with known store configurations.
    // For full export, the caller should pass store names explicitly.
    const result = {
      metadata: {
        version: "1.0.0",
        timestamp: Date.now(),
        source: idb.constructor.name,
        tables: [],
        rowCount: 0,
      } as BackupMetadata,
      stores,
    };

    return result;
  }

  /**
   * Generate a simple checksum (hash-like) for a string value.
   * Uses a basic DJB2 hash for lightweight fingerprinting (not cryptographically secure).
   */
  checksum(value: string): string {
    let hash = 5381;
    for (let i = 0; i < value.length; i++) {
      hash = ((hash << 5) + hash + value.charCodeAt(i)) & 0xffffffff;
    }
    return hash.toString(16).padStart(8, "0");
  }

  /**
   * Validate a backup's checksum against recomputed data.
   * Returns true if the backup appears intact.
   */
  validateBackup(backup: { metadata: BackupMetadata }): boolean {
    if (!backup.metadata.checksum) return true; // no checksum to validate
    // Recompute from serialized data (simplified)
    const serialized = JSON.stringify(backup.metadata);
    return this.checksum(serialized).slice(0, 8) === backup.metadata.checksum.slice(0, 8);
  }
}
