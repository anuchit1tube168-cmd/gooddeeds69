interface GatewayBinding { fetch(request: Request): Promise<Response>; }
interface Env { RTAFNC_GATEWAY: GatewayBinding; }

function toGatewayRequest(request: Request): Request {
  const sourceUrl = new URL(request.url);
  const headers = new Headers(request.headers);
  headers.set("origin", sourceUrl.origin);
  return new Request(request, { headers });
}

export async function onRequest(context: { request: Request; env: Env }): Promise<Response> {
  return context.env.RTAFNC_GATEWAY.fetch(toGatewayRequest(context.request));
}
