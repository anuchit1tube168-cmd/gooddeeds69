interface Env {
  GOODDEED_LIFF_ID?: string;
}

function js(value: unknown, status = 200) {
  return new Response(String(value), {
    status,
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    },
  });
}

export async function onRequest(context: { request: Request; env: Env }): Promise<Response> {
  if (context.request.method !== "GET") return js("/* method not allowed */", 405);
  const liffId = String(context.env.GOODDEED_LIFF_ID || "").trim();
  if (!/^[0-9]{6,20}-[A-Za-z0-9_-]{4,128}$/.test(liffId)) {
    return js("window.GOOD_DEED_CLOUDFLARE = Object.freeze({ CONFIG_ERROR: 'LIFF_NOT_CONFIGURED' });", 503);
  }

  const config = {
    LIFF_ID: liffId,
    MODULE: "gooddeed",
    CARD_SELF_ENDPOINT: "/api/gooddeed/card-self",
    SESSION_ENDPOINT: "/auth/session",
    LINE_VERIFY_ENDPOINT: "/auth/line/verify",
    LOGOUT_ENDPOINT: "/auth/logout",
    PRODUCTION_CUTOVER: false,
    WRITES_ENABLED: false,
    SAME_ORIGIN_REQUIRED: true,
  };
  return js(`window.GOOD_DEED_CLOUDFLARE = Object.freeze(${JSON.stringify(config)});`);
}
