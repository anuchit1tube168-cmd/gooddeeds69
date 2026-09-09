const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),crypto=require('node:crypto');
function setup(){
 const sid=['99','00001'].join(''),other=['99','00002'].join(''),secret='synthetic-'.repeat(5),cache=new Map();let reads=0;
 const props={APP_ENV:'staging',CLOUDFLARE_CARD_ADAPTER_SECRET:secret};
 const tables={Main_2569:[['unused','studentId'],['',sid]],Deeds_2569:[['deedId','studentId','categoryId','hours','activityDate','description','unused','evidenceUrl','reviewer','status','submittedAt'],['own',sid,6,1,'2026-09-06','synthetic','','','','pending','2026-09-06'],['other',other,6,1,'2026-09-06','private synthetic','','','','pending','2026-09-06']]};
 props.GOODDEED_MASTER_COLUMN_MAP=JSON.stringify({studentId:'studentId'});
 props.GOODDEED_LEDGER_COLUMN_MAP=JSON.stringify(Object.fromEntries(['deedId','studentId','categoryId','hours','activityDate','description','status','submittedAt','evidenceUrl'].map(k=>[k,k])));
 const context=vm.createContext({console,PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]})},SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:n=>tables[n]?{getDataRange:()=>({getValues:()=>{reads++;return tables[n]}})}:null})},LockService:{getScriptLock:()=>({waitLock:()=>{},releaseLock:()=>{}})},CacheService:{getScriptCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v)})},Utilities:{newBlob:s=>({getBytes:()=>[...Buffer.from(s)]}),DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(_,s)=>[...crypto.createHash('sha256').update(s).digest()],computeHmacSha256Signature:(s,k)=>[...crypto.createHmac('sha256',k).update(s).digest()]},ContentService:{MimeType:{JSON:'json'},createTextOutput:s=>({setMimeType:()=>JSON.parse(s)})}});
 for(const f of ['backend/Code.gs','backend/CloudflareReadAdapter.gs','backend/GoodDeedReviewPlan.gs'])vm.runInContext(fs.readFileSync(f,'utf8'),context);
 const signed=(changes={})=>{const p={action:'cloudflareListSelf',subjectRef:sid,requestId:'test-request',timestamp:String(Math.floor(Date.now()/1000)),nonce:'synthetic_nonce_12345678',body:'{}',...changes};const hash=crypto.createHash('sha256').update(p.body).digest('hex');p.signature=crypto.createHmac('sha256',secret).update(['v2',p.action,p.subjectRef,p.requestId,p.timestamp,p.nonce,hash].join('\n')).digest('hex');return {parameter:p};};
 return {context,signed,props,tables,reads:()=>reads};
}
test('legacy raw read and write routes are denied',()=>{const s=setup();for(const action of ['getStudents','getStudent','getDeeds','setupFolders'])assert.equal(s.context.doGet({parameter:{action}}).code,'AUTHENTICATED_GATEWAY_REQUIRED');for(const action of ['approveDeed','submit_deed','bind_line','uploadImage','init_all_students'])assert.equal(s.context.doPost({postData:{contents:JSON.stringify({action})}}).code,'AUTHENTICATED_GATEWAY_REQUIRED');assert.equal(s.reads(),0);});
test('signed request matches v2 HMAC and returns only self without raw evidence',()=>{const s=setup(),r=s.context.doPost(s.signed());assert.equal(r.ok,true);assert.deepEqual(r.data.items.map(x=>x.deedId),['own']);assert.equal('studentId' in r.data.items[0],false);assert.equal('evidenceUrl' in r.data.items[0],false);});
test('tampered signature/body and expired request never read storage',()=>{for(const kind of ['signature','body','expired']){const s=setup(),e=s.signed(kind==='expired'?{timestamp:'1'}:{});if(kind==='signature')e.parameter.signature='0'.repeat(64);if(kind==='body')e.parameter.body='{"limit":1}';assert.equal(s.context.doPost(e).ok,false);assert.equal(s.reads(),0);}});
test('replay is rejected after first accepted request',()=>{const s=setup(),e=s.signed();assert.equal(s.context.doPost(e).ok,true);assert.equal(s.context.doPost(e).error,'ADAPTER_REPLAY_BLOCKED');});
test('non-staging, write action and subject overrides fail closed',()=>{let s=setup();s.props.APP_ENV='production';assert.equal(s.context.doPost(s.signed()).error,'ADAPTER_STAGING_REQUIRED');s=setup();assert.equal(s.context.doPost(s.signed({action:'cloudflareSubmitSelf'})).error,'ADAPTER_ACTION_DISABLED');assert.equal(s.context.doPost(s.signed({body:'{"studentId":"other"}'})).error,'ADAPTER_BODY_INVALID');assert.equal(s.reads(),0);});
test('loading the review planner never enables staff, write, evidence or activation routes',()=>{
 for(const action of ['cloudflarePendingQueue','cloudflareReviewDeed','cloudflareSubmitSelf','cloudflareGetEvidence','cloudflareActivateLink']){
  const s=setup();assert.equal(typeof s.context.buildGoodDeedReviewPlan_,'function');
  assert.equal(s.context.doPost(s.signed({action,subjectRef:'staff:synthetic'})).error,'ADAPTER_ACTION_DISABLED');assert.equal(s.reads(),0);
 }
});
test('duplicate master identity requires reconciliation',()=>{const s=setup();s.tables.Main_2569.push(s.tables.Main_2569[1]);assert.equal(s.context.doPost(s.signed()).error,'ADAPTER_IDENTITY_AMBIGUOUS');});
function cardSetup(){
 const s=setup(),sid=s.tables.Main_2569[1][1];
 const keys=['displayName','studentId','cohortLabel','totalHours','levelNumber','levelLabel','passed'];
 s.props.GOODDEED_MASTER_COLUMN_MAP=JSON.stringify(Object.fromEntries(keys.map(k=>[k,k])));
 s.tables.Main_2569=[keys,['Synthetic Student',sid,'Synthetic cohort',105,3,'Official level',false]];
 s.card=()=>s.context.doPost(s.signed({action:'cloudflareCardSelf'}));return s;
}
test('card preserves official carry-forward total and pass status, counts only self',()=>{
 const s=cardSetup(),r=s.card();assert.equal(r.ok,true);assert.equal(r.data.card.totalHours,105);assert.equal(r.data.card.passed,false);assert.equal(r.data.card.levelNumber,3);assert.equal(r.data.card.pendingCount,1);assert.equal(r.data.card.approvedCount,0);
});
test('card requires explicit official column mapping',()=>{const s=cardSetup();delete s.props.GOODDEED_MASTER_COLUMN_MAP;assert.equal(s.card().error,'ADAPTER_MASTER_MAPPING_REQUIRED');});
test('missing or duplicate official headers are rejected',()=>{for(const duplicate of [false,true]){const s=cardSetup();if(duplicate)s.tables.Main_2569[0].push('totalHours');else s.tables.Main_2569[0][3]='unexpected';assert.equal(s.card().error,'ADAPTER_MASTER_HEADER_INVALID');}});
test('blank totals, invalid levels and ambiguous pass status are rejected',()=>{for(const [index,value] of [[3,''],[3,'   '],[4,0],[4,2.5],[4,11],[6,'unknown']]){const s=cardSetup();s.tables.Main_2569[1][index]=value;assert.equal(s.card().error,'ADAPTER_MASTER_VALUE_INVALID');}});
test('zero official total is valid and never replaced by ledger sum',()=>{const s=cardSetup();s.tables.Main_2569[1][3]=0;assert.equal(s.card().data.card.totalHours,0);});
test('card rejects unsupported ledger status and body overrides',()=>{let s=cardSetup();s.tables.Deeds_2569[1][9]='unknown';assert.equal(s.card().error,'ADAPTER_LEDGER_REQUIRES_RECONCILIATION');s=cardSetup();assert.equal(s.context.doPost(s.signed({action:'cloudflareCardSelf',body:'{"limit":1}'})).error,'ADAPTER_BODY_INVALID');assert.equal(s.reads(),0);});
test('list rejects blank, boolean and fractional-step ledger hours',()=>{for(const value of ['', '  ',null,false,true,0,0.25,24.5]){const s=setup();s.tables.Deeds_2569[1][3]=value;assert.equal(s.context.doPost(s.signed()).error,'ADAPTER_LEDGER_REQUIRES_RECONCILIATION');}});
test('list accepts legitimate numeric and numeric-string half hours',()=>{for(const value of [0.5,'0.5',24]){const s=setup();s.tables.Deeds_2569[1][3]=value;const r=s.context.doPost(s.signed());assert.equal(r.ok,true);assert.equal(r.data.items[0].hours,Number(value));}});
test('official card numeric fields reject arrays and nondecimal strings',()=>{for(const value of [[],[1],'0x10','1e2']){const s=cardSetup();s.tables.Main_2569[1][3]=value;assert.equal(s.card().error,'ADAPTER_MASTER_VALUE_INVALID');}});
function stagingSetup(){
 const s=setup(),sid=s.tables.Main_2569[1][1],mapping=JSON.parse(fs.readFileSync('docs/staging-columns.example.json','utf8'));
 s.props.GOODDEED_MASTER_COLUMN_MAP=JSON.stringify(mapping.masterColumnMap);s.props.GOODDEED_LEDGER_COLUMN_MAP=JSON.stringify(mapping.ledgerColumnMap);
 const headers=['ลำดับ','รหัสประจำตัว','ยศ','ชื่อ','นามสกุล','ชั้นปี (รุ่น)','หมวด 1 บริจาคโลหิต','หมวด 2 โครงการภายนอก','หมวด 3 ช่วยงานภายใน','หมวด 4 อบรม','หมวด 5 ช่วยชุมชน','หมวด 6 ศาสนสถาน','หมวด 7 งานฟรีทั่วไป','หมวด 8 จงรักภักดี','หมวด 9 บทบาทพิเศษ','รวมชั่วโมงสะสม','เกณฑ์ขั้นต่ำ','ผลการประเมิน (Grade)','ระดับความดี (Level)','LINE User ID','LINE Display Name','อัปเดตล่าสุด'];
 const row=Array(headers.length).fill('');Object.assign(row,{1:sid,2:'นพอ.',3:'Synthetic',4:'Student',5:99,15:105,17:'ยังไม่ผ่าน ❌',18:'Lv.1 Cadet Novice'});s.tables.Main_2569=[headers,row];
 s.tables.Deeds_2569=[Object.values(mapping.ledgerColumnMap),['synthetic-deed',sid,6,0.5,'2026-09-08','Synthetic','pending','2026-09-08']];return s;
}
test('observed eight-column staging schema reads correct status and combined official card',()=>{
 let s=stagingSetup();const list=s.context.doPost(s.signed());assert.equal(list.ok,true);assert.equal(list.data.items[0].status,'pending');assert.equal(list.data.items[0].hasEvidence,false);
 s=stagingSetup();const r=s.context.doPost(s.signed({action:'cloudflareCardSelf'}));assert.equal(r.ok,true);assert.equal(r.data.card.displayName,'นพอ. Synthetic Student');assert.equal(r.data.card.cohortLabel,'99');assert.equal(r.data.card.totalHours,105);assert.equal(r.data.card.levelNumber,1);assert.equal(r.data.card.levelLabel,'Cadet Novice');assert.equal(r.data.card.passed,false);
});
test('reordered staging columns preserve self scope and totals',()=>{const s=stagingSetup();for(const table of Object.values(s.tables))for(const row of table)row.reverse();const r=s.context.doPost(s.signed({action:'cloudflareCardSelf'}));assert.equal(r.ok,true);assert.equal(r.data.card.totalHours,105);assert.equal(r.data.card.pendingCount,1);});
test('staging ledger requires explicit unique header mapping',()=>{
 for(const kind of ['missing-map','missing-header','duplicate-header']){const s=stagingSetup();if(kind==='missing-map')delete s.props.GOODDEED_LEDGER_COLUMN_MAP;else if(kind==='missing-header')s.tables.Deeds_2569[0][6]='unexpected';else s.tables.Deeds_2569[0].push('สถานะ');const r=s.context.doPost(s.signed());assert.equal(r.error,kind==='missing-map'?'ADAPTER_LEDGER_MAPPING_REQUIRED':'ADAPTER_LEDGER_HEADER_INVALID');}
});
test('unknown official level text is never inferred from hours',()=>{const s=stagingSetup();s.tables.Main_2569[1][18]='unknown';assert.equal(s.context.doPost(s.signed({action:'cloudflareCardSelf'})).error,'ADAPTER_MASTER_VALUE_INVALID');});
test('duplicate self ledger ID fails instead of double-counting',()=>{const s=stagingSetup();s.tables.Deeds_2569.push([...s.tables.Deeds_2569[1]]);assert.equal(s.context.doPost(s.signed({action:'cloudflareCardSelf'})).error,'ADAPTER_LEDGER_REQUIRES_RECONCILIATION');});
