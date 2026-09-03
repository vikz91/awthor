import { auth } from "@clerk/nextjs/server";
import { clerkConfiguration } from "@/lib/auth/config";
import { isSyncAccountAuthorized, syncAccessDeniedMessage } from "@/lib/auth/sync-access";
import { mongoConfiguration } from "@/lib/database/config";
import { getAwthorDatabase } from "@/lib/database/mongodb";
import {
  type PublishedStory,
  toPublishedStorySummary,
} from "@/lib/database/published-story-snapshot";
import { createRemoteWorkspaceService } from "@/lib/database/remote-workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ bookId: string }> };

function unavailable() {
  return Response.json({ error: "Publishing is not configured." }, { status: 503 });
}

function unauthorized() {
  return Response.json({ error: "Sign in before publishing a story." }, { status: 401 });
}

function storyResponse(story: PublishedStory | null) {
  return Response.json(story ? toPublishedStorySummary(story) : { published: false }, {
    headers: { "Cache-Control": "no-store" },
  });
}

async function serviceForCurrentUser() {
  if (!clerkConfiguration.enabled || !mongoConfiguration.enabled) return null;
  const { userId } = await auth();
  if (!userId) return null;
  if (!(await isSyncAccountAuthorized(userId))) return "unauthorized" as const;
  return createRemoteWorkspaceService(await getAwthorDatabase(), userId);
}

export async function GET(_request: Request, { params }: RouteContext) {
  if (!clerkConfiguration.enabled || !mongoConfiguration.enabled) return unavailable();
  const service = await serviceForCurrentUser();
  if (!service) return unauthorized();
  if (service === "unauthorized")
    return Response.json({ error: syncAccessDeniedMessage }, { status: 403 });

  try {
    return storyResponse(await service.getPublishedBook((await params).bookId));
  } catch {
    return Response.json({ error: "This book has not been synced yet." }, { status: 404 });
  }
}

export async function POST(_request: Request, { params }: RouteContext) {
  if (!clerkConfiguration.enabled || !mongoConfiguration.enabled) return unavailable();
  const service = await serviceForCurrentUser();
  if (!service) return unauthorized();
  if (service === "unauthorized")
    return Response.json({ error: syncAccessDeniedMessage }, { status: 403 });

  try {
    return storyResponse(await service.publishBook((await params).bookId));
  } catch {
    return Response.json(
      { error: "This book could not be published. Sync it and try again." },
      { status: 409 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  if (!clerkConfiguration.enabled || !mongoConfiguration.enabled) return unavailable();
  const service = await serviceForCurrentUser();
  if (!service) return unauthorized();
  if (service === "unauthorized")
    return Response.json({ error: syncAccessDeniedMessage }, { status: 403 });

  try {
    await service.unpublishBook((await params).bookId);
    return Response.json({ published: false }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "This story could not be unpublished." }, { status: 409 });
  }
}
