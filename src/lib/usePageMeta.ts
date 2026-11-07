import { useEffect } from "react";

const DEFAULT_DESCRIPTION =
  "Coursecraft plays the course folder already on your disk: chapters, lessons, captions, and where you stopped. Nothing is uploaded.";

function setMeta(name: string, content: string | null): void {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (content === null) { tag?.remove(); return; }
  if (!tag) { tag = document.createElement("meta"); tag.name = name; document.head.append(tag); }
  tag.content = content;
}

export function usePageMeta(title: string, options: { description?: string; noindex?: boolean } = {}): void {
  const { description = DEFAULT_DESCRIPTION, noindex = false } = options;
  useEffect(() => {
    document.title = title;
    setMeta("description", description);
    setMeta("robots", noindex ? "noindex" : null);
  }, [title, description, noindex]);
}
