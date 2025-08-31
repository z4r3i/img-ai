// فایل: src/worker.ts
// چرا: HTML داخلی تا نیاز به هاست استاتیک نباشد.

export interface Env {
AI: any; // Workers AI binding
OUTPUT\_SIZE: string; // مثل "768x768"
}

const ALLOWED\_ORIGINS = \["\*"]; // در صورت نیاز محدود کنید

function json(data: unknown, init: ResponseInit = {}) {
return new Response(JSON.stringify(data), {
headers: { "Content-Type": "application/json", ...(init.headers || {}) },
...init,
});
}

function corsHeaders(origin: string | null) {
const allow = ALLOWED\_ORIGINS.includes("*") || (origin && ALLOWED\_ORIGINS.includes(origin))
? origin || "*"
: "null";
return {
"Access-Control-Allow-Origin": allow,
"Access-Control-Allow-Methods": "GET,POST,OPTIONS",
"Access-Control-Allow-Headers": "Content-Type",
} as Record\<string, string>;
}

async function handleInpaint(req: Request, env: Env): Promise<Response> {
const ct = req.headers.get("content-type") || "";
if (!ct.includes("application/json")) {
return json({ error: "content-type must be application/json" }, { status: 415 });
}
const body = await req.json().catch(() => null);
if (!body) return json({ error: "invalid json" }, { status: 400 });

const prompt = String(body.prompt || "").slice(0, 2000);
const image = String(body.image || "");
const mask = String(body.mask || "");
const size = String(body.size || env.OUTPUT\_SIZE || "768x768");
const strength = Number(body.strength ?? 0.85);

if (!prompt || !image || !mask) {
return json({ error: "prompt, image and mask are required" }, { status: 400 });
}

const inputs: Record\<string, unknown> = {
prompt,
image,
mask,
strength,
num\_steps: 25,
guidance: 7.5,
seed: Math.floor(Math.random() \* 1e9),
image\_size: size,
};

try {
const result = await env.AI.run(
"@cf/runwayml/stable-diffusion-v1-5-inpainting",
inputs
);
if (result?.image && typeof result.image === "string") {
return json({ image: result.image });
}
if (result instanceof ArrayBuffer) {
const base64 = await arrayBufferToDataUrl(result, "image/png");
return json({ image: base64 });
}
return json({ error: "unexpected model response", result }, { status: 502 });
} catch (err: any) {
return json({ error: err?.message || String(err) }, { status: 500 });
}
}

async function arrayBufferToDataUrl(buf: ArrayBuffer, mime: string) {
const bytes = new Uint8Array(buf);
let binary = "";
for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes\[i]);
const b64 = btoa(binary);
return `data:${mime};base64,${b64}`;
}

