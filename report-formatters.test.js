import test from "node:test";
import assert from "node:assert/strict";

import { buildFinalResultFields, formatNumber, formatReportName, historyRows } from "./report-formatters.js";

test("formatNumber formats to two decimals", () => {
  assert.equal(formatNumber(1234.5), "1,234.50");
  assert.equal(formatNumber("not-a-number"), "0.00");
});

test("formatReportName converts report date range to localized label", () => {
  const input = "Отчет за 2025-03-01 - 2025-03-15";
  assert.equal(formatReportName(input), "Март 1-15 (2025)");
});

test("formatReportName keeps original tail for unknown format", () => {
  const input = "Отчет за custom period";
  assert.equal(formatReportName(input), "custom period");
});

test("buildFinalResultFields returns stable report fields", () => {
  const fields = buildFinalResultFields({
    salesCount: 1,
    priceWithSale: 100,
    payDiffirence: 10,
    payout: 90,
    delivery: 2,
    penalties: 1,
    storage: 1,
    deductions: 0,
    payments: 86,
    cost: 50,
    taxAmount: 5,
    advertisement: 3,
    totalIncome: 28,
    incomePercent: 56,
    DRR: 3.33,
    productSales: [],
  });

  assert.equal(fields.length, 15);
  assert.equal(fields[0].label, "Продаж учтено");
  assert.equal(fields[12].class, "table-line total-row positive");
  assert.equal(fields[14].label, "DRR %");
});

test("buildFinalResultFields marks low income as negative", () => {
  const fields = buildFinalResultFields({
    salesCount: 1,
    priceWithSale: 100,
    payDiffirence: 10,
    payout: 90,
    delivery: 2,
    penalties: 1,
    storage: 1,
    deductions: 0,
    payments: 86,
    cost: 50,
    taxAmount: 5,
    advertisement: 3,
    totalIncome: 10,
    incomePercent: 20,
    DRR: 3.33,
    productSales: [],
  });

  assert.equal(fields[12].class, "table-line total-row negative");
  assert.equal(fields[13].class, "total-row negative");
});

test("buildFinalResultFields adds per-product sales row", () => {
  const fields = buildFinalResultFields({
    salesCount: 3,
    priceWithSale: 100,
    payDiffirence: 10,
    payout: 90,
    delivery: 2,
    penalties: 1,
    storage: 1,
    deductions: 0,
    payments: 86,
    cost: 50,
    taxAmount: 5,
    advertisement: 3,
    totalIncome: 10,
    incomePercent: 20,
    DRR: 3.33,
    productSales: [
      { name: "A1", salesCount: 2 },
      { name: "A2", salesCount: 1 },
    ],
  });

  assert.equal(fields[1].label, "A1");
  assert.equal(fields[1].isCount, true);
  assert.equal(fields[1].value, 2);
  assert.equal(fields[2].label, "A2");
  assert.equal(fields[2].value, 1);
});

test("historyRows contains report keys mapping", () => {
  assert.ok(historyRows.length > 10);
  assert.equal(historyRows[0].key, "fileName");
});
