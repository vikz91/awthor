"use client";

type InlineScriptProps = {
  html: string;
  id?: string;
};

/** Runs during HTML parsing, then stays inert if React renders it on the client. */
export function InlineScript({ html, id }: InlineScriptProps) {
  return (
    <script
      // biome-ignore lint/security/noDangerouslySetInnerHtml: This helper receives source-controlled bootstrap code that must run before hydration.
      dangerouslySetInnerHTML={{ __html: html }}
      id={id}
      suppressHydrationWarning
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
    />
  );
}
