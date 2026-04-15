export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function encodeAttrValue(value) {
  return encodeURIComponent(String(value ?? ""));
}

export function decodeAttrValue(value) {
  return decodeURIComponent(String(value ?? ""));
}

export function sanitizeCostName(value) {
  const sanitized = String(value ?? "")
    .replace(/[^0-9A-Za-zА-Яа-яЁё\s().,_\-/%]/g, "")
    .trim();
  return sanitized.slice(0, 60);
}
