interface GatewayBinding { fetch(request: Request): Promise<Response>; }
interface Env { RTAFNC_GATEWAY: GatewayBinding; }
export async function onRequest(context: { request: Request; env: Env }): Promise<Response> {
  return context.env.RTAFNC_GATEWAY.fetch(context.request);
}
