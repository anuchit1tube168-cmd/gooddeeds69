const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
function fixture(){
 const now=1800000000000,sid=['99','00001'].join(''),calls=[];
 const request={requestId:'request:example',deedId:'deed:example',decision:'approved',note:'Checked synthetic evidence',signatureRef:'signature:example'};
 const actor={actorRef:'teacher:example',sessionRef:'session:example',role:'teacher',active:true,validFrom:now-10000,expiresAt:now+60000};
 const deed={deedId:request.deedId,studentId:sid,status:'pending',revisionDigest:'a'.repeat(64)};
 const scope={actorRef:actor.actorRef,studentId:sid,permission:'gooddeed.review',version:'assignment:v1',active:true,validFrom:now-10000,expiresAt:now+60000};
 const intent=()=>crypto.createHash('sha256').update(JSON.stringify(['gooddeed-review-intent-v1',actor.actorRef,actor.sessionRef,deed.deedId,sid,deed.revisionDigest,scope.version,request.requestId,request.decision,request.note])).digest('hex');
 const proof={signatureRef:request.signatureRef,purpose:'gooddeed.review',state:'verified-private',consumed:false,actorRef:actor.actorRef,sessionRef:actor.sessionRef,intentDigest:intent(),validFrom:now-1000,expiresAt:now+30000};
 const records={session:actor,deed,assignment:scope,signature:proof};
 const ports=Object.fromEntries(Object.entries(records).map(([k,v])=>[k,(...args)=>{calls.push([k,...args]);return v;}]));
 const context=vm.createContext({Utilities:{DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(_,s)=>[...crypto.createHash('sha256').update(s).digest()]}});
 vm.runInContext(fs.readFileSync('backend/GoodDeedReviewGate.gs','utf8'),context);
 return {request,actor,deed,scope,proof,ports,calls,now,intent,run:()=>context.checkGoodDeedReviewPrerequisites_(request,ports,now),context};
}
test('private scope and fresh intent pass prerequisites without becoming an executable plan',()=>{
 const s=fixture(),before=JSON.stringify([s.request,s.actor,s.deed,s.scope,s.proof]);const r=s.run();
 assert.equal(r.checksPassed,true);assert.equal(r.executable,false);assert.equal(r.validUntil,s.proof.expiresAt);
 assert.equal(r.remaining.length,4);assert.equal(JSON.stringify([s.request,s.actor,s.deed,s.scope,s.proof]),before);
 assert.deepEqual(s.calls,[['session'],['deed',s.deed.deedId],['assignment',s.actor.actorRef,s.deed.studentId],['signature',s.request.signatureRef]]);
 assert.equal('studentId' in r,false);assert.equal('signatureRef' in r,false);
});
test('client identity, role, hours and signature attestations are rejected before private lookup',()=>{
 for(const key of ['studentId','actorRef','role','hours','verified','signature','scope']){const s=fixture();s.request[key]='forged';assert.throws(s.run,/REVIEW_REQUEST_INVALID/);assert.equal(s.calls.length,0);}
});
test('review requires valid request and rejection reason',()=>{
 for(const change of [{requestId:''},{signatureRef:'https://example.invalid/image'},{note:null},{note:'x'.repeat(1201)},{decision:'rejected',note:'  '},{decision:'approve'}]){const s=fixture();Object.assign(s.request,change);assert.throws(s.run,/REVIEW_REQUEST_INVALID/);assert.equal(s.calls.length,0);}
 const s=fixture();s.request.decision='rejected';s.request.note='Please clarify';s.proof.intentDigest=s.intent();assert.equal(s.run().checksPassed,true);
});
test('expired, inactive and student sessions fail before deed lookup',()=>{
 for(const change of [{expiresAt:1800000000000},{validFrom:1800000000001},{active:false},{role:'student'},{actorRef:''}]){const s=fixture();Object.assign(s.actor,change);assert.throws(s.run,/REVIEW_AUTH_REQUIRED/);assert.equal(s.calls.length,1);}
});
test('admin and teacher both need a current exact student assignment',()=>{
 for(const role of ['teacher','admin'])for(const change of [{active:false},{studentId:'other'},{actorRef:'other:actor'},{permission:'gooddeed.read'},{expiresAt:1800000000000},{version:''}]){const s=fixture();s.actor.role=role;Object.assign(s.scope,change);assert.throws(s.run,/REVIEW_ASSIGNED_SCOPE_REQUIRED/);assert.equal(s.calls.some(c=>c[0]==='signature'),false);}
});
test('final, ambiguous and uncertain deeds cannot authorize another credit',()=>{
 for(const status of ['approved','rejected','approving','draft','unknown']){const s=fixture();s.deed.status=status;assert.throws(s.run,/REVIEW_CURRENT_PENDING_REQUIRED/);}
 for(const change of [{deedId:'other:deed'},{studentId:Number(fixture().deed.studentId)},{revisionDigest:'missing'}]){const s=fixture();Object.assign(s.deed,change);assert.throws(s.run,/REVIEW_STORED_DEED_INVALID/);}
});
test('changed decision, exact note, request, revision, session or assignment invalidates signature',()=>{
 for(const change of [s=>s.request.decision='rejected',s=>s.request.note+=' ',s=>s.request.requestId='request:other',s=>s.deed.revisionDigest='b'.repeat(64),s=>s.actor.sessionRef='session:other',s=>s.scope.version='assignment:v2']){const s=fixture();change(s);assert.throws(s.run,/REVIEW_FRESH_SIGNATURE_REQUIRED/);}
});
test('signature must be private, unconsumed, correctly bound and at most five minutes old',()=>{
 for(const change of [{state:'uploaded'},{purpose:'profile'},{consumed:true},{consumed:'false'},{actorRef:'teacher:other'},{signatureRef:'signature:other'},{expiresAt:1800000000000},{validFrom:1800000000001},{validFrom:1799999600000},{expiresAt:1800000400000},{intentDigest:'0'.repeat(64)}]){const s=fixture();Object.assign(s.proof,change);assert.throws(s.run,/REVIEW_FRESH_SIGNATURE_REQUIRED/);}
});
test('failed private lookup is sanitized and later lookups never run',()=>{
 for(const key of ['session','deed','assignment','signature']){const s=fixture();s.ports[key]=()=>{throw Error('PRIVATE_PROVIDER_DETAIL');};assert.throws(s.run,e=>e.message==='REVIEW_PRIVATE_LOOKUP_FAILED');}
});
test('missing server resolvers and invalid server clock cannot be substituted with request objects',()=>{
 const s=fixture();assert.throws(()=>s.context.checkGoodDeedReviewPrerequisites_(s.request,{session:s.actor},s.now),/REVIEW_PRIVATE_RESOLVERS_REQUIRED/);
 for(const now of [NaN,Infinity,-1,'1800000000000'])assert.throws(()=>s.context.checkGoodDeedReviewPrerequisites_(s.request,s.ports,now),/REVIEW_CLOCK_INVALID/);
});
test('revocation and proof consumption between checks are observed on a fresh call',()=>{
 const s=fixture();assert.equal(s.run().checksPassed,true);s.scope.active=false;assert.throws(s.run,/REVIEW_ASSIGNED_SCOPE_REQUIRED/);
 s.scope.active=true;s.proof.consumed=true;assert.throws(s.run,/REVIEW_FRESH_SIGNATURE_REQUIRED/);
});