function html(): string {
return /\* html \*/ \`<!doctype html>

<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Workers AI – Inpainting</title>
  <style>
    body{font-family: ui-sans-serif,system-ui; margin:0; padding:2rem; background:#0b1320; color:#e6edf3}
    .card{max-width:1100px; margin:0 auto; background:#111827; border:1px solid #1f2937; border-radius:16px; padding:1rem 1.25rem}
    .row{display:grid; grid-template-columns:1fr 1fr; gap:1rem}
    label{font-size:.9rem; opacity:.9}
    input[type="text"], select{width:100%; padding:.6rem .7rem; border-radius:10px; border:1px solid #374151; background:#0f172a; color:#e6edf3}
    canvas, img{width:100%; border-radius:12px; background:#0f172a; border:1px dashed #374151}
    .toolbar{display:flex; gap:.5rem; align-items:center; margin:.5rem 0}
    button{background:#3b82f6; color:#fff; border:none; padding:.6rem .9rem; border-radius:10px; cursor:pointer}
    button.secondary{background:#374151}
    .out{display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-top:1rem}
    .muted{opacity:.8; font-size:.85rem}
    .footer{opacity:.7; font-size:.8rem; margin-top:1rem; text-align:center}
  </style>
</head>
<body>
  <div class="card">
    <h2>Inpainting با Workers AI</h2>
    <p class="muted">تصویر را بارگذاری کن، با قلم روی بخش‌هایی که می‌خواهی تغییر کنند <b>سفید</b> نقاشی کن، سپس پرامپت را بنویس و Generate را بزن.</p>

```
<div class="row">
  <div>
    <label>تصویر ورودی</label>
    <input type="file" id="imageInput" accept="image/*" />
    <div class="toolbar">
      <button id="brushSmall">قلم 10</button>
      <button id="brushMed">قلم 25</button>
      <button id="brushBig">قلم 50</button>
      <button id="eraser" class="secondary">پاک‌کن</button>
      <button id="clearMask" class="secondary">پاک‌سازی ماسک</button>
    </div>
    <canvas id="mask" height="512"></canvas>
  </div>
  <div>
    <label>پرامپت</label>
    <input type="text" id="prompt" placeholder="مثلاً: تغییر پس‌زمینه به ساحل آفتابی" />
    <div class="toolbar">
      <label>خروجی:</label>
      <select id="size">
        <option>512x512</option>
        <option selected>768x768</option>
        <option>1024x1024</option>
      </select>
      <label style="margin-inline-start:.5rem">Strength</label>
      <select id="strength">
        <option value="0.6">0.6</option>
        <option value="0.75" selected>0.75</option>
        <option value="0.9">0.9</option>
      </select>
      <button id="gen">Generate</button>
    </div>
    <div class="out">
      <div>
        <label>پیش‌نمایش تصویر</label>
        <img id="preview" alt="preview" />
      </div>
      <div>
        <label>خروجی</label>
        <img id="result" alt="result" />
      </div>
    </div>
  </div>
</div>

<div class="footer">Model: @cf/runwayml/stable-diffusion-v1-5-inpainting</div>
```

  </div>

<script>
// جاوااسکریپت UI برای بارگذاری تصویر و ماسک
const imgEl = document.getElementById('preview');
const canvas = document.getElementById('mask');
const ctx = canvas.getContext('2d');
const input = document.getElementById('imageInput');
const genBtn = document.getElementById('gen');
const promptEl = document.getElementById('prompt');
const resultEl = document.getElementById('result');
const sizeSel = document.getElementById('size');
const strengthSel = document.getElementById('strength');

let brush = 25; let draw = false; let erase = false; let imgW=0, imgH=0;

function fitHeight(w,h,maxH){ const r = maxH / h; return {w: Math.round(w*r), h: Math.round(h*r)}; }

input.addEventListener('change', async (e)=>{
  const file = e.target.files?.[0]; if(!file) return;
  const url = URL.createObjectURL(file);
  const img = new Image(); img.onload = ()=>{
    const s = fitHeight(img.width, img.height, 512); imgW = s.w; imgH = s.h;
    canvas.width = imgW; canvas.height = imgH;
    ctx.fillStyle = '#000'; ctx.fillRect(0,0,canvas.width,canvas.height);
    imgEl.src = url; imgEl.style.width = imgW+'px';
  }; img.src = url;
});

function pos(e){
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * (canvas.width / r.width);
  const y = (e.clientY - r.top) * (canvas.height / r.height);
  return {x,y};
}

['mousedown','touchstart'].forEach(ev=>canvas.addEventListener(ev, ()=>{ draw=true; }));
['mouseup','mouseleave','touchend'].forEach(ev=>canvas.addEventListener(ev, ()=>{ draw=false; ctx.beginPath(); }));

canvas.addEventListener('mousemove', (e)=>{
  if(!draw) return; const {x,y}=pos(e);
  ctx.globalCompositeOperation = erase ? 'destination-out' : 'source-over';
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x,y,brush,0,Math.PI*2); ctx.fill();
});

brushSmall.onclick=()=>brush=10; brushMed.onclick=()=>brush=25; brushBig.onclick=()=>brush=50; eraser.onclick=()=>erase=!erase; clearMask.onclick=()=>{ctx.fillStyle='#000'; ctx.fillRect(0,0,canvas.width,canvas.height);} 

async function toDataUrl(file){ return new Promise((res)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(file); }); }

async function generate(){
  const file = input.files?.[0]; if(!file) { alert('تصویر را بارگذاری کنید'); return; }
  const image = await toDataUrl(file);
  const mask = canvas.toDataURL('image/png');
  genBtn.disabled = true; genBtn.textContent = 'Generating...';
  try{
    const r = await fetch('/api/inpaint', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ prompt: promptEl.value, image, mask, size: sizeSel.value, strength: Number(strengthSel.value) })
    });
    const data = await r.json();
    if(!r.ok) throw new Error(data.error||'request failed');
    resultEl.src = data.image;
  }catch(err){ alert(err.message||err); }
  finally{ genBtn.disabled=false; genBtn.textContent='Generate'; }
}

genBtn.addEventListener('click', generate);
</script>

</body>
</html>`;
}

export default {
async fetch(req: Request, env: Env): Promise<Response> {
const url = new URL(req.url);
const origin = req.headers.get("Origin");

```
if (req.method === "OPTIONS") {
  return new Response(null, { headers: corsHeaders(origin) });
}

if (req.method === "GET" && url.pathname === "/") {
  return new Response(html(), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

if (req.method === "POST" && url.pathname === "/api/inpaint") {
  const res = await handleInpaint(req, env);
  const headers = corsHeaders(origin);
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
}

return json({ error: "not found" }, { status: 404 });
```

},
};
