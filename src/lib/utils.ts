import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Open a URL in a new browser tab. In an iOS PWA running in standalone mode,
// window.open() is silently ignored and <a target="_blank"> links to the same
// domain stay inside the app (iOS never forwards them to Safari). Navigating
// same-tab is therefore the only reliable way to move to another page there;
// a normal browser keeps the new-tab behavior.
export function openInNewTab(url: string) {
  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true);

  if (isStandalone) {
    window.location.href = url;
    return;
  }

  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
