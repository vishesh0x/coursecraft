/** Flat stickers that sit inside a headline like a word would. Decorative, so hidden from assistive tech. */
export function FolderSticker() {
  return (
    <svg className="sticker sticker-folder" viewBox="0 0 72 60" aria-hidden="true" focusable="false">
      <path d="M6 14c0-3 2-5 5-5h16l6 7h28c3 0 5 2 5 5v26c0 3-2 5-5 5H11c-3 0-5-2-5-5V14z" fill="#f5e642" stroke="#18181b" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M6 24h60" stroke="#18181b" strokeWidth="3.5" />
    </svg>
  );
}

export function PlaySticker() {
  return (
    <svg className="sticker sticker-play" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <circle cx="32" cy="32" r="28" fill="#18181b" />
      <path d="M26 20l18 12-18 12z" fill="#f5e642" stroke="#f5e642" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

export function Check({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="11" fill="#f5e642" />
      <path d="M7 12.5l3.2 3.2L17 8.8" fill="none" stroke="#18181b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LogoMark() {
  return (
    <svg className="logo-mark" viewBox="0 0 28 28" aria-hidden="true" focusable="false">
      <rect width="28" height="28" rx="8" fill="#f5e642" />
      <path d="M6.5 10.5c0-1.4 1-2.2 2.2-2.2h4l1.6 2h5c1.2 0 2.2.8 2.2 2.2v6.4c0 1.4-1 2.2-2.2 2.2H8.7c-1.2 0-2.2-.8-2.2-2.2v-8.4z" fill="none" stroke="#18181b" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
