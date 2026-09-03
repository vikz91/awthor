export type ClerkConfiguration = {
  adminEmails: readonly string[];
  enabled: boolean;
  publishableKey: string | null;
};

type Environment = Record<string, string | undefined>;

/** Normalizes the deployment-only email allowlist used for cloud features. */
export function resolveAdminEmails(value: string | undefined): readonly string[] {
  return [
    ...new Set(
      (value ?? "")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

/**
 * Clerk is opt-in for each deployment. Both keys are required so forks without
 * a Clerk application continue to run as completely local-only Awthor apps.
 */
export function resolveClerkConfiguration(environment: Environment): ClerkConfiguration {
  const publishableKey = environment.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() || null;
  const secretKey = environment.CLERK_SECRET_KEY?.trim() || null;

  return {
    adminEmails: resolveAdminEmails(environment.ADMIN_EMAILS),
    enabled: Boolean(publishableKey && secretKey),
    publishableKey,
  };
}

export const clerkConfiguration = resolveClerkConfiguration(process.env);
