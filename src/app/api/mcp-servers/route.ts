import { NextResponse } from "next/server";
import prisma from "@/lib/database/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  isStdioMCPAllowed,
  STDIO_DISABLED_MESSAGE,
  toPublicMCPServer,
  validateMCPUrl,
} from "@/lib/mcp/policy";
import { invalidateMCPToolsCache } from "@/lib/agent/mcp";
import { CreateMCPServerBody, UpdateMCPServerBody } from "./schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** MCP servers are shared, global configuration, so changing them requires a signed-in user. */
async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to manage MCP servers" }, { status: 401 });
  }
  return null;
}

export async function GET() {
  try {
    const servers = await prisma.mCPServer.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(servers.map(toPublicMCPServer));
  } catch (error) {
    console.error("Error fetching MCP servers:", error);
    return NextResponse.json({ error: "Failed to fetch MCP servers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const unauthorized = await requireUser();
    if (unauthorized) return unauthorized;

    const parsed = CreateMCPServerBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json(
        { error: issue ? `${issue.path.join(".") || "body"}: ${issue.message}` : "Invalid body" },
        { status: 400 },
      );
    }
    const body = parsed.data;

    if (body.type === "stdio" && !isStdioMCPAllowed()) {
      return NextResponse.json({ error: STDIO_DISABLED_MESSAGE }, { status: 403 });
    }

    if (body.type === "http") {
      const urlError = validateMCPUrl(body.url);
      if (urlError) return NextResponse.json({ error: urlError }, { status: 400 });
    }

    const server = await prisma.mCPServer.create({
      data:
        body.type === "stdio"
          ? {
              name: body.name,
              type: "stdio",
              command: body.command,
              args: body.args ?? undefined,
              env: body.env ?? undefined,
            }
          : {
              name: body.name,
              type: "http",
              url: body.url,
              headers: body.headers ?? undefined,
            },
    });

    invalidateMCPToolsCache();
    return NextResponse.json(toPublicMCPServer(server), { status: 201 });
  } catch (error) {
    console.error("Error creating MCP server:", error);
    if ((error as { code?: string })?.code === "P2002") {
      return NextResponse.json({ error: "Server name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create MCP server" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const unauthorized = await requireUser();
    if (unauthorized) return unauthorized;

    const parsed = UpdateMCPServerBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json(
        { error: issue ? `${issue.path.join(".") || "body"}: ${issue.message}` : "Invalid body" },
        { status: 400 },
      );
    }
    // null means "not applicable to this type": treat it like an omitted field.
    const orUndefined = <T>(v: T | null | undefined) => (v === null ? undefined : v);
    const { id, name, type, enabled } = parsed.data;
    const command = orUndefined(parsed.data.command);
    const args = orUndefined(parsed.data.args);
    const env = orUndefined(parsed.data.env);
    const url = orUndefined(parsed.data.url);
    const headers = orUndefined(parsed.data.headers);

    const changesStdioConfig =
      type === "stdio" || command !== undefined || args !== undefined || env !== undefined;
    if (changesStdioConfig && !isStdioMCPAllowed()) {
      return NextResponse.json({ error: STDIO_DISABLED_MESSAGE }, { status: 403 });
    }

    if (url !== undefined) {
      const urlError = validateMCPUrl(url);
      if (urlError) return NextResponse.json({ error: urlError }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (enabled !== undefined) updateData.enabled = enabled;

    if (type === "stdio") {
      if (command !== undefined) updateData.command = command;
      if (args !== undefined) updateData.args = args;
      if (env !== undefined) updateData.env = env;
      updateData.url = null;
      updateData.headers = null;
    } else if (type === "http") {
      if (url !== undefined) updateData.url = url;
      if (headers !== undefined) updateData.headers = headers;
      updateData.command = null;
      updateData.args = null;
      updateData.env = null;
    }

    const server = await prisma.mCPServer.update({
      where: { id },
      data: updateData,
    });

    invalidateMCPToolsCache();
    return NextResponse.json(toPublicMCPServer(server));
  } catch (error) {
    console.error("Error updating MCP server:", error);
    const code = (error as { code?: string })?.code;
    if (code === "P2025") {
      return NextResponse.json({ error: "Server not found" }, { status: 404 });
    }
    if (code === "P2002") {
      return NextResponse.json({ error: "Server name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to update MCP server" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const unauthorized = await requireUser();
    if (unauthorized) return unauthorized;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await prisma.mCPServer.delete({
      where: { id },
    });

    invalidateMCPToolsCache();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting MCP server:", error);
    if ((error as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "Server not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to delete MCP server" }, { status: 500 });
  }
}
