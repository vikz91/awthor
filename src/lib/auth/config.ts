export type ClerkConfiguration = {
  enabled: boolean;
  publishableKey: string | null;
};

type Environment = Record<string, string | undefined>;

/**
 * Clerk is opt-in for each deployment. Both keys are required so forks without
 * a Clerk application continue to run as completely local-only Awthor apps.
 */
export function resolveClerkConfiguration(environment: Environment): ClerkConfiguration {
  const publishableKey = environment.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() || null;
  const secretKey = environment.CLERK_SECRET_KEY?.trim() || null;

  return {
    enabled: Boolean(publishableKey && secretKey),
    publishableKey,
  };
}

export const clerkConfiguration = resolveClerkConfiguration(process.env);
