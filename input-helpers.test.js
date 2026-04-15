import test from "node:test";
import assert from "node:assert/strict";

import { decodeAttrValue, encodeAttrValue, escapeHtml, sanitizeCostName } from "./input-helpers.js";

test("escapeHtml escapes dangerous characters", () => {
  const raw = `<img src="x" onerror='alert(1)'>&`;
  assert.equal(escapeHtml(raw), "&lt;img src=&quot;x&quot; onerror=&#39;alert(1)&#39;&gt;&amp;");
});

test("sanitizeCostName removes unsafe chars and truncates", () => {
  const raw = `  !!! Марк@ировка <> / test ${"a".repeat(100)}  `;
  const sanitized = sanitizeCostName(raw);
  assert.ok(!sanitized.includes("<"));
  assert.ok(!sanitized.includes(">"));
  assert.ok(!sanitized.includes("@"));
  assert.ok(sanitized.length <= 60);
});

test("encodeAttrValue and decodeAttrValue keep article key stable", () => {
  const original = `Артикул & "A/B" <1>`;
  const encoded = encodeAttrValue(original);
  const decoded = decodeAttrValue(encoded);
  assert.equal(decoded, original);
});
