/** Flat stickers that sit inside a headline like a word would. Decorative, so hidden from assistive tech. */
export function FolderSticker() {
  return (
    <svg className="sticker sticker-folder" viewBox="0 0 72 60" aria-hidden="true" focusable="false">
      <path d="M6 14c0-3 2-5 5-5h16l6 7h28c3 0 5 2 5 5v26c0 3-2 5-5 5H11c-3 0-5-2-5-5V14z" fill="var(--hi)" stroke="var(--on-hi)" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M6 24h60" stroke="var(--on-hi)" strokeWidth="3.5" />
    </svg>
  );
}

export function PlaySticker() {
  return (
    <svg className="sticker sticker-play" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <circle cx="32" cy="32" r="28" fill="var(--on-hi)" />
      <path d="M26 20l18 12-18 12z" fill="var(--hi)" stroke="var(--hi)" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

export function Check({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      <path d="M5.5 12.5l4.2 4.2L18.5 7.5" fill="none" stroke="var(--hi)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LogoMark() {
  return (
    <svg className="logo-mark" viewBox="0 0 28 28" aria-hidden="true" focusable="false">
      <rect width="28" height="28" rx="8" fill="var(--hi)" />
      <path d="M6.5 10.5c0-1.4 1-2.2 2.2-2.2h4l1.6 2h5c1.2 0 2.2.8 2.2 2.2v6.4c0 1.4-1 2.2-2.2 2.2H8.7c-1.2 0-2.2-.8-2.2-2.2v-8.4z" fill="none" stroke="var(--on-hi)" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
