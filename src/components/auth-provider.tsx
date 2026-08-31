"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { createContext, type ReactNode, useContext } from "react";

const SyncAccountConfigurationContext = createContext(false);

type AuthProviderProps = {
  children: ReactNode;
  enabled: boolean;
  publishableKey: string | null;
};

/** Keeps Clerk out of local-only deployments while exposing one availability flag to the UI. */
export function AuthProvider({ children, enabled, publishableKey }: AuthProviderProps) {
  const content =
    enabled && publishableKey ? (
      <ClerkProvider publishableKey={publishableKey}>{children}</ClerkProvider>
    ) : (
      children
    );

  return (
    <SyncAccountConfigurationContext.Provider value={enabled}>
      {content}
    </SyncAccountConfigurationContext.Provider>
  );
}

export function useSyncAccountConfigured() {
  return useContext(SyncAccountConfigurationContext);
}
