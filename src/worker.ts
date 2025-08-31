// فایل: src/worker.ts
// چرا: HTML داخلی تا نیاز به هاست استاتیک نباشد.


export interface Env {
AI: any; // Workers AI binding
OUTPUT_SIZE: string; // مثل "768x768"
}


const ALLOWED_ORIGINS = ["*"]; // در صورت نیاز محدود کنید


function json(data: unknown, init: ResponseInit = {}) {
return new Response(JSON.stringify(data), {
headers: { "Content-Type": "application/json", ...(init.headers || {}) },
...init,
});
}


function corsHeaders(origin: string | null) {
const allow = ALLOWED_ORIGINS.includes("*") || (origin && ALLOWED_ORIGINS.includes(origin))
? origin || "*"
: "null";
return {
"Access-Control-Allow-Origin": allow,
"Access-Control-Allow-Methods": "GET,POST,OPTIONS",
"Access-Control-Allow-Headers": "Content-Type",
} as Record<string, string>;
}


async function handleInpaint(req: Request, env: Env): Promise<Response> {
// چرا: جلوگیری از ورودی خراب/بزرگ
const ct = req.headers.get("content-type") || "";
if (!ct.includes("application/json")) {
return json({ error: "content-type must be application/json" }, { status: 415 });
}
const body = await req.json().catch(() => null);
if (!body) return json({ error: "invalid json" }, { status: 400 });


const prompt = String(body.prompt || "").slice(0, 2000);
const image = String(body.image || "");
const mask = String(body.mask || "");
const size = String(body.size || env.OUTPUT_SIZE || "768x768");
const strength = Number(body.strength ?? 0.85); // 0..1


if (!prompt || !image || !mask) {
return json({ error: "prompt, image and mask are required" }, { status: 400 });
}


// ورودی‌ها: داده URL یا لینک مستقیم
// مدل نیازمند ماسک با پس‌زمینه سیاه و ناحیه سفید است؛ در UI همین را تولید می‌کنیم.
const inputs: Record<string, unknown> = {
prompt,
image,
mask,
strength, // چرا: کنترل میزان اعمال ویرایش
num_steps: 25,
guidance: 7.5,
seed: Math.floor(Math.random() * 1e9),
image_size: size,
};


try {
const result = await env.AI.run(
"@cf/runwayml/stable-diffusion-v1-5-inpainting",
inputs
);
// نتیجه معمولاً: { image: "data:image/png;base64,..." }
if (result?.image && typeof result.image === "string") {
return json({ image: result.image });
}


// برخی نسخه‌ها بایت خام برمی‌گردانند
if (result instanceof ArrayBuffer) {
const base64 = await arrayBufferToDataUrl(result, "image/png");
return json({ image: base64 });
return n
