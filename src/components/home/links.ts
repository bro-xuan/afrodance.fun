/** Outside links open in a new tab without handing it the opener; on-site links stay in this tab. */
export function linkProps(href: string) {
  return href.startsWith("http") ? ({ target: "_blank", rel: "noopener noreferrer" } as const) : {};
}

/** "https://www.predictooor.xyz" → "predictooor.xyz" */
export function hostOf(href: string) {
  return new URL(href).hostname.replace(/^www\./, "");
}
