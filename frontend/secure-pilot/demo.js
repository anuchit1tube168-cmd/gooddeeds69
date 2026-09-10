/* Browser-only walkthrough. No fetch, LINE SDK, credentials or persistent data. */
(function(){
  'use strict';
  const ui=window.GoodDeedUI, model=window.GoodDeedDemo, store=model.createDemoStore(), root=document.getElementById('app');
  const esc=ui.escape, byId=id=>document.getElementById(id);
  let view='overview',role='student',filter='all',query='',selected='',receipt='',draft={},evidence=null,requestId='',signature=null,challenge='',busy=false;
  const urls=new Set(),selectedReview=new Set(),revisionDrafts=new Map();
  let draftTimer=null;
  let categoryFilter='',monthFilter='',yearFilter='',studentFilter='',returnView='overview',editingId='',fileEpoch=0,fileBusy=false,studentSignature={distance:0,points:0,strokes:[]},batchQueue=[],pendingDecision=null;
  const projections=window.GoodDeedMissionData;
  const today=()=>{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());return ['year','month','day'].map(type=>parts.find(p=>p.type===type).value).join('-');};
  let requestSequence=0;
  const date=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?'ไม่ระบุวันที่':new Intl.DateTimeFormat('th-TH',{dateStyle:'medium',timeZone:'Asia/Bangkok'}).format(d);};
  const errorText={SIGNATURE_REQUIRED:'กรุณาลงนามในกรอบก่อนบันทึกผล',SIGNATURE_EXPIRED:'กรอบลงนามหมดเวลา กรุณากลับไปเปิดรายการและลงนามใหม่',NOTE_REQUIRED:'กรุณาระบุเหตุผลเมื่อไม่อนุมัติ (ไม่เกิน 600 ตัวอักษร)',REVIEW_CONFLICT:'รายการนี้มีผลตรวจแล้ว กรุณากลับไปดูสถานะล่าสุด',RETRY_LIMIT:'ครบจำนวนทดลองส่งซ้ำแล้ว รายการความดียังคงอยู่',DRAFT_INVALID:'กรุณาตรวจข้อมูลกิจกรรมอีกครั้ง'};
  function metrics(data){return projections.summarize(data.card,data.items,{demo:true,complete:true,goal:{source:'synthetic',targetHours:25,approvedHours:data.items.filter(r=>r.status==='approved').reduce((sum,r)=>sum+r.hours,0),periodLabel:'เป้าหมายสาธิต ไม่ใช่เกณฑ์ราชการ'}});}
  function navigate(next){
    saveDraft();receipt='';
    if(next==='submit'){if(view!=='submit'){returnView=view;editingId='';draft={};evidence=null;requestId='';studentSignature={distance:0,points:0,strokes:[]};}view='submit';}
    else{if(next==='review'&&view!=='review')filter='pending';view=next;fileEpoch++;fileBusy=false;}
    render(true);
  }
  function closeSheet(){saveDraft();fileEpoch++;fileBusy=false;view=returnView==='submit'?'overview':returnView;render(true);}
  function openRecord(id){
    const record=store.record(id);receipt='';
    if(record.status==='draft'){
      editingId='';requestId=id;draft=record;evidence=record.evidence;studentSignature=record.studentSignature||{distance:0,points:0,strokes:[]};returnView=view;view='submit';
    }else{selected=id;view='detail';challenge='';}
    render(true);
  }
  function render(focus=false){
    window.GoodDeedKindness?.unmount();window.GoodDeedMission?.unmount();
    document.body.classList.remove('dialog-open');
    const data=store.snapshot(),summary=metrics(data);
    const tools=`<div class="demo-tools"><label for="demo-role">ดูตัวอย่างในบทบาท<select id="demo-role"><option value="student">นักเรียนพยาบาล</option><option value="teacher">อาจารย์ผู้ตรวจ</option></select></label><a href="index.html">กลับหน้าเข้าสู่ระบบ</a></div>`;
    let content=['overview','radar','analytics','profile','submit'].includes(view)?ui.missionSlot()+(view==='overview'?ui.kindnessSlot():''):view==='detail'?detail():view==='guide'?ui.guide():list(data);
    const banner=receipt?`<section class="receipt" role="status"><h2>${esc(receipt)}</h2><p>Mission ID · <code>${esc(selected)}</code></p><p>บันทึกในชุดสาธิตของหน้านี้เท่านั้น ไม่มีข้อมูลถูกส่งไปยังระบบจริง</p></section>`:'';
    root.innerHTML=ui.shell(ui.workspace(`${tools}${ui.hero(data.card,{demo:true,metrics:summary})}${banner}<div id="workspace-view" class="mobile-panel" tabindex="-1">${content}</div><p class="login-note">โหมดสาธิต: แบบร่างและข้อมูลเริ่มใหม่เมื่อโหลดหน้าเว็บ ไม่ใช้แทนทะเบียนหรือผลรับรองจริง</p>`,{active:view,review:role==='teacher',fab:view!=='submit'})+(view==='submit'?`<dialog id="deed-dialog" class="mission-dialog" aria-labelledby="deed-dialog-title"><div class="dialog-toolbar"><strong id="deed-dialog-title">${editingId?'แก้ไขและส่งใหม่':'บันทึกความดี'}</strong><button class="btn btn-secondary" type="button" id="close-sheet">ปิด</button></div>${submission()}</dialog>`:''),{demo:true});
    byId('demo-role').value=role;byId('demo-role').onchange=e=>{saveDraft();role=e.target.value;view=role==='teacher'?'review':'overview';filter=role==='teacher'?'pending':'all';query='';receipt='';selectedReview.clear();batchQueue=[];render(true);};
    root.querySelectorAll('[data-view]').forEach(button=>button.onclick=()=>navigate(button.dataset.view));
    if(['records','review','history'].includes(view))bindList();
    window.GoodDeedMission?.mount(byId('mission-react'),{data:summary,card:data.card,items:data.items,view:view==='submit'?'overview':view,onView:navigate,onCategory:id=>{categoryFilter=String(id);filter='all';query='';navigate('records');},onOpen:openRecord});
    window.GoodDeedKindness?.mount(byId('kindness-panel'),{onStart:()=>navigate('submit')});
    if(view==='detail')bindDetail();
    if(view==='submit'){
      bindSubmission();const dialog=byId('deed-dialog');
      byId('close-sheet').onclick=closeSheet;dialog.oncancel=e=>{e.preventDefault();closeSheet();};
      if(typeof dialog.showModal==='function'){dialog.showModal();document.body.classList.add('dialog-open');}else{dialog.setAttribute('open','');dialog.setAttribute('role','region');}
      byId('categoryId').focus();return;
    }
    if(focus){byId('workspace-view').focus({preventScroll:true});byId('workspace-view').scrollIntoView({block:'start',behavior:'auto'});}
  }
  function list(data){
    const review=view==='review',students=[...new Map(data.items.map(d=>[d.studentId,d.ownerName])).entries()];
    const extra=review?`<label>ชั้นปี<select id="filter-year"><option value="">ทุกชั้นปี</option>${[1,2,3,4].map(y=>`<option value="${y}">ชั้นปีที่ ${y}</option>`).join('')}</select></label><label>นักเรียน<select id="filter-student"><option value="">ทุกคนในคิวตัวอย่าง</option>${students.map(([id,name])=>`<option value="${esc(id)}">${esc(name)}</option>`).join('')}</select></label>`:'';
    return `<section class="panel"><div class="panel-head"><div><p class="eyebrow">${review?'REVIEW QUEUE':view==='history'?'MISSION LOG':'MY MISSIONS'}</p><h2>${review?'คิวตรวจรับรอง':view==='history'?'ประวัติภารกิจ':'ภารกิจของฉัน'}</h2><p>${review?'เลือกหลายรายการเพื่อตรวจทีละภารกิจ พร้อมลงนามและยืนยันรายครั้ง':'ติดตามสถานะ เปิดแบบร่าง หรือแก้ไขรายการที่อาจารย์ส่งกลับ'}</p></div><button id="new-deed" class="btn btn-primary">บันทึกความดีใหม่</button></div><div class="panel-body"><div class="review-filters"><label for="deed-search">ค้นหากิจกรรม<input id="deed-search" type="search" value="${esc(query)}" placeholder="กิจกรรม หมวด หรือรหัสรายการ"></label><label for="deed-filter">สถานะ<select id="deed-filter"><option value="all">ทั้งหมด</option>${review?'':'<option value="draft">แบบร่าง</option>'}<option value="pending">รอตรวจ</option><option value="approved">อนุมัติแล้ว</option><option value="rejected">ให้แก้ไข</option></select></label><label>หมวดกิจกรรม<select id="filter-category"><option value="">ทุกหมวด</option>${ui.categories.slice(1).map((name,i)=>`<option value="${i+1}">${i+1}. ${esc(name)}</option>`).join('')}</select></label><label>เดือนกิจกรรม<input id="filter-month" type="month" value="${esc(monthFilter)}"></label>${extra}</div>${review?'<div class="batch-toolbar"><label class="batch-select"><input type="checkbox" id="select-visible">เลือกคิวที่แสดง</label><button class="btn btn-primary" type="button" id="start-batch" disabled>เริ่มตรวจรายการที่เลือก</button><span id="batch-count" class="muted"></span></div>':''}<p class="muted" id="result-count"></p><div id="deed-list"></div></div></section>${role==='teacher'?outbox(data):''}`;
  }
  function visibleRecords(){
    const rows=store.snapshot().items.filter(d=>view!=='review'||d.status!=='draft');
    return projections.filterRecords(rows,{status:filter,query,category:categoryFilter,month:monthFilter,year:view==='review'?yearFilter:'',student:view==='review'?studentFilter:'',categoryNames:ui.categories});
  }
  function fillRecords(){
    const items=visibleRecords(),review=view==='review';
    byId('result-count').textContent=`พบ ${items.length} รายการ${review?'สำหรับตรวจและติดตาม':''}`;
    byId('deed-list').innerHTML=items.length?items.map(d=>`<article class="gateway-record mission-card"><div>${review&&d.status==='pending'?`<label class="batch-select"><input type="checkbox" data-select="${esc(d.deedId)}" ${selectedReview.has(d.deedId)?'checked':''}>เลือกตรวจ</label>`:''}<p class="record-category">หมวด ${esc(d.categoryId||'ยังไม่ได้เลือก')} · ${esc(ui.categories[d.categoryId]||'แบบร่าง')}</p><h3><button class="record-link" data-record="${esc(d.deedId)}">${esc(d.description||'แบบร่างที่ยังกรอกไม่ครบ')}</button></h3><p class="record-meta">${esc(date(d.activityDate))} · ${d.evidence?'มีหลักฐานประกอบ':'ยังไม่มีหลักฐาน'}</p><p class="record-meta">ผู้ตรวจ: ${esc(d.reviewerName||'ยังไม่ได้ตรวจ')} · อัปเดต ${esc(date(d.updatedAt||d.submittedAt))}</p><small class="mission-id">Mission ID · ${esc(d.deedId)}</small></div><div class="record-result"><strong>${esc(d.hours||'—')}<small> ชม.</small></strong><span class="gateway-status status-${d.status}">${esc(ui.statuses[d.status])}</span></div></article>`).join(''):'<div class="gateway-empty" role="status"><h3>ไม่พบรายการในมุมมองนี้</h3><p>เปลี่ยนตัวกรองหรือคำค้นเพื่อดูรายการอื่น</p></div>';
    root.querySelectorAll('[data-record]').forEach(button=>button.onclick=()=>openRecord(button.dataset.record));
    if(review){
      root.querySelectorAll('[data-select]').forEach(input=>input.onchange=()=>{if(input.checked)selectedReview.add(input.dataset.select);else selectedReview.delete(input.dataset.select);updateBatch();});updateBatch();
    }
  }
  function updateBatch(){
    const pending=new Set(store.snapshot().items.filter(r=>r.status==='pending').map(r=>r.deedId));
    selectedReview.forEach(id=>{if(!pending.has(id))selectedReview.delete(id);});
    const ids=visibleRecords().filter(r=>r.status==='pending').map(r=>r.deedId),checked=ids.filter(id=>selectedReview.has(id)).length;
    byId('select-visible').checked=ids.length>0&&checked===ids.length;byId('select-visible').indeterminate=checked>0&&checked<ids.length;
    byId('batch-count').textContent='เลือก '+selectedReview.size+' ภารกิจ';byId('start-batch').disabled=selectedReview.size===0;
  }
  function bindList(){
    byId('new-deed').onclick=()=>navigate('submit');
    byId('deed-filter').value=filter;byId('deed-filter').onchange=e=>{filter=e.target.value;fillRecords();};
    byId('deed-search').oninput=e=>{query=e.target.value;fillRecords();};
    byId('filter-category').value=categoryFilter;byId('filter-category').onchange=e=>{categoryFilter=e.target.value;fillRecords();};
    byId('filter-month').onchange=e=>{monthFilter=e.target.value;fillRecords();};
    if(view==='review'){
      byId('filter-year').value=yearFilter;byId('filter-year').onchange=e=>{yearFilter=e.target.value;fillRecords();};
      byId('filter-student').value=studentFilter;byId('filter-student').onchange=e=>{studentFilter=e.target.value;fillRecords();};
      byId('select-visible').onchange=e=>{visibleRecords().filter(r=>r.status==='pending').forEach(r=>e.target.checked?selectedReview.add(r.deedId):selectedReview.delete(r.deedId));fillRecords();};
      byId('start-batch').onclick=()=>{batchQueue=[...selectedReview];openRecord(batchQueue[0]);};
    }
    fillRecords();
    root.querySelectorAll('[data-deliver]').forEach(button=>button.onclick=()=>{try{store.deliver(button.dataset.deliver,button.dataset.fail==='true');render();}catch(error){byId('delivery-status').textContent=errorText[error.code]||'ยังทดลองส่งไม่ได้';}});
  }
  function outbox(data){
    if(!data.outbox.length)return '';
    return `<section class="panel delivery-panel"><div class="panel-head"><div><h2>จำลองคิวแจ้งเตือน Telegram</h2><p>ทดลองกรณีส่งไม่สำเร็จ โดยชั่วโมงที่รับรองแล้วไม่เพิ่มซ้ำ</p></div></div><div class="panel-body"><p id="delivery-status" role="status"></p>${data.outbox.map(e=>`<div class="gateway-record"><div><p class="record-category">เหตุการณ์ตัวอย่าง · ${esc(e.deedId)}</p><h3>${e.status==='sent'?'จำลองการส่งสำเร็จ':e.status==='failed'?'จำลองการส่งไม่สำเร็จ':'รอทดลองส่ง'}</h3><p class="muted">ทดลองแล้ว ${e.attempts} ครั้ง · ไม่มีข้อความจริงถูกส่ง</p></div>${e.status!=='sent'?`<div class="actions"><button class="btn btn-secondary" data-deliver="${esc(e.id)}" data-fail="true" ${e.attempts>=3?'disabled':''}>จำลองส่งล้มเหลว</button><button class="btn btn-primary" data-deliver="${esc(e.id)}" ${e.attempts>=3?'disabled':''}>${e.attempts?'ลองส่งซ้ำ':'จำลองส่งสำเร็จ'}</button></div>`:''}</div>`).join('')}<h3 class="section-title">ประวัติในชุดสาธิต</h3><ul class="audit-list">${data.audit.slice(0,6).map(a=>`<li>${esc(a.action)}<small>${esc(a.deedId)} · ${esc(date(a.at))}</small></li>`).join('')}</ul></div></section>`;
  }
  function submission(){
    // In-memory demo identity only; works in ordinary HTTP previews too.
    if(!requestId)requestId='demo_form_'+(++requestSequence);
    return `<div class="form-layout"><section class="panel"><div class="panel-head"><div><p class="eyebrow">รายการใหม่</p><h2>บันทึกความดี</h2><p>กรอกข้อมูลกิจกรรม แล้วตรวจความครบถ้วนก่อนส่ง</p><p id="draft-status" class="draft-note" role="status">แบบร่างเก็บเฉพาะหน้านี้ · เริ่มใหม่เมื่อโหลดหน้าเว็บ</p></div></div><div class="panel-body"><div id="form-error" class="form-error" role="alert"></div><form id="deed-form" novalidate><div class="grid-form"><div class="field full"><label for="categoryId">หมวดกิจกรรม</label><select id="categoryId" name="categoryId" required><option value="">เลือกหมวดความดี</option>${ui.categories.slice(1).map((c,i)=>`<option value="${i+1}" ${String(draft.categoryId)===String(i+1)?'selected':''}>${i+1}. ${esc(c)}</option>`).join('')}</select><small id="categoryId-error" class="field-error"></small></div><div class="field"><label for="activityDate">วันที่ทำกิจกรรม</label><input id="activityDate" name="activityDate" type="date" value="${esc(draft.activityDate??today())}" required><small id="activityDate-error" class="field-error"></small></div><div class="field"><label for="hours">จำนวนชั่วโมง</label><input id="hours" name="hours" type="number" min="0.5" max="24" step="0.5" inputmode="decimal" value="${esc(draft.hours??'1')}" required><small>เพิ่มครั้งละ 0.5 ชั่วโมง</small><small id="hours-error" class="field-error"></small></div><div class="field full"><label for="description">รายละเอียดกิจกรรม</label><textarea id="description" name="description" minlength="10" maxlength="1200" placeholder="ทำอะไร ที่ไหน และเกิดประโยชน์ต่อใคร" required>${esc(draft.description||'')}</textarea><small id="description-count">${(draft.description||'').length} / 1,200 ตัวอักษร</small><small id="description-error" class="field-error"></small></div><div class="field full"><label for="evidence">หลักฐานประกอบกิจกรรม</label><div id="upload-zone" class="upload-zone"><p>ลากไฟล์มาวาง หรือเลือกจากอุปกรณ์</p><input id="evidence" name="evidence" type="file" accept="image/jpeg,image/png,application/pdf"><small>JPG, PNG หรือ PDF ไม่เกิน 2 MB · ในโหมดนี้ไฟล์อยู่เฉพาะหน้านี้</small><small id="evidence-error" class="field-error"></small><progress id="upload-progress" class="upload-progress" max="100" value="0" hidden aria-label="ความคืบหน้าการเตรียมหลักฐาน"></progress><p id="upload-status" class="upload-status" role="status"></p><div id="evidence-preview" class="evidence-filename">${evidence?esc(evidence.name):'ยังไม่ได้เลือกไฟล์'}</div></div></div><div class="field full"><label for="studentSignature">ลายเซ็นผู้บันทึก</label><p class="signature-consent">วาดลายเส้นตัวอย่างด้วยเมาส์ นิ้ว หรือปุ่มลูกศร ไม่ใช้ลายเซ็นจริงในโหมดสาธิต</p><div class="signature-wrap"><canvas id="studentSignature" width="900" height="240" tabindex="0" aria-label="วาดลายเส้นตัวอย่างผู้บันทึก ใช้เมาส์ นิ้ว หรือปุ่มลูกศร"></canvas><div class="signature-tools"><span id="student-signature-status" role="status"></span><button id="clear-student-signature" type="button" class="btn btn-secondary">ล้างลายเส้น</button></div></div><small id="studentSignature-error" class="field-error"></small></div></div><label class="check-label" for="confirmed"><input id="confirmed" name="confirmed" type="checkbox" ${draft.confirmed?'checked':''}>ฉันตรวจสอบวัน ชั่วโมง และหลักฐานของรายการตัวอย่างนี้แล้ว</label><small id="confirmed-error" class="field-error"></small><div class="actions"><button type="button" id="cancel-submit" class="btn btn-secondary">เก็บแบบร่างและปิด</button><button type="submit" id="submit-mission" class="btn btn-primary">${editingId?'ส่งฉบับแก้ไขตัวอย่าง':'ส่งภารกิจตัวอย่าง'}</button></div></form></div></section><aside class="form-aside"><h3>เตรียมให้ครบก่อนส่ง</h3><ol><li>หมวดตรงกับกิจกรรม</li><li>ชั่วโมงตามที่ได้รับการรับรอง</li><li>รายละเอียดอ่านเข้าใจได้</li><li>หลักฐานชัดเจนและไม่เกินจำเป็น</li></ol><p>การส่งยังไม่เพิ่มชั่วโมง ต้องผ่านการตรวจรับรองก่อน</p><p>โหมดสาธิตไม่บันทึกลง Google Drive หรือทะเบียนจริง</p></aside></div>`;
  }
  function saveDraft(){
    clearTimeout(draftTimer);draftTimer=null;
    const form=byId('deed-form');if(!form)return;
    draft={categoryId:form.elements.categoryId.value,activityDate:form.elements.activityDate.value,hours:form.elements.hours.value,description:form.elements.description.value,confirmed:form.elements.confirmed.checked,studentSignature};
    if(editingId)revisionDrafts.set(editingId,{draft:{...draft},evidence,studentSignature,requestId});
    else if(requestId)store.saveDraft({...draft,evidence},requestId);
    byId('draft-status').textContent='เก็บแบบร่างในหน้านี้แล้ว · ข้อมูลจะเริ่มใหม่เมื่อโหลดหน้าเว็บ';
  }
  function scheduleDraft(){clearTimeout(draftTimer);draftTimer=setTimeout(saveDraft,300);}
  function previewEvidence(){
    byId('evidence-preview').innerHTML=evidence?`${esc(evidence.name)} · ${(evidence.size/1024).toFixed(0)} KB${evidence.type.startsWith('image/')&&evidence.url?`<img class="evidence-image" alt="ตัวอย่างหลักฐานที่เลือก" src="${esc(evidence.url)}" decoding="async" loading="lazy">`:'<p>ไฟล์อยู่เฉพาะในหน้าสาธิตนี้</p>'}`:'ยังไม่ได้เลือกไฟล์';
  }
  function releaseUnusedUrls(){
    const keep=new Set([evidence?.url]);
    store.snapshot().items.forEach(r=>{keep.add(r.evidence?.url);r.revisions?.forEach(v=>keep.add(v.evidence?.url));});
    revisionDrafts.forEach(r=>keep.add(r.evidence?.url));
    urls.forEach(url=>{if(!keep.has(url)){URL.revokeObjectURL(url);urls.delete(url);}});
  }
  async function selectEvidence(file){
    if(!file)return;const epoch=++fileEpoch;
    fileBusy=true;evidence=null;previewEvidence();saveDraft();releaseUnusedUrls();
    const progress=byId('upload-progress'),status=byId('upload-status');progress.hidden=false;progress.value=0;status.textContent='กำลังตรวจไฟล์บนอุปกรณ์…';byId('submit-mission').disabled=true;
    try{
      if(!['image/jpeg','image/png','application/pdf'].includes(file.type)||file.size<1||file.size>2*1024*1024)throw Error('เลือก JPG, PNG หรือ PDF ขนาดไม่เกิน 2 MB');
      const header=new Uint8Array(await file.slice(0,12).arrayBuffer());
      if(epoch!==fileEpoch||view!=='submit')return;
      progress.value=40;
      if(!model.validateFileHeader(header,file.type))throw Error('เนื้อหาไฟล์ไม่ตรงกับชนิดที่ระบุ กรุณาเลือกไฟล์ใหม่');
      const preview=window.GoodDeedEvidence?await window.GoodDeedEvidence.prepare(file):file;
      if(epoch!==fileEpoch||view!=='submit')return;
      progress.value=80;
      const url=URL.createObjectURL(preview);urls.add(url);evidence={name:file.name,type:file.type,size:file.size,url};
      previewEvidence();progress.value=100;status.textContent='เตรียมหลักฐานแล้ว · ยังไม่มีการอัปโหลดไปเซิร์ฟเวอร์';
      byId('evidence-error').textContent='';byId('evidence').setAttribute('aria-invalid','false');saveDraft();
    }catch(error){if(epoch!==fileEpoch||view!=='submit')return;byId('evidence-error').textContent=error.message;byId('evidence').value='';byId('evidence').setAttribute('aria-invalid','true');status.textContent='ยังเตรียมไฟล์ไม่ได้';progress.value=0;}
    finally{if(epoch===fileEpoch&&view==='submit'){fileBusy=false;byId('submit-mission').disabled=false;}}
  }
  function bindSubmission(){
    const revalidate=key=>{saveDraft();const error=model.validateDraft({...draft,evidence})[key]||'';byId(key+'-error').textContent=error;byId(key).setAttribute('aria-invalid',String(Boolean(error)));};
    for(const key of ['categoryId','activityDate','hours','confirmed'])byId(key).onchange=()=>revalidate(key);
    byId('hours').oninput=scheduleDraft;byId('activityDate').oninput=scheduleDraft;
    byId('description').oninput=e=>{byId('description-count').textContent=`${e.target.value.length} / 1,200 ตัวอักษร`;if(e.target.getAttribute('aria-invalid')==='true')revalidate('description');else scheduleDraft();};
    byId('evidence').onchange=e=>selectEvidence(e.target.files[0]);
    const zone=byId('upload-zone');zone.ondragover=e=>{e.preventDefault();zone.classList.add('drag-over');};zone.ondragleave=()=>zone.classList.remove('drag-over');zone.ondrop=e=>{e.preventDefault();zone.classList.remove('drag-over');if(e.dataTransfer.files.length!==1){byId('evidence-error').textContent='กรุณาเลือกครั้งละ 1 ไฟล์';return;}selectEvidence(e.dataTransfer.files[0]);};
    previewEvidence();
    window.GoodDeedSignature.bind({canvas:byId('studentSignature'),status:byId('student-signature-status'),clear:byId('clear-student-signature'),value:studentSignature,onChange:value=>{studentSignature=value;scheduleDraft();byId('studentSignature-error').textContent='';}});
    byId('cancel-submit').onclick=closeSheet;
    byId('deed-form').onsubmit=e=>{e.preventDefault();if(busy||fileBusy)return;saveDraft();const payload={...draft,evidence,studentSignature};const errors=model.validateDraft(payload);
      for(const key of ['categoryId','activityDate','hours','description','evidence','studentSignature','confirmed']){byId(key+'-error').textContent=errors[key]||'';byId(key).setAttribute('aria-invalid',String(Boolean(errors[key])));byId(key).setAttribute('aria-describedby',key+'-error');}
      if(Object.keys(errors).length){byId('form-error').textContent='ยังส่งไม่ได้ กรุณาตรวจช่องที่ระบุด้านล่าง';byId(Object.keys(errors)[0])?.focus();return;}
      busy=true;try{
        const result=editingId?store.resubmit(editingId,payload,requestId):store.submit(payload,requestId);
        if(editingId)revisionDrafts.delete(editingId);
        receipt='ส่งภารกิจความดีเรียบร้อยแล้ว';selected=result.deed.deedId;draft={};evidence=null;requestId='';editingId='';studentSignature={distance:0,points:0,strokes:[]};view='detail';render(true);
      }catch(error){byId('form-error').textContent=errorText[error.code]||'ยังบันทึกภารกิจไม่ได้';}finally{busy=false;}
    };
  }
  function detail(){
    const d=store.record(selected),canReview=role==='teacher'&&d.status==='pending';
    return `<section class="panel"><div class="panel-head"><div><p class="eyebrow">รายละเอียดรายการ</p><h2>${esc(ui.categories[d.categoryId])}</h2><p>${esc(d.deedId)}</p></div><button id="back-list" class="btn btn-secondary">กลับไปรายการ</button></div><div class="panel-body"><div class="detail-grid"><section><span class="gateway-status status-${d.status}">${esc(ui.statuses[d.status])}</span><h3 class="section-title">${d.hours} ชั่วโมง · ${esc(date(d.activityDate))}</h3><p class="detail-description">${esc(d.description)}</p><dl><dt>ผู้บันทึก</dt><dd>นักเรียนตัวอย่าง</dd><dt>ส่งรายการ</dt><dd>${esc(date(d.submittedAt))}</dd>${d.reviewedAt?`<dt>ตรวจรับรอง</dt><dd>${esc(date(d.reviewedAt))}</dd>`:''}</dl>${d.note?`<div class="gateway-notice"><strong>ข้อเสนอแนะจากผู้ตรวจ</strong><p>${esc(d.note)}</p></div>`:''}</section><section class="evidence-panel"><h3>หลักฐานประกอบ</h3>${d.evidence?`<p class="evidence-filename">${esc(d.evidence.name)}</p>${d.evidence.synthetic?'<p class="muted">ตัวอย่างตำแหน่งแสดงหลักฐาน ไม่มีเอกสารบุคคลจริง</p>':d.evidence.type.startsWith('image/')&&d.evidence.url?`<img class="evidence-image" src="${esc(d.evidence.url)}" alt="หลักฐานที่เลือกในโหมดสาธิต" loading="lazy" decoding="async">`:`<p class="muted">ไฟล์ PDF ที่เลือก · ไม่อัปโหลดในโหมดสาธิต</p>${d.evidence.url&&d.evidence.url.startsWith('blob:')?`<a class="btn btn-secondary" href="${esc(d.evidence.url)}" download="${esc(d.evidence.name)}">เปิดไฟล์หลักฐานที่เลือก</a>`:''}`}`:'<p class="muted">ไม่มีไฟล์จริงในชุดตัวอย่างนี้</p>'}<p class="login-note">ระบบจริงต้องตรวจสิทธิ์ก่อนเข้าถึงไฟล์ทุกครั้ง</p></section></div>${ui.timeline(projections.timeline(d))}${role==='student'&&d.status==='rejected'?'<button id="revise-mission" class="btn btn-primary">แก้ไขและส่งใหม่</button>':''}${batchQueue.some(id=>id!==selected)?'<button id="next-review" class="btn btn-secondary">ไปภารกิจถัดไปที่เลือก</button>':''}${canReview?reviewForm():`<div class="gateway-notice notice-info">${d.status==='pending'?'รายการอยู่ในคิวตัวอย่าง สามารถเลือกมุมมองอาจารย์เพื่อทดลองตรวจและลงนาม':'รายการนี้มีผลตรวจแล้ว การเปิดดูซ้ำไม่เพิ่มชั่วโมง'}</div>`}</div></section>`;
  }
  function reviewForm(){
    challenge=store.beginReview(selected);signature={distance:0,points:0,strokes:[]};pendingDecision=null;
    return `<form id="review-form"><h3 class="section-title">ผลการตรวจรับรอง</h3><div id="review-error" class="form-error" role="alert"></div><div class="decision-row"><label><input name="decision" type="radio" value="approved" checked>อนุมัติ</label><label><input name="decision" type="radio" value="rejected">ให้แก้ไข</label></div><div class="field"><label for="review-note">เหตุผล / ข้อเสนอแนะ</label><textarea id="review-note" name="note" maxlength="600" placeholder="ระบุสิ่งที่ต้องแก้ไขอย่างชัดเจน"></textarea></div><h3 class="section-title">ลงนามรับรองครั้งนี้</h3><p class="muted">วาดลายเส้นตัวอย่างในกรอบ ไม่ใช้ลายเซ็นจริงของคุณในโหมดสาธิต</p><div class="signature-wrap"><canvas id="signature" width="900" height="240" tabindex="0" aria-label="กรอบวาดลายเซ็นตัวอย่าง ใช้เมาส์ นิ้ว หรือปุ่มลูกศร"></canvas><div class="signature-tools"><span id="signature-status" role="status">ยังไม่ได้ลงนาม · กรอบใหม่ทุกครั้ง</span><button id="clear-signature" type="button" class="btn btn-secondary">ล้างลายเส้น</button></div></div><p class="login-note">แบบจำลองนี้ทดสอบขั้นตอนการลงนามเท่านั้น ระบบจริงต้องยืนยันผู้ลงนามและหลักฐานฝั่งเซิร์ฟเวอร์</p><div class="actions"><button id="prepare-review" class="btn btn-primary" type="submit">ตรวจสอบก่อนยืนยัน</button></div><div id="review-confirm" class="review-confirm" hidden></div></form>`;
  }
  function bindDetail(){
    byId('back-list').onclick=()=>{view=role==='teacher'?'review':'records';receipt='';render(true);};
    if(byId('revise-mission'))byId('revise-mission').onclick=()=>{
      const saved=revisionDrafts.get(selected),record=store.record(selected);
      editingId=selected;draft=saved?.draft||{categoryId:record.categoryId,hours:record.hours,activityDate:record.activityDate,description:record.description,confirmed:false};
      evidence=saved?.evidence||record.evidence||null;studentSignature=saved?.studentSignature||{distance:0,points:0,strokes:[]};requestId=saved?.requestId||'demo_resubmit_'+(++requestSequence);returnView='detail';view='submit';render();
    };
    if(byId('next-review'))byId('next-review').onclick=()=>{
      const next=batchQueue.find(id=>id!==selected&&store.record(id).status==='pending');
      if(next)openRecord(next);else{batchQueue=[];navigate('review');}
    };
    const form=byId('review-form');if(!form)return;
    const resetConfirmation=()=>{pendingDecision=null;byId('review-confirm').hidden=true;};
    window.GoodDeedSignature.bind({canvas:byId('signature'),status:byId('signature-status'),clear:byId('clear-signature'),value:signature,onChange:value=>{signature=value;resetConfirmation();}});
    form.oninput=resetConfirmation;
    form.onsubmit=e=>{
      e.preventDefault();if(busy)return;
      const decision=form.elements.decision.value,note=byId('review-note').value;
      if(signature.distance<24||signature.points<5){byId('review-error').textContent=errorText.SIGNATURE_REQUIRED;byId('signature').focus();return;}
      if(decision==='rejected'&&!note.trim()){byId('review-error').textContent='กรุณาระบุเหตุผลและสิ่งที่ต้องแก้ไข';byId('review-note').focus();return;}
      byId('review-error').textContent='';
      const confirmation={deedId:selected,decision,note,proof:{challenge,distance:signature.distance,points:signature.points,note}};
      pendingDecision=confirmation;const record=store.record(selected),panel=byId('review-confirm');
      panel.innerHTML=`<h4>ยืนยันผลตรวจภารกิจนี้</h4><p>${esc(record.description)}</p><p>${record.hours} ชั่วโมง · ${esc(record.ownerName)} · ${esc(record.deedId)}</p><p>ผลตรวจ: <strong>${decision==='approved'?'อนุมัติ':'ให้แก้ไข'}</strong></p>${note?`<p>${esc(note)}</p>`:''}<p class="chart-note">ยืนยันเฉพาะภารกิจนี้ รายการที่เลือกอื่นต้องตรวจและลงนามแยกกัน</p><div class="actions"><button id="cancel-review" type="button" class="btn btn-secondary">กลับไปตรวจ</button><button id="confirm-review" type="button" class="btn btn-primary">ยืนยันผลตรวจตัวอย่าง</button></div>`;
      panel.hidden=false;byId('cancel-review').onclick=()=>{resetConfirmation();byId('prepare-review').focus();};
      byId('confirm-review').onclick=()=>{
        if(busy||pendingDecision!==confirmation)return;busy=true;pendingDecision=null;
        try{
          store.review(confirmation.deedId,confirmation.decision,confirmation.proof);selectedReview.delete(confirmation.deedId);batchQueue=batchQueue.filter(id=>id!==confirmation.deedId);
          receipt=confirmation.decision==='approved'?'อนุมัติภารกิจตัวอย่างแล้ว':'ส่งกลับให้แก้ไขแล้ว';challenge='';render(true);
        }catch(error){panel.hidden=true;byId('review-error').textContent=errorText[error.code]||'ยังบันทึกผลตรวจไม่ได้';}finally{busy=false;}
      };
      byId('confirm-review').focus();
    };
  }
  window.addEventListener('pagehide',event=>{if(!event.persisted)urls.forEach(url=>URL.revokeObjectURL(url));});
  render();
})();
