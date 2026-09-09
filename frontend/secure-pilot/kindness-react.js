/* React presentation island. No identity, score, storage, network or analytics. */
(function(){
  'use strict';
  if(!window.React||!window.ReactDOM)return;
  const {createElement:h,useState}=window.React;
  let mounted=null;
  const intentions=[
    {title:'ช่วยเพื่อน',detail:'แบ่งเบางานเล็ก ๆ และรับฟังกันด้วยความใส่ใจ'},
    {title:'ดูแลส่วนรวม',detail:'ช่วยจัดพื้นที่เรียนให้พร้อมและน่าใช้สำหรับทุกคน'},
    {title:'แบ่งปันความรู้',detail:'ทบทวนบทเรียนร่วมกัน หรือช่วยอธิบายสิ่งที่เพื่อนยังสงสัย'}
  ];
  function Kindness({onStart}){
    const [choice,setChoice]=useState(null),[encouraged,setEncouraged]=useState(false);
    return h('section',{className:'kindness-card','aria-labelledby':'kindness-title'},
      h('p',{className:'eyebrow'},'พื้นที่เล็ก ๆ ของความตั้งใจ'),
      h('h2',{id:'kindness-title'},'วันนี้เริ่มความดีเล็ก ๆ กันไหม'),
      h('p',{className:'kindness-intro'},'การดูแลเริ่มจากสิ่งใกล้ตัว ทุกความตั้งใจของคุณมีความหมาย'),
      h('div',{className:'intention-options',role:'group','aria-label':'เลือกความตั้งใจของวันนี้'},
        intentions.map((item,index)=>h('button',{key:item.title,type:'button',className:'intention-button'+(choice===index?' is-selected':''),'aria-pressed':choice===index,onClick:()=>{setChoice(index);setEncouraged(false);}},item.title))),
      h('div',{className:'kindness-response','aria-live':'polite'},
        h('p',null,choice===null?'เริ่มจากเรื่องเล็กที่คุณทำไหว แล้วค่อย ๆ เติบโตไปด้วยกัน':intentions[choice].detail),
        encouraged?h('p',{className:'kindness-thanks'},'ขอบคุณที่ใส่ใจตัวเองและคนรอบข้าง วันนี้คุณเริ่มต้นได้ดีแล้ว'):null),
      h('button',{type:'button',className:'btn kindness-cheer','aria-pressed':encouraged,onClick:()=>setEncouraged(!encouraged)},encouraged?'รับกำลังใจแล้ว':'ส่งกำลังใจให้ตัวเอง'),
      choice!==null?h('button',{type:'button',className:'btn btn-primary full-width kindness-start',onClick:()=>onStart?.()},'บันทึกกิจกรรมที่ได้ทำ'):null,
      h('small',{className:'kindness-note'},'ไอเดียชวนทำความดี · ชั่วโมงขึ้นอยู่กับเกณฑ์และการรับรองของวิทยาลัย')
    );
  }
  function unmount(){if(mounted){mounted.unmount();mounted=null;}}
  function mount(container,options={}){unmount();if(!container)return;mounted=window.ReactDOM.createRoot(container);mounted.render(h(Kindness,options));}
  window.GoodDeedKindness=Object.freeze({mount,unmount});
})();
