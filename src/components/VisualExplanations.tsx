import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Image, ExternalLink, Loader2 } from "lucide-react";
import CopyButton from "@/components/CopyButton";

interface VisualExplanationsProps {
  content: string;
  style?: React.CSSProperties;
}

interface ImageResult {
  url: string;
  thumb: string;
  title: string;
  source: string;
  sourceUrl: string;
}

function extractTopics(content: string): string[] {
  // Extract lines that look like topic entries (numbered or just lines)
  const lines = content.split("\n").map(l => l.replace(/^\d+\.\s*/, "").trim()).filter(Boolean);
  // Take up to 6 topics
  return lines.slice(0, 6);
}

async function fetchWikimediaImage(query: string): Promise<ImageResult | null> {
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query + " medical")}&gsrlimit=3&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=400&format=json&origin=*`;
    const res = await fetch(url);
    const data = await res.json();
    const pages = data.query?.pages;
    if (!pages) return null;

    for (const page of Object.values(pages) as any[]) {
      const info = page.imageinfo?.[0];
      if (!info?.thumburl) continue;
      // Skip SVGs and icons that tend to be diagrams
      const desc = info.extmetadata?.ImageDescription?.value || page.title || query;
      return {
        url: info.url,
        thumb: info.thumburl,
        title: desc.replace(/<[^>]*>/g, "").slice(0, 120),
        source: "Wikimedia Commons",
        sourceUrl: info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`,
      };
    }
    return null;
  } catch {
    return null;
  }
}

const VisualExplanations = ({ content, style }: VisualExplanationsProps) => {
  const [images, setImages] = useState<ImageResult[]>([]);
  const [loading, setLoading] = useState(true);

  const topics = extractTopics(content);

  useEffect(() => {
    if (topics.length === 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fetchAll = async () => {
      const results = await Promise.all(topics.map(t => fetchWikimediaImage(t)));
      if (!cancelled) {
        setImages(results.filter(Boolean) as ImageResult[]);
        setLoading(false);
      }
    };
    fetchAll();
    return () => { cancelled = true; };
  }, [content]);

  if (!loading && images.length === 0) return null;

  return (
    <Card
      className="glass-card animate-fade-in overflow-hidden hover-lift section-visuals"
      style={style}
    >
      <div className="px-6 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-accent/10">
            <Image className="h-4 w-4 text-accent" />
          </div>
          <h3 className="text-base font-bold tracking-wide text-foreground uppercase">
            Visual Aids
          </h3>
        </div>
        <CopyButton text={content} />
      </div>
      <CardContent className="px-6 pb-6 pt-2">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Fetching relevant medical images…
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {images.map((img, i) => (
              <a
                key={i}
                href={img.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-xl border border-border/50 overflow-hidden bg-secondary/20 transition-all hover:shadow-lg hover:scale-[1.02]"
              >
                <div className="aspect-square overflow-hidden bg-muted/30">
                  <img
                    src={img.thumb}
                    alt={img.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                </div>
                <div className="p-2.5 space-y-1">
                  <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">
                    {img.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    {img.source}
                    <ExternalLink className="h-2.5 w-2.5" />
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VisualExplanations;
