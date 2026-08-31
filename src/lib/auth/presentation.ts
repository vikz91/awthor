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
      actionLabel: "Sync coming soon",
      detail: "This Awthor deployment is currently local-only. Your writing stays on this device.",
      statusLabel: "Local-only",
    };
  }

  if (signedIn) {
    return {
      actionLabel: "Sync coming soon",
      detail:
        "Your account is ready. Syncing books will be available in a future release; nothing has been uploaded.",
      statusLabel: "Account ready",
    };
  }

  return {
    actionLabel: "Enable sync",
    detail:
      "Create or sign in to an Awthor account with your email. Your books remain on this device until optional sync launches.",
    statusLabel: "Local-only",
  };
}
