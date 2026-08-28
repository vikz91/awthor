export function groupBlocksIntoPages(
  blockHeights: readonly number[],
  pageHeight: number,
): number[][] {
  if (!Number.isFinite(pageHeight) || pageHeight <= 0) {
    return [];
  }

  const pages: number[][] = [];
  let currentPage: number[] = [];
  let currentHeight = 0;

  for (const [index, rawHeight] of blockHeights.entries()) {
    const blockHeight = Number.isFinite(rawHeight) ? Math.max(0, rawHeight) : 0;

    if (currentPage.length > 0 && currentHeight + blockHeight > pageHeight) {
      pages.push(currentPage);
      currentPage = [];
      currentHeight = 0;
    }

    currentPage.push(index);
    currentHeight += blockHeight;

    if (blockHeight >= pageHeight) {
      pages.push(currentPage);
      currentPage = [];
      currentHeight = 0;
    }
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
}
