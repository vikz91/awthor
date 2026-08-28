"use client";

import { type ReactNode, useSyncExternalStore } from "react";
import {
  Drawer,
  DrawerContent,
  type DrawerContentProps,
  type DrawerProps,
} from "@/components/ui/drawer";

const dockedInspectorQuery = "(min-width: 72rem)";

type WorkspaceInspectorProps = Omit<DrawerProps, "disablePointerDismissal" | "modal"> & {
  children: ReactNode;
  contentClassName?: DrawerContentProps["className"];
};

export function WorkspaceInspector({
  children,
  contentClassName,
  ...props
}: WorkspaceInspectorProps) {
  const isDocked = useDockedInspector();

  return (
    <Drawer disablePointerDismissal={isDocked} modal={!isDocked} {...props}>
      <DrawerContent className={contentClassName} presentation="workspace-inspector">
        {children}
      </DrawerContent>
    </Drawer>
  );
}

function useDockedInspector() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function subscribe(onStoreChange: () => void) {
  const media = window.matchMedia(dockedInspectorQuery);
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function getSnapshot() {
  return window.matchMedia(dockedInspectorQuery).matches;
}

function getServerSnapshot() {
  return false;
}
