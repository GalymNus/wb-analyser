function toNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number.parseFloat(
    String(value)
      .replace(/[^\d.,-]/g, "")
      .replace(",", "."),
  );
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function extractArticles(excelData) {
  return [
    ...new Set(
      excelData
        .filter((row) => toNumber(row["К перечислению Продавцу за реализованный Товар"]) > 0)
        .map((row) => row["Артикул поставщика"]),
    ),
  ];
}

export function calculateReport(excelData, costs, advertisement, taxPercent) {
  const totals = {
    cost: 0,
    payout: 0,
    delivery: 0,
    penalties: 0,
    storage: 0,
    priceWithSale: 0,
    deductions: 0,
    advertisement: toNumber(advertisement),
    taxProcent: toNumber(taxPercent) / 100,
  };

  let salesCount = 0;
  const dates = new Set();
  const productSalesMap = {};

  excelData.forEach((row) => {
    const payout = toNumber(row["К перечислению Продавцу за реализованный Товар"]);
    const art = row["Артикул поставщика"];
    dates.add(row["Дата продажи"]);

    if (payout > 0) {
      totals.payout += payout;
      totals.cost += costs[art] || 0;
      salesCount += 1;

      const productName = String(art || "Без артикула").trim() || "Без артикула";
      const key = productName;
      if (!productSalesMap[key]) {
        productSalesMap[key] = { name: productName, salesCount: 0 };
      }
      productSalesMap[key].salesCount += 1;
    }

    totals.delivery += toNumber(row["Услуги по доставке товара покупателю"]);
    totals.penalties += toNumber(row["Общая сумма штрафов"]);
    totals.storage += toNumber(row["Хранение"]);
    totals.priceWithSale += toNumber(row["Цена розничная с учетом согласованной скидки"]);
    totals.deductions += toNumber(row["Удержания"]);
  });

  const payments = totals.payout - totals.delivery - totals.penalties - totals.storage - totals.deductions;
  const taxAmount = payments * totals.taxProcent;
  const totalIncome = payments - taxAmount - totals.cost - totals.advertisement;
  const incomePercent = totals.cost ? (totalIncome * 100) / totals.cost : 0;
  const DRR = totals.priceWithSale ? (totals.advertisement * 100) / totals.priceWithSale : 0;
  const productSales = Object.values(productSalesMap).sort((a, b) => b.salesCount - a.salesCount);

  return {
    fullReport: {
      ...totals,
      salesCount,
      productSales,
      incomePercent,
      payDiffirence: totals.priceWithSale - totals.payout,
      taxAmount,
      payments,
      totalIncome,
      DRR,
    },
    dates: [...dates],
  };
}
