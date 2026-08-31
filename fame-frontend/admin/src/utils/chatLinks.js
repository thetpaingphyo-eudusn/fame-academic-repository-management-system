/** Normalize chat markdown / API link hrefs to in-app React Router paths. */
export function normalizeChatRoute(href) {
  if (!href) return "/";
  let h = String(href).trim();

  h = h.replace(/^https:\/(?!\/)/i, "https://").replace(/^http:\/(?!\/)/i, "http://");

  if (h.startsWith("/") && !h.startsWith("//")) return h;

  if (/^https?:\/\//i.test(h) || /example\.com/i.test(h)) {
    try {
      const url = new URL(/^https?:\/\//i.test(h) ? h : `https://${h.replace(/^\/+/, "")}`);
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      const m = h.match(/example\.com(\/[^?\s#]*)?(\?[^\s#)]*)?/i);
      if (m) return `${m[1] || "/projects"}${m[2] || ""}`;
    }
  }

  if (!h.startsWith("/")) h = `/${h.replace(/^\/+/, "")}`;
  return h;
}

export function isExternalChatRoute(href) {
  const route = normalizeChatRoute(href);
  return /^https?:\/\//i.test(route) || route.startsWith("//");
}
