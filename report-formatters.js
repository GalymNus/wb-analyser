export const historyRows = [
  { key: "fileName", translatedLabel: "Отчет за", class: false },
  { key: "salesCount", translatedLabel: "Продаж", class: false },
  { key: "productSales", translatedLabel: "Продажи по артиклям", class: "sales-count-row" },
  { key: "priceWithSale", translatedLabel: "Сумма выплат", class: "positive" },
  { key: "payDiffirence", translatedLabel: "Разница выплат", class: "negative" },
  { key: "payout", translatedLabel: "Сумма выплат (К перечислению)", class: "positive" },
  { key: "delivery", translatedLabel: "Доставка", class: "negative" },
  { key: "penalties", translatedLabel: "Штрафы", class: "negative" },
  { key: "storage", translatedLabel: "Хранение", class: "negative" },
  { key: "deductions", translatedLabel: "Удержания", class: "negative" },
  { key: "payments", translatedLabel: "Выплаты после вычета расходов", class: "positive" },
  { key: "cost", translatedLabel: "Себестоимость", class: "negative" },
  { key: "taxProcent", translatedLabel: "Налог %", class: "negative" },
  { key: "taxAmount", translatedLabel: "Налог", class: "negative" },
  { key: "advertisement", translatedLabel: "Реклама", class: "negative" },
  { key: "DRR", translatedLabel: "DRR %", class: false },
  { key: "totalIncome", translatedLabel: "Примерная чистая прибыль", class: "table-line total-row" },
  { key: "incomePercent", translatedLabel: "Процент прибыли", class: "total-row" },
];

export function formatNumber(number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(number) || 0);
}

export function formatReportName(name) {
  const months = [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
  ];

  if (!name) return "";

  return String(name)
    .replace("Отчет за ", "")
    .replace(/(\d{4})-(\d{2})-(\d{2}) - \d{4}-\d{2}-(\d{2})/, (match, y, m, d1, d2) => {
      return `${months[Number.parseInt(m, 10) - 1]} ${Number.parseInt(d1, 10)}-${Number.parseInt(d2, 10)} (${y})`;
    });
}

export function buildFinalResultFields(fullReport) {
  const fields = [
    { class: false, label: "Продаж учтено", value: fullReport.salesCount, valueEnd: "шт." },
    { class: "positive", label: "Сумма выплат", value: fullReport.priceWithSale, valueEnd: "тг." },
    { class: "negative", label: "Разница выплат", value: fullReport.payDiffirence, valueEnd: "тг." },
    { class: "positive", label: "Сумма выплат (К перечислению)", value: fullReport.payout, valueEnd: "тг." },
    { class: "negative", label: "Доставка", value: fullReport.delivery, valueEnd: "тг." },
    { class: "negative", label: "Штрафы", value: fullReport.penalties, valueEnd: "тг." },
    { class: "negative", label: "Хранение", value: fullReport.storage, valueEnd: "тг." },
    { class: "negative", label: "Удержания", value: fullReport.deductions, valueEnd: "тг." },
    { class: "positive", label: "Выплаты после вычета расходов", value: fullReport.payments, valueEnd: "тг." },
    { class: "negative", label: "Общая себестоимость", value: fullReport.cost, valueEnd: "тг." },
    { class: "negative", label: "Налог", value: fullReport.taxAmount, valueEnd: "тг." },
    { class: "negative", label: "Расходы на рекламу", value: fullReport.advertisement, valueEnd: "тг." },
    {
      class: `table-line total-row ${fullReport.incomePercent > 50 ? "positive" : "negative"}`,
      label: "Примерная чистая прибыль",
      value: fullReport.totalIncome,
      valueEnd: "тг.",
    },
    {
      class: `total-row ${fullReport.incomePercent > 50 ? "positive" : "negative"}`,
      label: "Прибыль %",
      value: fullReport.incomePercent,
      valueEnd: "%",
    },
    { class: false, label: "DRR %", value: fullReport.DRR, valueEnd: "%" },
  ];

  if (Array.isArray(fullReport.productSales) && fullReport.productSales.length > 0) {
    const productRows = fullReport.productSales.map((item) => ({
      class: false,
      label: item.name,
      value: item.salesCount,
      valueEnd: "шт.",
      isCount: true,
    }));
    fields.splice(1, 0, ...productRows);
  }

  return fields;
}
