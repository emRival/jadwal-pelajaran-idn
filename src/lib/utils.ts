import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Open a URL in a new browser tab. In an iOS PWA running in standalone mode,
// window.open() is silently ignored, while a real <a target="_blank"> link is
// opened in Safari (where window.print() actually works). Using an anchor here
// keeps the behavior identical in a normal browser (new tab) and fixes printing
// from the home-screen bookmark on iPad.
export function openInNewTab(url: string) {
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
