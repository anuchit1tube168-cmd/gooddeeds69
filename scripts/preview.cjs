// Development preview of explicitly public pilot assets; never serves the repo.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../frontend');
const pilot = new Set(['index.html','demo.html','app.js','config.js','gateway-view.js','workflow.js','demo.js','design.css','styles.css','510903.jpg','airforce-flight.png']);
const shared = new Set(['gateway-client.js','gooddeed-ui.js']);
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.png':'image/png'};
['react-18.3.1.production.min.js','react-dom-18.3.1.production.min.js','kindness-react.js'].forEach(file=>pilot.add(file));
function resolvePublicPath(raw) {
  let pathname;
  try { pathname = decodeURIComponent(new URL(raw, 'http://preview.invalid').pathname); } catch (_) { return null; }
  if (pathname.includes('\\') || pathname.includes('..')) return null;
  const file = pathname === '/' ? 'index.html' : pathname.slice(1);
  let selected;
  if (shared.has(file)) selected = path.join(root, file);
  else if (pilot.has(file)) selected = path.join(root, 'secure-pilot', file);
  else return null;
  try { if (fs.lstatSync(selected).isSymbolicLink() || !fs.statSync(selected).isFile()) return null; } catch (_) { return null; }
  return selected;
}
function serve(req,res) {
  const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
  if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405,headers);res.end();return;}
  const comparisons=new Set(['before-login.jpg','after-login.jpg']);
  if(req.url==='/_preview/compare') {
    const html='<!doctype html><html lang="en"><meta charset="utf-8"><title>Before and after design review</title><style>body{margin:20px;background:#e9edf2;font:16px system-ui;color:#132b49}main{display:grid;grid-template-columns:1fr 1fr;gap:20px}figure{margin:0}img{display:block;width:100%;height:auto}figcaption{padding:12px;background:white}</style><main><figure><img src="/_preview/before-login.jpg" alt="Original pilot"><figcaption>Original pilot · 1363 × 936</figcaption></figure><figure><img src="/_preview/after-login.jpg" alt="Air Force redesign"><figcaption>Air Force redesign · 1363 × 936</figcaption></figure></main></html>';
    res.writeHead(200,{...headers,'Content-Type':'text/html; charset=utf-8'});res.end(req.method==='HEAD'?'':html);return;
  }
  if(req.url.startsWith('/_preview/')&&comparisons.has(req.url.slice('/_preview/'.length))) {
    const capture=path.resolve(__dirname,'../docs/design',req.url.slice('/_preview/'.length));
    if(!fs.existsSync(capture)){res.writeHead(404,headers);res.end();return;}
    res.writeHead(200,{...headers,'Content-Type':'image/jpeg'});if(req.method==='HEAD')res.end();else fs.createReadStream(capture).pipe(res);return;
  }
  // Development-only viewport harness, never an app or deployment route.
  if(req.url==='/_preview/mobile') {
    const html='<!doctype html><html lang="en"><meta charset="utf-8"><title>360px responsive preview</title><style>body{margin:0;background:#dfe4eb;display:grid;place-items:center;min-height:100vh}iframe{display:block;border:0;width:360px;height:800px;background:white}</style><iframe id="mobile-preview" title="Good Deed at 360 CSS pixels" src="/demo.html"></iframe></html>';
    res.writeHead(200,{...headers,'Content-Type':'text/html; charset=utf-8'});res.end(req.method==='HEAD'?'':html);return;
  }
  const file=resolvePublicPath(req.url);
  if(!file){res.writeHead(404,headers);res.end();return;}
  res.writeHead(200,{...headers,'Content-Type':mime[path.extname(file)],'Content-Length':fs.statSync(file).size});
  if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
}
if(require.main===module){
  const args=process.argv.slice(2), option=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
  const host=option('--host','127.0.0.1'), port=Number(option('--port','4173'));
  if(!['127.0.0.1','0.0.0.0'].includes(host)||!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid preview address');
  http.createServer(serve).listen(port,host,()=>console.log('Good Deed public pilot preview ready'));
}
module.exports={resolvePublicPath,serve};
