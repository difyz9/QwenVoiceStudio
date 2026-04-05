import { buildOpenApiProxyResponse } from "@/lib/backend-docs-proxy";

export const dynamic = "force-dynamic";

export async function GET() {
  return buildOpenApiProxyResponse();
}