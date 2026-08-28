import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { sanitizeMarkdownUrl, sanitizeRemoteImageUrl } from "@/lib/markdown";

type MarkdownManuscriptProps = {
  source: string;
};

export function MarkdownManuscript({ source }: MarkdownManuscriptProps) {
  return (
    <ReactMarkdown
      components={{
        a: SafeLink,
        blockquote: ({ children }) => (
          <blockquote className="my-7 border-l-2 border-primary/60 pl-5 text-muted-foreground italic">
            {children}
          </blockquote>
        ),
        code: ({ children, className }) => (
          <code
            className={
              className
                ? `${className} font-mono text-sm`
                : "rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.9em]"
            }
          >
            {children}
          </code>
        ),
        h1: ({ children }) => (
          <h2 className="mt-1 mb-10 font-heading text-4xl leading-tight font-medium tracking-[-0.035em] sm:text-5xl">
            {children}
          </h2>
        ),
        h2: ({ children }) => (
          <h2 className="mt-12 mb-5 font-heading text-3xl leading-tight font-medium tracking-[-0.025em]">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mt-9 mb-4 font-heading text-2xl leading-tight font-medium">{children}</h3>
        ),
        img: SafeImage,
        li: ({ children }) => <li className="my-2 pl-1">{children}</li>,
        ol: ({ children }) => <ol className="my-7 list-decimal space-y-1 pl-7">{children}</ol>,
        p: ({ children }) => <p className="my-6 leading-[1.9]">{children}</p>,
        pre: ({ children }) => (
          <pre className="my-7 overflow-x-auto rounded-2xl border border-border bg-card p-4 text-sm">
            {children}
          </pre>
        ),
        table: ({ children }) => (
          <div className="my-8 overflow-x-auto rounded-2xl border border-border">
            <table className="w-full border-collapse text-left text-sm">{children}</table>
          </div>
        ),
        td: ({ children }) => <td className="border-t border-border px-4 py-3">{children}</td>,
        th: ({ children }) => (
          <th className="bg-muted px-4 py-3 font-semibold text-foreground">{children}</th>
        ),
        ul: ({ children }) => <ul className="my-7 list-disc space-y-1 pl-7">{children}</ul>,
      }}
      remarkPlugins={[remarkGfm]}
      skipHtml
    >
      {source}
    </ReactMarkdown>
  );
}

function SafeLink({ children, href, ...props }: ComponentPropsWithoutRef<"a">) {
  const safeHref = href ? sanitizeMarkdownUrl(href, "link") : null;

  if (!safeHref) {
    return <span>{children}</span>;
  }

  const external = safeHref.startsWith("http://") || safeHref.startsWith("https://");

  return (
    <a
      {...props}
      className="font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      href={safeHref}
      rel={external ? "noreferrer noopener" : undefined}
      target={external ? "_blank" : undefined}
    >
      {children}
    </a>
  );
}

function SafeImage({ alt, src }: ComponentPropsWithoutRef<"img">) {
  const safeSrc = typeof src === "string" ? sanitizeRemoteImageUrl(src) : null;

  if (!safeSrc) {
    return (
      <span className="my-6 block rounded-2xl border border-dashed border-border bg-muted/50 px-4 py-8 text-center text-sm text-muted-foreground">
        {alt ? `Image unavailable: ${alt}` : "Remote image unavailable"}
      </span>
    );
  }

  return (
    // The source is user-authored and only HTTP(S) URLs pass the shared sanitizer.
    // biome-ignore lint/performance/noImgElement: remote manuscript images cannot use a fixed Next Image allowlist
    <img
      alt={alt ?? ""}
      className="my-8 h-auto max-h-[70vh] w-full rounded-2xl border border-border object-contain"
      decoding="async"
      loading="lazy"
      referrerPolicy="no-referrer"
      src={safeSrc}
    />
  );
}

export function EmptyManuscript() {
  return (
    <div className="flex min-h-[45vh] items-center justify-center text-center">
      <div className="max-w-sm">
        <h2 className="font-heading text-2xl font-medium">This chapter is still blank</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Switch to Write when you are ready to begin. Your manuscript stays on this device.
        </p>
      </div>
    </div>
  );
}
