"use client";

import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { X } from "lucide-react";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Drawer({ swipeDirection = "right", ...props }: DrawerPrimitive.Root.Props) {
  return <DrawerPrimitive.Root swipeDirection={swipeDirection} {...props} />;
}

function DrawerPortal(props: DrawerPrimitive.Portal.Props) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerBackdrop({ className, ...props }: DrawerPrimitive.Backdrop.Props) {
  return (
    <DrawerPrimitive.Backdrop
      className={cn(
        "fixed inset-0 z-[60] bg-foreground/20 backdrop-blur-[2px] transition-opacity duration-200 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none",
        className,
      )}
      data-slot="drawer-backdrop"
      {...props}
    />
  );
}

function DrawerViewport({ className, ...props }: DrawerPrimitive.Viewport.Props) {
  return (
    <DrawerPrimitive.Viewport
      className={cn(
        "pointer-events-none fixed inset-0 z-[61] flex min-h-dvh items-stretch justify-end",
        className,
      )}
      data-slot="drawer-viewport"
      {...props}
    />
  );
}

function DrawerContent({
  children,
  className,
  showCloseButton = true,
  ...props
}: DrawerPrimitive.Popup.Props & { showCloseButton?: boolean }) {
  return (
    <DrawerPortal>
      <DrawerBackdrop />
      <DrawerViewport>
        <DrawerPrimitive.Popup
          className={cn(
            "pointer-events-auto h-dvh w-full overflow-hidden border-l border-border bg-popover text-popover-foreground shadow-2xl shadow-foreground/10 outline-none [transform:translateX(var(--drawer-swipe-movement-x))] transition-transform duration-200 ease-out data-ending-style:translate-x-full data-starting-style:translate-x-full data-swiping:select-none data-swiping:duration-0 motion-reduce:transition-none sm:w-[min(64rem,92vw)]",
            className,
          )}
          data-slot="drawer-content"
          finalFocus={false}
          {...props}
        >
          <DrawerPrimitive.Content className="flex h-full min-h-0 flex-col">
            {children}
          </DrawerPrimitive.Content>
          {showCloseButton ? (
            <DrawerPrimitive.Close
              aria-label="Close"
              className="absolute top-3 right-3 z-10"
              render={<Button size="icon" variant="ghost" />}
            >
              <X aria-hidden="true" />
            </DrawerPrimitive.Close>
          ) : null}
        </DrawerPrimitive.Popup>
      </DrawerViewport>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"header">) {
  return (
    <header
      className={cn("shrink-0 border-b border-border px-4 py-4 pr-14 sm:px-6 sm:py-5", className)}
      data-slot="drawer-header"
      {...props}
    />
  );
}

function DrawerTitle({ className, ...props }: DrawerPrimitive.Title.Props) {
  return (
    <DrawerPrimitive.Title
      className={cn("font-heading text-xl font-semibold tracking-tight", className)}
      data-slot="drawer-title"
      {...props}
    />
  );
}

function DrawerDescription({ className, ...props }: DrawerPrimitive.Description.Props) {
  return (
    <DrawerPrimitive.Description
      className={cn("mt-1 text-sm leading-6 text-muted-foreground", className)}
      data-slot="drawer-description"
      {...props}
    />
  );
}

function DrawerBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain", className)}
      data-base-ui-swipe-ignore
      data-slot="drawer-body"
      {...props}
    />
  );
}

function DrawerClose(props: DrawerPrimitive.Close.Props) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

export {
  Drawer,
  DrawerBackdrop,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerPortal,
  DrawerTitle,
  DrawerViewport,
};
