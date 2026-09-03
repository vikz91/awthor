import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AppTopBarProps = {
  left: ReactNode;
  center?: ReactNode;
  right: ReactNode;
  className?: string;
};

export function AppTopBar({ left, center, right, className }: AppTopBarProps) {
  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl supports-backdrop-filter:bg-background/75",
        className,
      )}
      data-app-top-bar
    >
      <div className="mx-auto grid h-16 w-full max-w-[96rem] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 sm:gap-5 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center">{left}</div>
        <div className="flex min-w-0 items-center justify-center">{center}</div>
        <div className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-2">{right}</div>
      </div>
    </header>
  );
}
