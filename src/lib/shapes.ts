/** A clip-path polygon with a sawtooth cut along the top and/or bottom edge, so a filled panel reads as torn paper. */
export function zigzag(teeth: number, depth: number, edges: { top?: boolean; bottom?: boolean }): string {
  const step = 100 / teeth;
  const points: string[] = [];

  if (edges.top) {
    for (let i = 0; i < teeth; i++) points.push(`${(i * step).toFixed(3)}% ${depth}px`, `${(i * step + step / 2).toFixed(3)}% 0`);
    points.push(`100% ${depth}px`);
  } else points.push("0 0", "100% 0");

  if (edges.bottom) {
    points.push(`100% calc(100% - ${depth}px)`);
    for (let i = teeth; i > 0; i--) points.push(`${(i * step).toFixed(3)}% calc(100% - ${depth}px)`, `${(i * step - step / 2).toFixed(3)}% 100%`);
    points.push(`0 calc(100% - ${depth}px)`);
  } else points.push("100% 100%", "0 100%");

  return `polygon(${points.join(", ")})`;
}

/** SVG path for a row of semicircular scallops, filled below. Used on the back-of-the-card footer. */
export function scallopPath(count: number, width = 1200, height = 40): string {
  const step = width / count;
  let d = `M0 ${height}`;
  for (let i = 0; i < count; i++) d += ` A${step / 2} ${height} 0 0 1 ${(i + 1) * step} ${height}`;
  return `${d} L${width} ${height} Z`;
}
