// dev.menumaison.ch, the online test version (VITE_SITE_ENV at build time):
// marked everywhere, so it is never taken for the real one.
export const IS_DEV_SITE = import.meta.env.VITE_SITE_ENV === "dev";

/** The tab title, « DEV · » first on the test version. */
export function siteTitle(title: string): string {
  return IS_DEV_SITE ? `DEV · ${title}` : title;
}
