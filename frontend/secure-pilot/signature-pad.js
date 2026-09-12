/* A drawing input, not identity verification. Used only by the isolated demo. */
(function(root){
  'use strict';
  function bind({canvas,status,clear,value,onChange}) {
    const ctx=canvas.getContext('2d');let last=null,pointer=null,current=value||{distance:0,points:0,strokes:[]};
    if(!Array.isArray(current.strokes))current.strokes=[];
    ctx.strokeStyle='#132b49';ctx.lineWidth=3;ctx.lineCap='round';
    const draw=(a,b)=>{ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();};
    current.strokes.forEach(stroke=>{for(let i=1;i<stroke.length;i++)draw(stroke[i-1],stroke[i]);});
    function update(){status.textContent=current.distance>=24&&current.points>=5?'มีลายเส้นตัวอย่างแล้ว':'กรุณาวาดลายเส้นตัวอย่าง';onChange(current);}
    function start(p){last=p;current.strokes.push([p]);current.points++;}
    function move(p){
      if(current.points>=4000)return;
      if(!last){start(p);return;}
      draw(last,p);current.distance+=Math.hypot(p.x-last.x,p.y-last.y);current.points++;current.strokes[current.strokes.length-1].push(p);last=p;update();
    }
    const point=e=>{const rect=canvas.getBoundingClientRect();return {x:Math.max(0,Math.min(canvas.width,(e.clientX-rect.left)*canvas.width/rect.width)),y:Math.max(0,Math.min(canvas.height,(e.clientY-rect.top)*canvas.height/rect.height))};};
    canvas.onpointerdown=e=>{if(pointer!==null||(e.button!==0&&e.pointerType==='mouse'))return;e.preventDefault();pointer=e.pointerId;start(point(e));canvas.setPointerCapture(e.pointerId);};
    canvas.onpointermove=e=>{if(last&&e.pointerId===pointer)move(point(e));};
    const end=e=>{if(e.pointerId===pointer){last=null;pointer=null;}};
    canvas.onpointerup=end;canvas.onpointercancel=end;canvas.onlostpointercapture=end;
    canvas.onkeydown=e=>{
      const vector={ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,-12],ArrowDown:[0,12]}[e.key];
      if(!vector||pointer!==null)return;e.preventDefault();if(!last)start({x:canvas.width/2,y:canvas.height/2});
      move({x:Math.max(0,Math.min(canvas.width,last.x+vector[0])),y:Math.max(0,Math.min(canvas.height,last.y+vector[1]))});
    };
    canvas.onblur=()=>{if(pointer===null)last=null;};
    clear.onclick=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);current={distance:0,points:0,strokes:[]};last=null;pointer=null;update();canvas.focus();};
    status.textContent=current.distance>=24&&current.points>=5?'มีลายเส้นตัวอย่างแล้ว':'ยังไม่ได้ลงนาม';
  }
  root.GoodDeedSignature=Object.freeze({bind});
})(window);
