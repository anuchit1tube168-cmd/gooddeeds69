// No browser, DOM engine or network. Exercises controller callbacks with small
// input/output doubles; this does not verify layout, dialog focus traps or LIFF.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup(){
  const decode=s=>String(s||'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
  const callbacks=new Map(),revoked=[],pads={};let timer=0,latest=null,store;
  function element(tag,attrs={},contents=''){
    const node={tagName:tag.toUpperCase(),id:attrs.id||'',name:attrs.name||'',type:attrs.type||'',value:decode(attrs.value||''),checked:'checked' in attrs,hidden:'hidden' in attrs,disabled:'disabled' in attrs,dataset:{},children:[],textContent:'',attributes:{...attrs},classList:{add(){},remove(){}},focus(){},scrollIntoView(){},showModal(){this.open=true;},setAttribute(k,v){this.attributes[k]=v;},getAttribute(k){return this.attributes[k]??null;}};
    Object.entries(attrs).forEach(([k,v])=>{if(k.startsWith('data-'))node.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=decode(v);});
    Object.defineProperty(node,'innerHTML',{get(){return this.html||'';},set(html){this.html=html;this.children=parse(html);}});
    if(tag==='textarea')node.value=decode(contents);
    if(tag==='select'){const selected=contents.match(/<option\b[^>]*value="([^"]*)"[^>]*selected/);node.value=selected?decode(selected[1]):decode((contents.match(/<option\b[^>]*value="([^"]*)"/)||[])[1]);}
    Object.defineProperty(node,'elements',{get(){const inputs=all().filter(n=>n.name),group={};inputs.forEach(input=>{if(input.type!=='radio')group[input.name]=input;});for(const name of new Set(inputs.filter(n=>n.type==='radio').map(n=>n.name))){Object.defineProperty(group,name,{value:{get value(){return inputs.find(n=>n.name===name&&n.checked)?.value;},set value(v){inputs.filter(n=>n.name===name).forEach(n=>n.checked=n.value===v);}}});}return group;}});
    node.querySelectorAll=selector=>select(flatten(node.children),selector);
    return node;
  }
  function parse(html){
    const nodes=[];
    for(const match of html.matchAll(/<(button|input|select|textarea|canvas|form|dialog|div|span|small|p|progress|aside|a)\b([^>]*)>/g)){
      const attrs={};for(const a of match[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g))attrs[a[1]]=a[2]||'';
      const tail=html.slice(match.index+match[0].length),contents=tail.slice(0,tail.indexOf('</'+match[1]+'>'));
      nodes.push(element(match[1],attrs,contents));
    }
    return nodes;
  }
  const flatten=nodes=>nodes.flatMap(n=>[n,...flatten(n.children)]),root=element('div',{id:'app'}),all=()=>flatten(root.children);
  function select(nodes,selector){const data=selector.match(/^\[data-([\w-]+)\]$/);return data?nodes.filter(n=>n.attributes['data-'+data[1]]!==undefined):[];}
  const document={body:{classList:{add(){},remove(){}}},getElementById:id=>id==='app'?root:all().find(n=>n.id===id)||null};
  const window={addEventListener(){},GoodDeedMission:{mount(node,props){if(node)latest=props;},unmount(){}},GoodDeedKindness:{mount(){},unmount(){}},GoodDeedSignature:{bind(options){pads[options.canvas.id]=options;options.clear.onclick=()=>options.onChange({distance:0,points:0,strokes:[]});}}};
  const context=vm.createContext({window,document,Intl,Date,Uint8Array,URL:{createObjectURL:()=>'blob:synthetic/'+(++timer),revokeObjectURL:url=>revoked.push(url)},setTimeout:fn=>{const id=++timer;callbacks.set(id,fn);return id;},clearTimeout:id=>callbacks.delete(id)});
  for(const file of ['frontend/gooddeed-ui.js','frontend/secure-pilot/mission-data.js','frontend/secure-pilot/workflow.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
  const model=window.GoodDeedDemo;window.GoodDeedDemo={...model,createDemoStore:()=>store=model.createDemoStore()};
  vm.runInContext(fs.readFileSync('frontend/secure-pilot/demo.js','utf8'),context);
  const node=id=>{const n=document.getElementById(id);assert.ok(n,'Missing controller element '+id);return n;};
  return {root,node,store,revoked,pads,nav:view=>{const n=all().find(n=>n.dataset.view===view);assert.ok(n,'Missing navigation '+view);n.onclick();},open:id=>latest.onOpen(id),role:value=>node('demo-role').onchange({target:{value}}),
    sign:id=>pads[id].onChange({distance:40,points:6,strokes:[]}),submit:()=>node('deed-form').onsubmit({preventDefault(){}}),review:()=>node('review-form').onsubmit({preventDefault(){}}),
    flush(){const pending=[...callbacks.values()];callbacks.clear();pending.forEach(fn=>fn());},set(values){Object.entries(values).forEach(([id,value])=>{if(id==='confirmed')node(id).checked=value;else node(id).value=value;});},
    file:async(bytes=[137,80,78,71,13,10,26,10])=>node('evidence').onchange({target:{files:[{name:'synthetic.png',type:'image/png',size:120,slice:()=>({arrayBuffer:async()=>Uint8Array.from(bytes).buffer})}]}})};
}
function fill(h){h.set({categoryId:'5',hours:'2.5',activityDate:'2026-09-10',description:'กิจกรรมจำลองตรวจขั้นตอนผ่านฟอร์ม',confirmed:true});}
test('submission controller saves draft, validates signature and returns the saved Mission ID',async()=>{
  const h=setup();h.nav('submit');assert.equal(h.node('deed-dialog').open,true);fill(h);await h.file();h.submit();assert.match(h.node('studentSignature-error').textContent,/ลายเส้น/);
  assert.equal(h.store.snapshot().card.totalHours,15.5);h.sign('studentSignature');h.submit();
  const created=h.store.snapshot().items.find(r=>r.deedId.startsWith('demo_form_'));
  assert.equal(created.status,'pending');assert.match(h.root.innerHTML,/ส่งภารกิจความดีเรียบร้อยแล้ว/);assert.ok(h.root.innerHTML.includes(created.deedId));assert.equal(h.store.snapshot().card.totalHours,15.5);
});
test('closing and reopening an autosaved draft preserves intentionally blank hours',()=>{
  const h=setup();h.nav('submit');fill(h);h.set({hours:''});h.node('hours').oninput();h.flush();h.node('close-sheet').onclick();
  const draft=h.store.snapshot().items.find(r=>r.status==='draft');assert.equal(draft.hours,'');h.open(draft.deedId);assert.equal(h.node('hours').value,'');assert.equal(h.node('description').value,'กิจกรรมจำลองตรวจขั้นตอนผ่านฟอร์ม');
});
test('invalid replacement evidence cannot leave the previous file attached',async()=>{
  const h=setup();h.nav('submit');fill(h);await h.file();const old=h.store.snapshot().items.find(r=>r.status==='draft').evidence.url;
  await h.file([60,115,99,114,105,112,116]);assert.equal(h.store.snapshot().items.find(r=>r.status==='draft').evidence,null);assert.ok(h.revoked.includes(old));assert.match(h.node('evidence-error').textContent,/ไม่ตรง/);
  h.sign('studentSignature');h.submit();assert.match(h.node('evidence-error').textContent,/หลักฐาน/);assert.equal(h.store.snapshot().card.totalHours,15.5);
});
test('teacher selection and preparation do not approve until explicit per-mission confirmation',()=>{
  const h=setup();h.role('teacher');h.open('demo_volunteer_1');h.sign('signature');h.review();
  assert.equal(h.store.record('demo_volunteer_1').status,'pending');assert.equal(h.node('review-confirm').hidden,false);assert.equal(h.store.snapshot().card.totalHours,15.5);
  const confirm=h.node('confirm-review').onclick;confirm();assert.equal(h.store.record('demo_volunteer_1').status,'approved');assert.equal(h.store.snapshot().card.totalHours,17.5);
  confirm();assert.equal(h.store.snapshot().card.totalHours,17.5);assert.equal(h.store.snapshot().outbox.length,1);
});
test('changing a prepared review invalidates the old confirmation callback',()=>{
  const h=setup();h.role('teacher');h.open('demo_volunteer_1');h.sign('signature');h.review();const old=h.node('confirm-review').onclick;
  h.node('review-note').value='เปลี่ยนผลตรวจ';h.node('review-form').oninput();old();assert.equal(h.store.record('demo_volunteer_1').status,'pending');assert.equal(h.store.snapshot().card.totalHours,15.5);
});
test('student can revise a rejected mission and retain its earlier review timeline',async()=>{
  const h=setup();h.open('demo_religious_3');h.node('revise-mission').onclick();fill(h);await h.file();h.sign('studentSignature');h.submit();
  const revised=h.store.record('demo_religious_3');assert.equal(revised.status,'pending');assert.equal(revised.revision,2);assert.match(h.root.innerHTML,/แก้ไขและส่งใหม่/);assert.match(revised.revisions[0].note,/หลักฐาน/);
});
