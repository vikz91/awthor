import { BookOpenText } from "lucide-react";
import Image from "next/image";
import { generatedCoverVariant, sanitizeRemoteImageUrl } from "@/lib/markdown";
import { cn } from "@/lib/utils";

type BookCoverProps = {
  bookId: string;
  title: string;
  author?: string;
  coverUrl?: string | null;
  className?: string;
};

function GeneratedCover({ bookId, title }: Pick<BookCoverProps, "bookId" | "title">) {
  const variant = generatedCoverVariant(bookId, 6);

  return (
    <div
      aria-label={`Generated cover for ${title}`}
      className={cn(
        "relative isolate flex size-full overflow-hidden bg-muted p-5 text-foreground",
        variant === 1 && "bg-foreground text-background",
        variant === 2 && "bg-secondary",
        variant === 3 && "bg-card",
        variant === 4 && "bg-primary text-primary-foreground",
        variant === 5 && "bg-accent text-accent-foreground",
      )}
      role="img"
    >
      {variant === 0 && (
        <>
          <div className="absolute -bottom-10 -left-14 h-4/5 w-4/5 -rotate-12 rounded-t-full bg-foreground" />
          <div className="absolute top-10 right-8 size-12 rounded-full bg-primary" />
          <div className="absolute right-8 bottom-7 h-1/2 w-px rotate-12 bg-border" />
        </>
      )}
      {variant === 1 && (
        <>
          <div className="absolute top-16 left-8 h-3/5 w-2/5 rounded-t-full bg-background" />
          <div className="absolute top-8 right-7 size-12 rounded-full bg-primary" />
          <div className="absolute right-3 bottom-12 h-3 w-1/2 bg-secondary" />
          <div className="absolute right-7 bottom-8 h-3 w-2/5 bg-secondary" />
        </>
      )}
      {variant === 2 && (
        <>
          <div className="absolute -bottom-14 -left-10 size-52 rounded-full border border-foreground/20" />
          <div className="absolute -right-20 bottom-3 size-64 rounded-full border border-foreground/20" />
          <div className="absolute top-9 right-8 size-11 rounded-full bg-primary" />
          <div className="absolute right-5 bottom-20 h-px w-4/5 -rotate-12 bg-foreground/25" />
          <div className="absolute right-5 bottom-16 h-px w-4/5 -rotate-12 bg-foreground/25" />
          <div className="absolute right-5 bottom-12 h-px w-4/5 -rotate-12 bg-foreground/25" />
        </>
      )}
      {variant === 3 && (
        <>
          <div className="absolute -bottom-20 -left-16 size-72 rounded-full bg-foreground" />
          <div className="absolute right-8 bottom-16 h-28 w-14 rounded-t-full bg-primary" />
          <div className="absolute right-15 bottom-16 h-28 w-px bg-primary-foreground/60" />
        </>
      )}
      {variant === 4 && (
        <>
          <div className="absolute -right-16 -bottom-12 size-64 rotate-12 rounded-full bg-background" />
          <div className="absolute top-8 left-7 h-24 w-16 rounded-b-full border border-primary-foreground/40" />
          <div className="absolute top-4 left-15 h-32 w-px rotate-45 bg-primary-foreground/40" />
        </>
      )}
      {variant === 5 && (
        <>
          <div className="absolute -bottom-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-foreground" />
          <div className="absolute top-9 left-1/2 size-12 -translate-x-1/2 rounded-full bg-primary" />
          <div className="absolute inset-x-8 bottom-24 h-px rotate-6 bg-border" />
          <div className="absolute inset-x-8 bottom-20 h-px -rotate-6 bg-border" />
        </>
      )}

      <div className="relative z-10 mt-auto grid size-9 place-items-center rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur-sm">
        <BookOpenText aria-hidden="true" className="size-4" />
      </div>
    </div>
  );
}

export function BookCover({ bookId, title, author, coverUrl, className }: BookCoverProps) {
  const safeCoverUrl = sanitizeRemoteImageUrl(coverUrl);
  const displayAuthor = author?.trim() || "Awthor";

  return (
    <div className={cn("relative aspect-[2/3] overflow-hidden rounded-2xl", className)}>
      {safeCoverUrl ? (
        <Image
          alt={`Cover of ${title}`}
          className="size-full object-cover"
          decoding="async"
          fill
          loading="lazy"
          referrerPolicy="no-referrer"
          sizes="(min-width: 1280px) 16vw, (min-width: 1024px) 22vw, (min-width: 640px) 30vw, 45vw"
          src={safeCoverUrl}
          unoptimized
        />
      ) : (
        <GeneratedCover bookId={bookId} title={title} />
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-cover-overlay px-4 pt-8 pb-4 text-cover-foreground sm:px-5 sm:pt-10 sm:pb-5">
        <p className="line-clamp-3 font-heading text-lg leading-[1.02] font-semibold tracking-[-0.035em] sm:text-xl">
          {title}
        </p>
        <p className="mt-2 line-clamp-1 text-[0.62rem] font-semibold tracking-[0.18em] uppercase opacity-85 sm:text-[0.68rem]">
          {displayAuthor}
        </p>
      </div>
    </div>
  );
}
