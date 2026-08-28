"use client";

import type { ProofreadingDialect } from "@/lib/proofreading";
import { cn } from "@/lib/utils";

export const proofreadingDialectOptions: ReadonlyArray<{
  value: ProofreadingDialect;
  label: string;
}> = [
  { value: "american", label: "American English" },
  { value: "british", label: "British English" },
  { value: "australian", label: "Australian English" },
  { value: "canadian", label: "Canadian English" },
  { value: "indian", label: "Indian English" },
];

type ProofreadingDialectSelectProps = {
  className?: string;
  id: string;
  onChange: (dialect: ProofreadingDialect) => void;
  value: ProofreadingDialect;
};

export function ProofreadingDialectSelect({
  className,
  id,
  onChange,
  value,
}: ProofreadingDialectSelectProps) {
  return (
    <select
      className={cn(
        "h-8 w-full rounded-2xl border border-transparent bg-input/50 px-3 text-sm text-foreground outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
        className,
      )}
      id={id}
      onChange={(event) => onChange(event.target.value as ProofreadingDialect)}
      value={value}
    >
      {proofreadingDialectOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
