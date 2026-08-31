import { type OnboardingDetails, onboardingDetailsSchema } from "@/lib/repository";

/**
 * Copies a verified Clerk address into Awthor's local author settings once.
 * A writer's existing profile email is always treated as intentional.
 */
export function fillMissingProfileEmail(
  profile: OnboardingDetails | null,
  clerkEmail: string | null | undefined,
): OnboardingDetails | null {
  const email = clerkEmail?.trim();

  if (!email || profile?.contactEmail.trim()) {
    return profile;
  }

  return onboardingDetailsSchema.parse({
    ...profile,
    contactEmail: email,
  });
}
