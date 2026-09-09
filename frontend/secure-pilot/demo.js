/* Browser-only walkthrough. No fetch, LINE SDK, credentials or persistent data. */
(function(){
  'use strict';
  const ui=window.GoodDeedUI, model=window.GoodDeedDemo, store=model.createDemoStore(), root=document.getElementById('app');
  const esc=ui.escape, byId=id=>document.getElementById(id);
  let view='records',role='student',filter='all',query='',selected='',receipt='',draft={},evidence=null,requestId='',signature=null,challenge='',busy=false;
  const urls=new Set();
  const today=()=>{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());return ['year','month','day'].map(type=>parts.find(p=>p.type===type).value).join('-');};
  let requestSequence=0;
  const date=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?'ไม่ระบุวันที่':new Intl.DateTimeFormat('th-TH',{dateStyle:'medium',timeZone:'Asia/Bangkok'}).format(d);};
  const errorText={SIGNATURE_REQUIRED:'กรุณาลงนามในกรอบก่อนบันทึกผล',SIGNATURE_EXPIRED:'กรอบลงนามหมดเวลา กรุณากลับไปเปิดรายการและลงนามใหม่',NOTE_REQUIRED:'กรุณาระบุเหตุผลเมื่อไม่อนุมัติ (ไม่เกิน 600 ตัวอักษร)',REVIEW_CONFLICT:'รายการนี้มีผลตรวจแล้ว กรุณากลับไปดูสถานะล่าสุด',RETRY_LIMIT:'ครบจำนวนทดลองส่งซ้ำแล้ว รายการความดียังคงอยู่',DRAFT_INVALID:'กรุณาตรวจข้อมูลกิจกรรมอีกครั้ง'};
  function render(focus=false){
    window.GoodDeedKindness?.unmount();
    const data=store.snapshot();
    const tools=`<div class="demo-tools"><label for="demo-role">ดูตัวอย่างในบทบาท<select id="demo-role"><option value="student">นักเรียนพยาบาล</option><option value="teacher">อาจารย์ผู้ตรวจ</option></select></label><a href="index.html">กลับหน้าเข้าสู่ระบบ</a></div>`;
    let content=view==='submit'?submission():view==='detail'?detail():view==='guide'?ui.guide():list(data);
    const banner=receipt?`<section class="receipt" role="status"><h2>${esc(receipt)}</h2><p>บันทึกในชุดสาธิตของหน้านี้เท่านั้น ไม่มีข้อมูลถูกส่งไปยังระบบจริง</p></section>`:'';
    root.innerHTML=ui.shell(`${tools}${ui.hero(data.card,{demo:true,reviewer:role==='teacher'})}${ui.navigation(view,role==='teacher')}${banner}<div id="workspace-view" class="mobile-panel">${content}</div><p class="login-note">โหมดสาธิต: ข้อมูลเริ่มใหม่เมื่อโหลดหน้าเว็บ ไม่ใช้แทนทะเบียนหรือผลรับรองจริง</p>`,{demo:true});
    byId('demo-role').value=role;byId('demo-role').onchange=e=>{saveDraft();role=e.target.value;view=role==='teacher'?'review':'records';filter='all';query='';receipt='';render(true);};
    root.querySelectorAll('[data-view]').forEach(button=>button.onclick=()=>{saveDraft();view=button.dataset.view;if(view==='review'){filter='all';query='';}receipt='';render(true);});
    if(['records','review'].includes(view))bindList();
    window.GoodDeedKindness?.mount(byId('kindness-panel'),{onStart:()=>{view='submit';receipt='';render(true);}});
    if(view==='submit')bindSubmission();
    if(view==='detail')bindDetail();
    if(focus){byId('workspace-view').setAttribute('tabindex','-1');byId('workspace-view').focus({preventScroll:true});byId('workspace-view').scrollIntoView({block:'start',behavior:'auto'});}
  }
  function list(data){
    const review=view==='review';
    return `<div class="dashboard-body"><section class="panel"><div class="panel-head"><div><h2>${review?'คิวตรวจรับรอง':'รายการความดีของฉัน'}</h2><p>${review?'แสดงเฉพาะคิวตัวอย่างของอาจารย์':'ดูความคืบหน้าและเหตุผลการตรวจในแต่ละรายการ'}</p></div><button id="new-deed" class="btn btn-primary">บันทึกความดีใหม่</button></div><div class="panel-body"><div class="gateway-controls"><label for="deed-search">ค้นหากิจกรรม<input id="deed-search" type="search" value="${esc(query)}" placeholder="พิมพ์ชื่อกิจกรรมหรือหมวด"></label><label for="deed-filter">สถานะ<select id="deed-filter"><option value="all">ทั้งหมด</option><option value="pending">รอตรวจ</option><option value="approved">อนุมัติแล้ว</option><option value="rejected">ไม่อนุมัติ</option></select></label></div><p class="muted" id="result-count"></p><div id="deed-list"></div></div></section>${ui.kindnessSlot()}</div>${role==='teacher'?outbox(data):''}`;
  }
  function fillRecords(){
    const data=store.snapshot();
    const items=data.items.filter(d=>(view!=='review'||d.status==='pending')&&(filter==='all'||d.status===filter)&&`${d.description} ${ui.categories[d.categoryId]}`.toLowerCase().includes(query.toLowerCase()));
    byId('result-count').textContent=`พบ ${items.length} รายการ${view==='review'?'ที่รอตรวจ':''}`;
    byId('deed-list').innerHTML=items.length?items.map(d=>`<article class="gateway-record"><div><p class="record-category">หมวด ${d.categoryId} · ${esc(ui.categories[d.categoryId])}</p><h3><button class="record-link" data-record="${esc(d.deedId)}">${esc(d.description)}</button></h3><p class="record-meta">${esc(date(d.activityDate))} · ${d.evidence?'มีหลักฐานประกอบ':'ดูรายละเอียดผลตรวจ'}</p></div><div class="record-result"><strong>${d.hours}<small> ชั่วโมง</small></strong><span class="gateway-status status-${d.status}">${esc(ui.statuses[d.status])}</span></div></article>`).join(''):'<div class="gateway-empty" role="status"><h3>ไม่พบรายการในมุมมองนี้</h3><p>เปลี่ยนตัวกรองหรือคำค้นเพื่อดูรายการอื่น</p></div>';
    root.querySelectorAll('[data-record]').forEach(button=>button.onclick=()=>{selected=button.dataset.record;view='detail';receipt='';challenge='';render(true);});
  }
  function bindList(){
    byId('new-deed').onclick=()=>{view='submit';receipt='';render(true);};
    byId('deed-filter').value=filter;byId('deed-filter').onchange=e=>{filter=e.target.value;fillRecords();};
    byId('deed-search').oninput=e=>{query=e.target.value;fillRecords();};fillRecords();
    root.querySelectorAll('[data-deliver]').forEach(button=>button.onclick=()=>{try{store.deliver(button.dataset.deliver,button.dataset.fail==='true');render();}catch(error){byId('delivery-status').textContent=errorText[error.code]||'ยังทดลองส่งไม่ได้';}});
  }
  function outbox(data){
    if(!data.outbox.length)return '';
    return `<section class="panel delivery-panel"><div class="panel-head"><div><h2>จำลองคิวแจ้งเตือน Telegram</h2><p>ทดลองกรณีส่งไม่สำเร็จ โดยชั่วโมงที่รับรองแล้วไม่เพิ่มซ้ำ</p></div></div><div class="panel-body"><p id="delivery-status" role="status"></p>${data.outbox.map(e=>`<div class="gateway-record"><div><p class="record-category">เหตุการณ์ตัวอย่าง · ${esc(e.deedId)}</p><h3>${e.status==='sent'?'จำลองการส่งสำเร็จ':e.status==='failed'?'จำลองการส่งไม่สำเร็จ':'รอทดลองส่ง'}</h3><p class="muted">ทดลองแล้ว ${e.attempts} ครั้ง · ไม่มีข้อความจริงถูกส่ง</p></div>${e.status!=='sent'?`<div class="actions"><button class="btn btn-secondary" data-deliver="${esc(e.id)}" data-fail="true" ${e.attempts>=3?'disabled':''}>จำลองส่งล้มเหลว</button><button class="btn btn-primary" data-deliver="${esc(e.id)}" ${e.attempts>=3?'disabled':''}>${e.attempts?'ลองส่งซ้ำ':'จำลองส่งสำเร็จ'}</button></div>`:''}</div>`).join('')}<h3 class="section-title">ประวัติในชุดสาธิต</h3><ul class="audit-list">${data.audit.slice(0,6).map(a=>`<li>${esc(a.action)}<small>${esc(a.deedId)} · ${esc(date(a.at))}</small></li>`).join('')}</ul></div></section>`;
  }
  function submission(){
    // In-memory demo identity only; works in ordinary HTTP previews too.
    if(!requestId)requestId='demo_form_'+(++requestSequence);
    return `<div class="form-layout"><section class="panel"><div class="panel-head"><div><p class="eyebrow">รายการใหม่</p><h2>บันทึกความดี</h2><p>กรอกข้อมูลกิจกรรม แล้วตรวจความครบถ้วนก่อนส่ง</p></div></div><div class="panel-body"><div id="form-error" class="form-error" role="alert"></div><form id="deed-form" novalidate><div class="grid-form"><div class="field full"><label for="categoryId">หมวดกิจกรรม</label><select id="categoryId" name="categoryId" required><option value="">เลือกหมวดความดี</option>${ui.categories.slice(1).map((c,i)=>`<option value="${i+1}" ${String(draft.categoryId)===String(i+1)?'selected':''}>${i+1}. ${esc(c)}</option>`).join('')}</select><small id="categoryId-error" class="field-error"></small></div><div class="field"><label for="activityDate">วันที่ทำกิจกรรม</label><input id="activityDate" name="activityDate" type="date" value="${esc(draft.activityDate??today())}" required><small id="activityDate-error" class="field-error"></small></div><div class="field"><label for="hours">จำนวนชั่วโมง</label><input id="hours" name="hours" type="number" min="0.5" max="24" step="0.5" inputmode="decimal" value="${esc(draft.hours??'1')}" required><small>เพิ่มครั้งละ 0.5 ชั่วโมง</small><small id="hours-error" class="field-error"></small></div><div class="field full"><label for="description">รายละเอียดกิจกรรม</label><textarea id="description" name="description" minlength="10" maxlength="1200" placeholder="ทำอะไร ที่ไหน และเกิดประโยชน์ต่อใคร" required>${esc(draft.description||'')}</textarea><small id="description-count">${(draft.description||'').length} / 1,200 ตัวอักษร</small><small id="description-error" class="field-error"></small></div><div class="field full"><label for="evidence">หลักฐานประกอบกิจกรรม</label><input id="evidence" name="evidence" type="file" accept="image/jpeg,image/png,application/pdf"><small>JPG, PNG หรือ PDF ไม่เกิน 2 MB · ในโหมดนี้ไฟล์อยู่เฉพาะหน้านี้</small><small id="evidence-error" class="field-error"></small><div id="evidence-preview" class="evidence-filename">${evidence?esc(evidence.name):'ยังไม่ได้เลือกไฟล์'}</div></div></div><label class="check-label" for="confirmed"><input id="confirmed" name="confirmed" type="checkbox" ${draft.confirmed?'checked':''}>ฉันตรวจสอบวัน ชั่วโมง และหลักฐานของรายการตัวอย่างนี้แล้ว</label><small id="confirmed-error" class="field-error"></small><div class="actions"><button type="button" id="cancel-submit" class="btn btn-secondary">กลับไปรายการ</button><button type="submit" class="btn btn-primary">ส่งรายการตัวอย่าง</button></div></form></div></section><aside class="form-aside"><h3>เตรียมให้ครบก่อนส่ง</h3><ol><li>หมวดตรงกับกิจกรรม</li><li>ชั่วโมงตามที่ได้รับการรับรอง</li><li>รายละเอียดอ่านเข้าใจได้</li><li>หลักฐานชัดเจนและไม่เกินจำเป็น</li></ol><p>การส่งยังไม่เพิ่มชั่วโมง ต้องผ่านการตรวจรับรองก่อน</p><p>โหมดสาธิตไม่บันทึกลง Google Drive หรือทะเบียนจริง</p></aside></div>`;
  }
  function saveDraft(){
    const form=byId('deed-form');if(!form)return;
    draft={categoryId:form.elements.categoryId.value,activityDate:form.elements.activityDate.value,hours:form.elements.hours.value,description:form.elements.description.value,confirmed:form.elements.confirmed.checked};
  }
  function bindSubmission(){
    const revalidate=key=>{saveDraft();const error=model.validateDraft({...draft,evidence})[key]||'';byId(key+'-error').textContent=error;byId(key).setAttribute('aria-invalid',String(Boolean(error)));};
    for(const key of ['categoryId','activityDate','hours','confirmed'])byId(key).onchange=()=>revalidate(key);
    byId('description').oninput=e=>{byId('description-count').textContent=`${e.target.value.length} / 1,200 ตัวอักษร`;if(e.target.getAttribute('aria-invalid')==='true')revalidate('description');};
    byId('evidence').onchange=e=>{const file=e.target.files[0];if(!file)return;
      if(evidence?.url){URL.revokeObjectURL(evidence.url);urls.delete(evidence.url);}
      evidence=null;byId('evidence-preview').textContent='ยังไม่ได้เลือกไฟล์';
      if(!['image/jpeg','image/png','application/pdf'].includes(file.type)||file.size<1||file.size>2*1024*1024){byId('evidence-error').textContent='เลือก JPG, PNG หรือ PDF ขนาดไม่เกิน 2 MB';e.target.value='';return;}
      const url=URL.createObjectURL(file);urls.add(url);evidence={name:file.name,type:file.type,size:file.size,url};
      revalidate('evidence');
      byId('evidence-error').textContent='';byId('evidence-preview').innerHTML=`${esc(file.name)} · ${(file.size/1024).toFixed(0)} KB${file.type.startsWith('image/')?`<img class="evidence-image" alt="ตัวอย่างหลักฐานที่เลือก" src="${url}">`:'<p>เลือก PDF แล้ว · โหมดสาธิตแสดงชื่อไฟล์เท่านั้น</p>'}`;
    };
    byId('cancel-submit').onclick=()=>{saveDraft();view='records';render(true);};
    byId('deed-form').onsubmit=e=>{e.preventDefault();if(busy)return;saveDraft();const payload={...draft,evidence};const errors=model.validateDraft(payload);
      for(const key of ['categoryId','activityDate','hours','description','evidence','confirmed']){byId(key+'-error').textContent=errors[key]||'';byId(key).setAttribute('aria-invalid',String(Boolean(errors[key])));byId(key).setAttribute('aria-describedby',key+'-error');}
      if(Object.keys(errors).length){byId('form-error').textContent='ยังส่งไม่ได้ กรุณาตรวจช่องที่ระบุด้านล่าง';byId(Object.keys(errors)[0])?.focus();return;}
      busy=true;try{const result=store.submit(payload,requestId);receipt='ส่งรายการตัวอย่างแล้ว · รออาจารย์ตรวจ';selected=result.deed.deedId;draft={};evidence=null;requestId='';view='detail';render(true);}catch(error){byId('form-error').textContent=errorText[error.code]||'ยังบันทึกรายการไม่ได้';}finally{busy=false;}
    };
  }
  function detail(){
    const d=store.record(selected),canReview=role==='teacher'&&d.status==='pending';
    return `<section class="panel"><div class="panel-head"><div><p class="eyebrow">รายละเอียดรายการ</p><h2>${esc(ui.categories[d.categoryId])}</h2><p>${esc(d.deedId)}</p></div><button id="back-list" class="btn btn-secondary">กลับไปรายการ</button></div><div class="panel-body"><div class="detail-grid"><section><span class="gateway-status status-${d.status}">${esc(ui.statuses[d.status])}</span><h3 class="section-title">${d.hours} ชั่วโมง · ${esc(date(d.activityDate))}</h3><p class="detail-description">${esc(d.description)}</p><dl><dt>ผู้บันทึก</dt><dd>นักเรียนตัวอย่าง</dd><dt>ส่งรายการ</dt><dd>${esc(date(d.submittedAt))}</dd>${d.reviewedAt?`<dt>ตรวจรับรอง</dt><dd>${esc(date(d.reviewedAt))}</dd>`:''}</dl>${d.note?`<div class="gateway-notice"><strong>ข้อเสนอแนะจากผู้ตรวจ</strong><p>${esc(d.note)}</p></div>`:''}</section><section class="evidence-panel"><h3>หลักฐานประกอบ</h3>${d.evidence?`<p class="evidence-filename">${esc(d.evidence.name)}</p>${d.evidence.synthetic?'<p class="muted">ตัวอย่างตำแหน่งแสดงหลักฐาน ไม่มีเอกสารบุคคลจริง</p>':d.evidence.type.startsWith('image/')&&d.evidence.url?`<img class="evidence-image" src="${esc(d.evidence.url)}" alt="หลักฐานที่เลือกในโหมดสาธิต">`:'<p class="muted">ไฟล์ PDF ที่เลือก · ไม่อัปโหลดในโหมดสาธิต</p>'}`:'<p class="muted">ไม่มีไฟล์จริงในชุดตัวอย่างนี้</p>'}<p class="login-note">ระบบจริงต้องตรวจสิทธิ์ก่อนเข้าถึงไฟล์ทุกครั้ง</p></section></div>${canReview?reviewForm():`<div class="gateway-notice notice-info">${d.status==='pending'?'รายการอยู่ในคิวตัวอย่าง สามารถเลือกมุมมองอาจารย์เพื่อทดลองตรวจและลงนาม':'รายการนี้มีผลตรวจแล้ว การเปิดดูซ้ำไม่เพิ่มชั่วโมง'}</div>`}</div></section>`;
  }
  function reviewForm(){
    challenge=store.beginReview(selected);signature={distance:0,points:0};
    return `<form id="review-form"><h3 class="section-title">ผลการตรวจรับรอง</h3><div id="review-error" class="form-error" role="alert"></div><div class="decision-row"><label><input name="decision" type="radio" value="approved" checked>อนุมัติ</label><label><input name="decision" type="radio" value="rejected">ไม่อนุมัติ</label></div><div class="field"><label for="review-note">เหตุผล / ข้อเสนอแนะ</label><textarea id="review-note" name="note" maxlength="600" placeholder="ระบุเหตุผลหากไม่อนุมัติ"></textarea></div><h3 class="section-title">ลงนามรับรองครั้งนี้</h3><p class="muted">วาดลายเส้นตัวอย่างในกรอบ ไม่ใช้ลายเซ็นจริงของคุณในโหมดสาธิต</p><div class="signature-wrap"><canvas id="signature" width="900" height="240" tabindex="0" aria-label="กรอบวาดลายเซ็นตัวอย่าง ใช้เมาส์หรือนิ้ววาด"></canvas><div class="signature-tools"><span id="signature-status" role="status">ยังไม่ได้ลงนาม · กรอบใหม่ทุกครั้ง</span><button id="clear-signature" type="button" class="btn btn-secondary">ล้างลายเส้น</button></div></div><p class="login-note">แบบจำลองนี้ทดสอบขั้นตอนการลงนามเท่านั้น ระบบจริงต้องยืนยันผู้ลงนามและหลักฐานฝั่งเซิร์ฟเวอร์</p><div class="actions"><button class="btn btn-primary" type="submit">บันทึกผลตรวจตัวอย่าง</button></div></form>`;
  }
  function bindDetail(){
    byId('back-list').onclick=()=>{view=role==='teacher'?'review':'records';receipt='';render(true);};
    const form=byId('review-form');if(!form)return;
    const canvas=byId('signature'),ctx=canvas.getContext('2d');let last=null,activePointer=null;
    ctx.strokeStyle='#132b49';ctx.lineWidth=3;ctx.lineCap='round';
    const point=e=>{const rect=canvas.getBoundingClientRect();return {x:(e.clientX-rect.left)*canvas.width/rect.width,y:(e.clientY-rect.top)*canvas.height/rect.height};};
    canvas.onpointerdown=e=>{if(activePointer!==null||(e.button!==0&&e.pointerType==='mouse'))return;e.preventDefault();activePointer=e.pointerId;last=point(e);canvas.setPointerCapture(e.pointerId);signature.points++;};
    canvas.onpointermove=e=>{if(!last||e.pointerId!==activePointer)return;const next=point(e);ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(next.x,next.y);ctx.stroke();signature.distance+=Math.hypot(next.x-last.x,next.y-last.y);signature.points++;last=next;byId('signature-status').textContent=signature.distance>=24&&signature.points>=5?'มีลายเส้นตัวอย่างแล้ว':'กรุณาวาดลายเส้นให้ครบ';};
    const end=e=>{if(e.pointerId===activePointer){last=null;activePointer=null;}};canvas.onpointerup=end;canvas.onpointercancel=end;canvas.onlostpointercapture=end;
    byId('clear-signature').onclick=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);signature={distance:0,points:0};last=null;activePointer=null;byId('signature-status').textContent='ล้างแล้ว กรุณาวาดใหม่';};
    form.onsubmit=e=>{e.preventDefault();if(busy)return;busy=true;
      try{store.review(selected,form.elements.decision.value,{challenge,...signature,note:byId('review-note').value});receipt='บันทึกผลตรวจตัวอย่างแล้ว';challenge='';render(true);}catch(error){byId('review-error').textContent=errorText[error.code]||'ยังบันทึกผลตรวจไม่ได้';}finally{busy=false;}
    };
  }
  window.addEventListener('pagehide',event=>{if(!event.persisted)urls.forEach(url=>URL.revokeObjectURL(url));});
  render();
})();
