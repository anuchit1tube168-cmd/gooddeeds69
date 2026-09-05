import fs from "node:fs";

const read = (p) => fs.readFileSync(p, "utf8");
const html = read("frontend/view_cards.html");
const js = read("frontend/view_cards.cloudflare.js");
const runtimeConfig = read("functions/runtime-config.ts");
const wrangler = read("wrangler.cards.jsonc");

const forbidden = [
  "style.css", "cloudflare-config.js", "2010948179-Ympqt2bT",
  "students_data.js", "students_photos.js", "deeds_data.js", "teachers_data.js",
  "STUDENTS_DATA", "STUDENT_PHOTOS", "DEEDS_DATA", "App.requireAuth", "App.getStudentSummary",
  "localStorage", "sessionStorage", "TELEGRAM_BOT_TOKEN", "LINE_CHANNEL_ACCESS_TOKEN",
  "fonts.googleapis.com", "fonts.gstatic.com", "umami", "__manus__", "sessionReplay", "gtag("
];

for (const marker of forbidden) {
  if (html.includes(marker) || js.includes(marker) || runtimeConfig.includes(marker)) {
    throw new Error(`forbidden view_cards marker: ${marker}`);
  }
}

if (js.includes(".innerHTML") || js.includes("insertAdjacentHTML")) {
  throw new Error("server/user data rendering must not use HTML injection APIs");
}

const requiredHtml = ["view_cards.cloudflare.css", "/runtime-config", "static.line-scdn.net/liff/edge/2/sdk.js", "view_cards.cloudflare.js"];
for (const marker of requiredHtml) if (!html.includes(marker)) throw new Error(`missing secure card dependency: ${marker}`);

const requiredRuntime = [
  "GOODDEED_LIFF_ID", "LIFF_ID: liffId", "PRODUCTION_CUTOVER: false", "WRITES_ENABLED: false",
  '"cache-control": "no-store"', "/api/gooddeed/card-self", "/auth/session", "/auth/line/verify"
];
for (const marker of requiredRuntime) if (!runtimeConfig.includes(marker)) throw new Error(`missing public runtime config invariant: ${marker}`);

const requiredJs = ["credentials: \"include\"", "getIDToken()"];
for (const marker of requiredJs) if (!js.includes(marker)) throw new Error(`missing secure card behavior: ${marker}`);

if (!wrangler.includes('"binding": "RTAFNC_GATEWAY"') || !wrangler.includes('"service": "rtafnc-one-gateway-staging"')) {
  throw new Error("Pages must use the internal RTAFNC_GATEWAY service binding");
}

for (const p of ["functions/auth/[[path]].ts", "functions/api/[[path]].ts", "functions/health.ts"]) {
  const source = read(p);
  const required = [
    "new URL(request.url)",
    "sourceUrl.origin",
    "headers.set(\"origin\", sourceUrl.origin)",
    "new Request(request, { headers })",
    "RTAFNC_GATEWAY.fetch(toGatewayRequest(context.request))"
  ];
  for (const marker of required) {
    if (!source.includes(marker)) throw new Error(`gateway proxy must derive trusted Pages origin: ${p}`);
  }
  if (source.includes("headers.get(\"origin\")")) throw new Error(`gateway proxy must not trust client Origin: ${p}`);
}

console.log("Secure Cloudflare view_cards migration verification passed");
