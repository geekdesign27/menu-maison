/** Full address of an in-app route, for links sent by message. */
export function appUrl(route: string) {
  return `${window.location.origin}/#${route}`;
}

/**
 * Opens the phone's share sheet (WhatsApp, Messages…), or copies the link
 * where sharing is not available. Returns what happened, or null if cancelled.
 */
export async function shareLink(
  url: string,
  text: string,
): Promise<"shared" | "copied" | null> {
  if (navigator.share) {
    try {
      await navigator.share({ text, url });
      return "shared";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return null;
      // Share sheet refused (desktop browsers): fall back to copying
    }
  }
  await navigator.clipboard.writeText(url);
  return "copied";
}
