import { clerkClient } from "@clerk/nextjs/server";
import { clerkConfiguration } from "./config";

export const syncAccessDeniedMessage =
  "This account is not authorized to use Awthor cloud features.";

export type SyncAccountAccess = "authorized" | "disabled" | "signed-out" | "unauthorized";

export function resolveSyncAccountAccess({
  adminEmails,
  email,
  userId,
}: {
  adminEmails: readonly string[];
  email: string | null | undefined;
  userId: string | null | undefined;
}): SyncAccountAccess {
  if (!userId) return "signed-out";
  if (adminEmails.length === 0) return "unauthorized";
  const normalizedEmail = email?.trim().toLowerCase();
  return normalizedEmail && adminEmails.includes(normalizedEmail) ? "authorized" : "unauthorized";
}

/**
 * Resolves the primary email on Clerk's server. The browser never decides whether
 * a signed-in account may access cloud data.
 */
export async function getSyncAccountAccess(
  userId: string | null | undefined,
): Promise<SyncAccountAccess> {
  if (!clerkConfiguration.enabled) return "disabled";
  if (!userId) return "signed-out";

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  return resolveSyncAccountAccess({
    adminEmails: clerkConfiguration.adminEmails,
    email: user.primaryEmailAddress?.emailAddress,
    userId,
  });
}

export async function isSyncAccountAuthorized(userId: string | null | undefined): Promise<boolean> {
  return (await getSyncAccountAccess(userId)) === "authorized";
}
