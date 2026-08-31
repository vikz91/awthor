import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { clerkConfiguration } from "@/lib/auth/config";

const clerkProxy = clerkMiddleware(async (auth, request) => {
  if (request.nextUrl.pathname.startsWith("/api/sync")) {
    await auth.protect();
  }
});

export default clerkConfiguration.enabled ? clerkProxy : () => NextResponse.next();

export const config = { matcher: ["/api/sync/:path*", "/api/mcp/:path*"] };
