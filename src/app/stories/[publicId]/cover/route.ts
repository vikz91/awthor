import {
  generatedBookCoverDataUrlPrefix,
  isGeneratedBookCoverDataUrl,
} from "@/lib/book-cover-generator";
import { getAwthorDatabase } from "@/lib/database/mongodb";
import { getPublishedStoryByPublicId } from "@/lib/database/published-stories";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CoverRouteContext = {
  params: Promise<{ publicId: string }>;
};

const cacheHeaders = {
  "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(_request: Request, { params }: CoverRouteContext) {
  const { publicId } = await params;

  try {
    const story = await getPublishedStoryByPublicId(await getAwthorDatabase(), publicId);
    const coverUrl = story?.book.coverUrl;
    if (!coverUrl) return new Response(null, { status: 404 });

    if (!isGeneratedBookCoverDataUrl(coverUrl)) {
      return new Response(null, {
        headers: { ...cacheHeaders, Location: coverUrl, "Referrer-Policy": "no-referrer" },
        status: 307,
      });
    }

    const image = Uint8Array.from(
      Buffer.from(coverUrl.slice(generatedBookCoverDataUrlPrefix.length), "base64"),
    );

    return new Response(image, {
      headers: { ...cacheHeaders, "Content-Type": "image/jpeg" },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
