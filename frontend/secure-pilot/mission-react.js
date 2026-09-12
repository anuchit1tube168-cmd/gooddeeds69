/* React mission views reuse authenticated projections; never fetch or authorize. */
(function(root){
  'use strict';
  let mounted=null;
  function Dashboard({data,card,view,onView,onCategory,onOpen,items}) {
    const h=root.React.createElement, [category,setCategory]=root.React.useState(5);
    const names=root.GoodDeedUI.categories, number=value=>value===null?'ยังไม่มีข้อมูล':value.toLocaleString('th-TH');
    const scope=data.demo?'ข้อมูลสาธิตเท่านั้น':data.partial?'เฉพาะรายการที่โหลดล่าสุด ไม่ใช่ยอดรวมทางการ':'รายการในขอบเขตที่ยืนยันแล้ว';
    const button=(text,action,extra={})=>h('button',{type:'button',className:'btn btn-secondary',onClick:action,...extra},text);
    const section=(title,subtitle,body,extra={})=>h('section',{className:'panel mission-panel',...extra},h('div',{className:'panel-head'},h('div',null,h('h2',null,title),h('p',null,subtitle))),h('div',{className:'panel-body'},body));
    function radar(){
      const selected=data.categories.find(c=>c.id===category), max=Math.max(1,...data.categories.map(c=>c.hours));
      return section('Good Deed Radar','แตะหมวดเพื่อดูภารกิจและชั่วโมงที่อนุมัติ • '+scope,
        h(root.React.Fragment,null,
          h('div',{className:'radar-grid',role:'group','aria-label':'ชั่วโมงอนุมัติแยกตามหมวด'},data.categories.map(c=>h('button',{key:c.id,type:'button',className:'radar-category'+(category===c.id?' is-selected':''),'aria-pressed':category===c.id,onClick:()=>setCategory(c.id)},
            h('span',{className:'radar-ring',style:{'--share':(c.hours/max*100)+'%'},'aria-hidden':true},h('span',null,number(c.hours))),h('span',null,'หมวด '+c.id),h('small',null,names[c.id])))),
          h('div',{className:'radar-detail','aria-live':'polite'},h('p',{className:'eyebrow'},'หมวด '+selected.id),h('h3',null,names[selected.id]),h('p',null,selected.count+' ภารกิจ · '+number(selected.hours)+' ชม. อนุมัติ · '+selected.pending+' รอตรวจ'),h('p',{className:'muted'},selected.latest?selected.latest.description:'ยังไม่มีภารกิจในหมวดนี้'),button('ดูภารกิจหมวดนี้',()=>onCategory(selected.id))),
          h('p',{className:'chart-note'},'วงแสดงสัดส่วนเทียบหมวดที่มีชั่วโมงมากที่สุดในรายการที่โหลด ไม่ใช่เพดานหรือคะแนนประเมิน')));
    }
    function analytics(){
      const max=Math.max(1,...data.monthly.map(m=>m.hours)), cumulativeMax=Math.max(1,...data.monthly.map(m=>m.cumulative));
      return section('สถิติความดี','6 เดือนล่าสุด • '+scope,h(root.React.Fragment,null,
        h('h3',{className:'chart-title'},'ชั่วโมงที่อนุมัติ แยกตามเดือนกิจกรรม'),
        h('div',{className:'month-chart'},data.monthly.map(m=>h('div',{className:'month-bar',key:m.key},h('span',null,number(m.hours)),h('progress',{value:m.hours,max,'aria-label':m.label+' '+number(m.hours)+' ชั่วโมง'}),h('small',null,m.label)))),
        h('h3',{className:'chart-title'},'แนวโน้มสะสมใน 6 เดือนที่แสดง'),h('ol',{className:'cumulative-list'},data.monthly.map(m=>h('li',{key:m.key},h('span',null,m.label),h('progress',{value:m.cumulative,max:cumulativeMax,'aria-label':m.label+' สะสม '+number(m.cumulative)+' ชั่วโมง'}),h('b',null,number(m.cumulative)+' ชม.')))),
        h('p',{className:'chart-note'},'ไม่รวมยอดยกมา และไม่นำมาแทนยอดทะเบียนกลาง'+(data.undatedApproved?' • '+data.undatedApproved+' รายการไม่มีวันที่ที่ตรวจสอบได้':''))));
    }
    function goal(){return section('เป้าหมายของปีนี้','เติบโตทีละภารกิจ',data.goal?h(root.React.Fragment,null,
      h('div',{className:'goal-reading'},h('strong',null,data.goal.percent+'%'),h('span',null,number(data.goal.approvedHours)+' / '+number(data.goal.targetHours)+' ชม.')),
      h('progress',{className:'goal-progress',value:data.goal.approvedHours,max:data.goal.targetHours,'aria-label':'ความคืบหน้าเป้าหมาย'}),
      h('p',null,data.goal.remaining?'อีก '+number(data.goal.remaining)+' ชั่วโมงถึงเป้าหมาย':'ถึงเป้าหมายแล้ว ขอบคุณที่ดูแลส่วนรวม'),h('small',null,data.goal.periodLabel),
      h('p',{className:'chart-note'},data.demo?'เป้าหมายสมมติ ไม่มีผลต่อเกณฑ์ราชการ':'ชั่วโมงที่อนุมัติในช่วงเป้าหมายที่ยืนยันแล้ว')):
      h('div',{className:'empty-goal'},h('h3',null,'รอยืนยันเป้าหมายประจำปี'),h('p',null,'ติดตามชั่วโมงตามทะเบียนได้ตามปกติ เป้าหมายจะแสดงเมื่อวิทยาลัยยืนยันเกณฑ์และช่วงปีการศึกษา')));}
    function recent(){return section('ภารกิจล่าสุด','ทุกการลงมือทำมีความหมาย',h(root.React.Fragment,null,
      items.filter(r=>r.status!=='draft').slice(0,3).map(r=>h('article',{className:'recent-mission',key:r.deedId},h('p',{className:'record-category'},names[r.categoryId]),h('button',{type:'button',className:'record-link',onClick:()=>onOpen(r.deedId)},r.description||'ดูภารกิจ'),h('div',{className:'recent-meta'},h('span',{className:'gateway-status status-'+r.status},root.GoodDeedUI.statuses[r.status]||'รอตรวจสอบ'),h('strong',null,r.hours+' ชม.')))),
      !items.length?h('p',null,'เริ่มบันทึกกิจกรรมที่ได้ทำ แล้วติดตามผลได้ที่นี่'):null,button('ดูภารกิจทั้งหมด',()=>onView('records'))));}
    function profile(){return section('โปรไฟล์ของฉัน','ข้อมูลจากบัญชีที่เชื่อมกับทะเบียน',h(root.React.Fragment,null,
      h('dl',{className:'profile-details'},['ชื่อ',card.displayName,'รหัสนักเรียน',card.studentId||'ยังไม่มีข้อมูล','ชั้นปี / รุ่น',card.cohortLabel||'ยังไม่มีข้อมูล','สถานะ',data.demo?'บัญชีตัวอย่าง':'เชื่อมบัญชีนักเรียนแล้ว','ผลการประเมิน',data.demo?'ตัวอย่างเท่านั้น':card.passed?'ผ่านเกณฑ์':'ยังไม่ผ่านเกณฑ์'].map((value,i)=>h(i%2?'dd':'dt',{key:i},value))),
      h('p',{className:'chart-note'},'หากข้อมูลไม่ตรง กรุณาติดต่ออาจารย์ผู้ดูแลเพื่อแก้ไขทะเบียนกลาง')));}
    if(view==='profile')return profile();
    if(view==='radar')return radar();
    if(view==='analytics')return h('div',{className:'mission-columns'},analytics(),goal());
    return h(root.React.Fragment,null,
      h('div',{className:'mission-heading'},h('div',null,h('p',{className:'eyebrow'},'GOOD DEED MISSION CONTROL'),h('h2',null,'ภาพรวมภารกิจความดี'),h('p',null,'เดือนนี้คุณทำความดีแล้ว '+data.monthCount+' ภารกิจ'+(data.partial?' ในรายการที่โหลด':''))),button('บันทึกความดี',()=>onView('submit'),{className:'btn btn-primary'})),
      h('div',{className:'mission-columns'},radar(),h('div',{className:'mission-stack'},goal(),recent())),
      h('section',{className:'achievement-strip','aria-label':'หมุดหมายความดี'},h('h3',null,'หมุดหมายเล็ก ๆ ที่น่าภูมิใจ'),h('div',null,data.achievements.map(a=>h('span',{className:'achievement'+(a.earned?' earned':''),key:a.label},a.label,h('small',null,a.earned?'ถึงหมุดหมายแล้ว':'ค่อย ๆ ก้าวไปด้วยกัน')))),h('p',{className:'chart-note'},'อ้างอิงชั่วโมงรับรอง ไม่มีแต้ม เหรียญ หรือผลต่อเกณฑ์ราชการ')));
  }
  function unmount(){if(mounted){mounted.unmount();mounted=null;}}
  function mount(node,props){unmount();if(!node||!root.React||!root.ReactDOM)return;mounted=root.ReactDOM.createRoot(node);mounted.render(root.React.createElement(Dashboard,props));}
  root.GoodDeedMission=Object.freeze({mount,unmount});
})(window);
