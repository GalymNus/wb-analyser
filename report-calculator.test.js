import test from "node:test";
import assert from "node:assert/strict";

import { calculateReport, extractArticles } from "./report-calculator.js";

test("extractArticles returns only unique articles with positive payout", () => {
  const rows = [
    {
      "Артикул поставщика": "A1",
      "К перечислению Продавцу за реализованный Товар": "100",
    },
    {
      "Артикул поставщика": "A1",
      "К перечислению Продавцу за реализованный Товар": "50",
    },
    {
      "Артикул поставщика": "A2",
      "К перечислению Продавцу за реализованный Товар": "0",
    },
    {
      "Артикул поставщика": "A3",
      "К перечислению Продавцу за реализованный Товар": "-1",
    },
  ];

  assert.deepEqual(extractArticles(rows), ["A1"]);
});

test("calculateReport computes totals and derived metrics", () => {
  const rows = [
    {
      "Артикул поставщика": "A1",
      "Дата продажи": "2026-01-01",
      "К перечислению Продавцу за реализованный Товар": "1000",
      "Услуги по доставке товара покупателю": "100",
      "Общая сумма штрафов": "50",
      Хранение: "20",
      "Цена розничная с учетом согласованной скидки": "1500",
      Удержания: "30",
    },
    {
      "Артикул поставщика": "A2",
      "Дата продажи": "2026-01-02",
      "К перечислению Продавцу за реализованный Товар": "500",
      "Услуги по доставке товара покупателю": "20",
      "Общая сумма штрафов": "0",
      Хранение: "10",
      "Цена розничная с учетом согласованной скидки": "700",
      Удержания: "0",
    },
  ];
  const costs = { A1: 300, A2: 100 };

  const { fullReport, dates } = calculateReport(rows, costs, 50, 10);

  assert.equal(fullReport.salesCount, 2);
  assert.equal(fullReport.payout, 1500);
  assert.equal(fullReport.delivery, 120);
  assert.equal(fullReport.penalties, 50);
  assert.equal(fullReport.storage, 30);
  assert.equal(fullReport.deductions, 30);
  assert.equal(fullReport.priceWithSale, 2200);
  assert.equal(fullReport.cost, 400);
  assert.equal(fullReport.payments, 1270);
  assert.equal(fullReport.taxAmount, 127);
  assert.equal(fullReport.totalIncome, 693);
  assert.equal(fullReport.payDiffirence, 700);
  assert.equal(fullReport.taxProcent, 0.1);
  assert.equal(fullReport.incomePercent, 173.25);
  assert.equal(fullReport.DRR, 2.272727272727273);
  assert.deepEqual(fullReport.productSales, [
    { name: "A1", salesCount: 1 },
    { name: "A2", salesCount: 1 },
  ]);
  assert.deepEqual(dates, ["2026-01-01", "2026-01-02"]);
});

test("calculateReport returns safe zeros for division by zero", () => {
  const rows = [
    {
      "Артикул поставщика": "A1",
      "Дата продажи": "2026-01-01",
      "К перечислению Продавцу за реализованный Товар": "0",
      "Услуги по доставке товара покупателю": "0",
      "Общая сумма штрафов": "0",
      Хранение: "0",
      "Цена розничная с учетом согласованной скидки": "0",
      Удержания: "0",
    },
  ];

  const { fullReport } = calculateReport(rows, {}, 0, 3);
  assert.equal(fullReport.incomePercent, 0);
  assert.equal(fullReport.DRR, 0);
});

test("calculateReport parses localized numbers and currency symbols", () => {
  const rows = [
    {
      "Артикул поставщика": "A1",
      "Дата продажи": "2026-02-01",
      "К перечислению Продавцу за реализованный Товар": "1 234,56 ₸",
      "Услуги по доставке товара покупателю": "10,10",
      "Общая сумма штрафов": "0",
      Хранение: "",
      "Цена розничная с учетом согласованной скидки": "2 000,00",
      Удержания: "5,50",
    },
  ];

  const { fullReport } = calculateReport(rows, { A1: 100 }, "12,5", "3");
  assert.equal(fullReport.payout, 1234.56);
  assert.equal(fullReport.delivery, 10.1);
  assert.equal(fullReport.deductions, 5.5);
  assert.equal(fullReport.advertisement, 12.5);
  assert.equal(fullReport.taxProcent, 0.03);
});

test("calculateReport groups sales by supplier article", () => {
  const rows = [
    {
      "Артикул поставщика": "A1",
      Наименование: "Кружка",
      "К перечислению Продавцу за реализованный Товар": "100",
    },
    {
      "Артикул поставщика": "A1",
      Наименование: "Кружка",
      "К перечислению Продавцу за реализованный Товар": "200",
    },
    {
      "Артикул поставщика": "A2",
      Наименование: "Термос",
      "К перечислению Продавцу за реализованный Товар": "300",
    },
  ];

  const { fullReport } = calculateReport(rows, {}, 0, 3);
  assert.deepEqual(fullReport.productSales, [
    { name: "A1", salesCount: 2 },
    { name: "A2", salesCount: 1 },
  ]);
});
