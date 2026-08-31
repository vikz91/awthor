import { getMcpAuthorizationServerMetadata, mcpConfiguration } from "@/lib/mcp/config";

export const dynamic = "force-dynamic";

export function GET() {
  const metadata = getMcpAuthorizationServerMetadata();
  if (!mcpConfiguration.enabled || !metadata) {
    return Response.json({ error: "Remote MCP is not configured." }, { status: 404 });
  }

  return Response.json(metadata, { headers: { "Cache-Control": "public, max-age=300" } });
}
