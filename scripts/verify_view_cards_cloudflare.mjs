import fs from "node:fs";

const read = (p) => fs.readFileSync(p, "utf8");
const html = read("frontend/view_cards.html");
const js = read("frontend/view_cards.cloudflare.js");
const config = read("frontend/cloudflare-config.js");
const wrangler = read("wrangler.cards.jsonc");

const forbidden = [
  "students_data.js", "students_photos.js", "deeds_data.js", "teachers_data.js",
  "STUDENTS_DATA", "STUDENT_PHOTOS", "DEEDS_DATA", "App.requireAuth", "App.getStudentSummary",
  "localStorage", "sessionStorage", "TELEGRAM_BOT_TOKEN", "LINE_CHANNEL_ACCESS_TOKEN",
  "fonts.googleapis.com", "fonts.gstatic.com", "umami", "__manus__", "sessionReplay", "gtag("
];

for (const marker of forbidden) {
  if (html.includes(marker) || js.includes(marker)) throw new Error(`forbidden view_cards marker: ${marker}`);
}

if (js.includes(".innerHTML") || js.includes("insertAdjacentHTML")) {
  throw new Error("server/user data rendering must not use HTML injection APIs");
}

const requiredHtml = ["cloudflare-config.js", "static.line-scdn.net/liff/edge/2/sdk.js", "view_cards.cloudflare.js"];
for (const marker of requiredHtml) if (!html.includes(marker)) throw new Error(`missing secure card dependency: ${marker}`);

const requiredJs = ["/auth/session", "/auth/line/verify", "/api/gooddeed/card-self", "credentials: \"include\"", "getIDToken()"];
for (const marker of requiredJs) if (!js.includes(marker) && !config.includes(marker)) throw new Error(`missing secure card behavior: ${marker}`);

if (!config.includes("PRODUCTION_CUTOVER: false") || !config.includes("WRITES_ENABLED: false")) {
  throw new Error("card migration must remain staging-only/read-only");
}
if (!wrangler.includes('"binding": "RTAFNC_GATEWAY"') || !wrangler.includes('"service": "rtafnc-one-gateway-staging"')) {
  throw new Error("Pages must use the internal RTAFNC_GATEWAY service binding");
}

for (const p of ["functions/auth/[[path]].ts", "functions/api/[[path]].ts", "functions/health.ts"]) {
  const source = read(p);
  if (!source.includes("RTAFNC_GATEWAY.fetch(context.request)")) throw new Error(`invalid gateway proxy: ${p}`);
}

console.log("Secure Cloudflare view_cards migration verification passed");
