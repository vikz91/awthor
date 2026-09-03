type ReadingChromeEdgeInput = {
  scrollTop: number;
  scrollHeight: number;
  viewportHeight: number;
};

type SuddenReadingScrollInput = {
  distance: number;
  elapsedMs: number;
};

export const readingChromeStartDistance = 48;
export const slowReadingCollapseDistance = 28;
export const readingChromeBurstVisibilityMs = 1_400;

export function isReadingChromeEdge({
  scrollHeight,
  scrollTop,
  viewportHeight,
}: ReadingChromeEdgeInput) {
  const maximumScroll = Math.max(scrollHeight - viewportHeight, 0);
  const distanceFromEnd = Math.max(maximumScroll - scrollTop, 0);

  return (
    maximumScroll === 0 ||
    scrollTop <= readingChromeStartDistance ||
    distanceFromEnd <= viewportHeight
  );
}

export function isSuddenReadingScroll({ distance, elapsedMs }: SuddenReadingScrollInput) {
  const absoluteDistance = Math.abs(distance);
  const velocity = absoluteDistance / Math.max(elapsedMs, 1);

  return absoluteDistance >= 48 || (absoluteDistance >= 14 && velocity >= 0.75);
}
