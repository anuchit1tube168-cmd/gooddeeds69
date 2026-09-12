const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('drawing pad supports keyboard input, restores strokes and clears the proof',()=>{
 let latest,draws=0;const window={},canvas={width:900,height:240,getContext:()=>({beginPath(){},moveTo(){},lineTo(){},stroke(){draws++;},clearRect(){}}),focus(){}};
 const context=vm.createContext({window});vm.runInContext(fs.readFileSync('frontend/secure-pilot/signature-pad.js','utf8'),context);
 const status={},clear={};window.GoodDeedSignature.bind({canvas,status,clear,value:{distance:0,points:0,strokes:[]},onChange:value=>latest=value});
 for(const key of ['ArrowRight','ArrowDown','ArrowRight','ArrowUp'])canvas.onkeydown({key,preventDefault(){}});
 assert.equal(latest.points,5);assert.equal(latest.distance,48);assert.equal(draws,4);
 canvas.onblur();clear.onclick();assert.equal(latest.points,0);assert.equal(latest.strokes.length,0);
});
test('preview preparation caps the longest side, releases bitmap and keeps original when compression is larger',async()=>{
 let width,height,closed=0,blobSize=100;const bitmap={width:4000,height:2000,close(){closed++;}},file={type:'image/png',size:1000};
 const canvas={getContext:()=>({drawImage(){width=canvas.width;height=canvas.height;}}),toBlob(callback){callback({type:'image/webp',size:blobSize});}};
 const window={createImageBitmap:async()=>bitmap},context=vm.createContext({window,document:{createElement:()=>canvas}});
 vm.runInContext(fs.readFileSync('frontend/secure-pilot/evidence-preview.js','utf8'),context);
 assert.equal((await window.GoodDeedEvidence.prepare(file)).size,100);assert.equal(width,1280);assert.equal(height,640);assert.equal(closed,1);
 blobSize=2000;assert.equal(await window.GoodDeedEvidence.prepare(file),file);assert.equal(closed,2);
 bitmap.width=10000;bitmap.height=10000;await assert.rejects(window.GoodDeedEvidence.prepare(file));assert.equal(closed,3);
});
test('PDF and browsers without bitmap support keep the original local file',async()=>{
 const window={},context=vm.createContext({window});vm.runInContext(fs.readFileSync('frontend/secure-pilot/evidence-preview.js','utf8'),context);
 for(const type of ['application/pdf','image/png']){const file={type,size:100};assert.equal(await window.GoodDeedEvidence.prepare(file),file);}
});
