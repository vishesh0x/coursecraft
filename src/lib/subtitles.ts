/** Convert SubRip (or pass through WebVTT) so <track> can read it. */
export function srtToVtt(input: string): string {
  const normalized = input.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  if (/^WEBVTT(?:\s|$)/.test(normalized)) return `${normalized}\n`;

  const stamp = String.raw`(?:\d{2,}:)?\d{2}:\d{2}[,.]\d{3}`;
  const timing = new RegExp(`^\\s*(${stamp})\\s*-->\\s*(${stamp})(.*)$`);
  const fix = (value: string): string => {
    const t = value.replace(",", ".");
    return /^\d{2}:\d{2}\.\d{3}$/.test(t) ? `00:${t}` : t;
  };

  const cues: string[] = [];
  for (const block of normalized.split(/\n[ \t]*\n/)) {
    const lines = block.split("\n");
    const at = lines.findIndex((line) => timing.test(line));
    if (at === -1) continue;
    const match = lines[at].match(timing)!;
    const settings = match[3].trim();
    const kept = /^(?:(?:align|position|size|line|vertical):\S+\s*)+$/.test(settings) ? ` ${settings}` : "";
    const body = lines.slice(at + 1).join("\n");
    if (!body.trim()) continue;
    cues.push(`${fix(match[1])} --> ${fix(match[2])}${kept}\n${body}`);
  }
  return `WEBVTT\n\n${cues.join("\n\n")}\n`;
}
