export type SyncAccountPresentation = {
  actionLabel: string;
  detail: string;
  statusLabel: string;
};

export function getSyncAccountPresentation({
  configured,
  signedIn,
}: {
  configured: boolean;
  signedIn: boolean;
}): SyncAccountPresentation {
  if (!configured) {
    return {
      actionLabel: "Sync unavailable",
      detail:
        "This Awthor deployment has not enabled account sync. Your writing remains available on this device.",
      statusLabel: "Local-only",
    };
  }

  if (signedIn) {
    return {
      actionLabel: "Sync now",
      detail:
        "Your account is connected. Select Sync now to copy this writing workspace to your account.",
      statusLabel: "Ready to sync",
    };
  }

  return {
    actionLabel: "Enable sync",
    detail:
      "Create or sign in to an Awthor account with your email. Your books remain on this device until you choose Sync.",
    statusLabel: "Local-only",
  };
}
