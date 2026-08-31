"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { groupBlocksIntoPages } from "@/lib/manuscript-pagination";
import { MarkdownManuscript } from "./markdown-manuscript";

type PagedManuscriptProps = {
  chapterLabel: string;
  onPaginated?: () => void;
  showTitle?: boolean;
  source: string;
  title: string;
};

export function PagedManuscript({
  chapterLabel,
  onPaginated,
  showTitle = true,
  source,
  title,
}: PagedManuscriptProps) {
  const measureContentRef = useRef<HTMLDivElement>(null);
  const pageHostRef = useRef<HTMLElement>(null);
  const sourceRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(0);

  const paginate = useCallback(() => {
    const measureContent = measureContentRef.current;
    const pageHost = pageHostRef.current;
    const renderedSource = sourceRef.current;
    if (!measureContent || !pageHost || !renderedSource) {
      return;
    }

    const pageHeight = measureContent.clientHeight;
    const blocks = Array.from(renderedSource.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement,
    );
    const heights = blocks.map(outerBlockHeight);
    const pageGroups = groupBlocksIntoPages(heights, pageHeight);
    if (pageGroups.length === 0) {
      return;
    }

    const pages = document.createDocumentFragment();
    for (const [pageIndex, blockIndexes] of pageGroups.entries()) {
      const page = document.createElement("section");
      page.className = "manuscript-page";
      page.setAttribute("aria-label", `Page ${pageIndex + 1} of ${pageGroups.length}`);

      const content = document.createElement("div");
      content.className = "manuscript-page-content manuscript-page-flow manuscript-reader";
      for (const blockIndex of blockIndexes) {
        const block = blocks[blockIndex];
        if (block) {
          content.append(block.cloneNode(true));
        }
      }

      const number = document.createElement("span");
      number.ariaHidden = "true";
      number.className = "manuscript-page-number";
      number.textContent = String(pageIndex + 1);

      page.append(content, number);
      pages.append(page);
    }

    pageHost.replaceChildren(pages);
    setPageCount(pageGroups.length);
    onPaginated?.();
  }, [onPaginated]);

  useEffect(() => {
    const measureContent = measureContentRef.current;
    const pageHost = pageHostRef.current;
    const renderedSource = sourceRef.current;
    if (!measureContent || !pageHost || !renderedSource) {
      return;
    }

    if (!source && (!title || !showTitle)) {
      pageHost.replaceChildren();
      setPageCount(0);
      return;
    }

    let frame: number | null = null;
    let cancelled = false;
    const schedulePagination = () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
      frame = requestAnimationFrame(() => {
        frame = null;
        if (!cancelled) {
          paginate();
        }
      });
    };

    const observer = new ResizeObserver(schedulePagination);
    observer.observe(measureContent);
    observer.observe(renderedSource);
    for (const image of renderedSource.querySelectorAll("img")) {
      image.addEventListener("load", schedulePagination);
      image.addEventListener("error", schedulePagination);
    }

    schedulePagination();
    void document.fonts?.ready.then(schedulePagination);

    return () => {
      cancelled = true;
      observer.disconnect();
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
      for (const image of renderedSource.querySelectorAll("img")) {
        image.removeEventListener("load", schedulePagination);
        image.removeEventListener("error", schedulePagination);
      }
    };
  }, [paginate, showTitle, source, title]);

  return (
    <div className="manuscript-page-stack">
      <div aria-hidden="true" className="manuscript-pagination-measure" inert>
        <div className="manuscript-page-content" ref={measureContentRef}>
          <div
            className="manuscript-page-flow manuscript-reader"
            data-pagination-source
            ref={sourceRef}
          >
            <ChapterHeading chapterLabel={chapterLabel} showTitle={showTitle} title={title} />
            <MarkdownManuscript source={source} />
          </div>
        </div>
      </div>
      {pageCount === 0 ? (
        <output className="block py-16 text-center text-sm text-muted-foreground">
          Laying out pages…
        </output>
      ) : null}
      <section
        aria-busy={pageCount === 0}
        aria-label="Paginated chapter"
        className="manuscript-page-list"
        ref={pageHostRef}
      />
      <p aria-live="polite" className="sr-only">
        {pageCount > 0 ? `${pageCount} ${pageCount === 1 ? "page" : "pages"}.` : ""}
      </p>
    </div>
  );
}

function ChapterHeading({
  chapterLabel,
  showTitle,
  title,
}: {
  chapterLabel: string;
  showTitle: boolean;
  title: string;
}) {
  return (
    <header className={showTitle ? "mb-10" : "mb-6"}>
      <p className="font-sans text-xs font-semibold tracking-[0.24em] text-muted-foreground uppercase">
        {chapterLabel}
      </p>
      {showTitle ? (
        <h1 className="manuscript-reader mt-5 font-serif text-4xl leading-tight font-medium tracking-[-0.035em] sm:text-5xl">
          {title}
        </h1>
      ) : null}
    </header>
  );
}

function outerBlockHeight(block: HTMLElement) {
  const styles = window.getComputedStyle(block);
  return (
    block.getBoundingClientRect().height +
    numericPixels(styles.marginTop) +
    numericPixels(styles.marginBottom)
  );
}

function numericPixels(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
