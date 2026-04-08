import { doc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { auth, db } from "./auth.js";

let excelData = [];
const mem = {};

const calcContainer = document.getElementById("calcContainer");
const historyContainer = document.getElementById("history");

export const addContainer = () => {
  calcContainer.innerHTML = `
    <div class="container shadow-deep">
      <div>
        <h2>1. Загрузите файл</h2>
        <div class="upload-wrapper">
          <input type="file" id="upload" accept=".xlsx, .xls" class="hidden-input" />
          <label for="upload" class="custom-file-button">
            📥 Загрузить файл 
          </label>
        </div>
      </div>
      <div id="extra-payments" class="step">
        <h2>2. Введите числа для расчета:</h2>
        <div class="input-row shadow-medium">
          <span class="text">Расходы на рекламу</span>
          <input type="number" class="cost-input" id="advertisement" placeholder="0" tabindex="1"/>
        </div>
        <div class="input-row shadow-medium">
          <span class="text">Процент налога (только число)</span>
          <input type="number" class="cost-input" id="tax" value="3" tabindex="2"/>
        </div>
      </div>
      <div id="costInputs" class="step">
        <h2>3. Введите себестоимость товаров:</h2>
        <div id="inputsContainer"></div>
        <button class="calculate-button" onclick="calculateTotal()">Посчитать итоги</button>
      </div>
    </div>`;

  const uploader = document.getElementById("upload");
  uploader.addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    console.log("file", file);
    window.fileName = file.name;
    reader.onload = function (e) {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      excelData = XLSX.utils.sheet_to_json(sheet);
      const articles = [
        ...new Set(
          excelData
            .filter((row) => {
              const pay = parseFloat(
                String(row["К перечислению Продавцу за реализованный Товар"]).replace(/[^\d.-]/g, ""),
              );
              return pay && pay > 0;
            })
            .map((row) => row["Артикул поставщика"]),
        ),
      ];

      renderCostInputs(articles);
    };
    reader.readAsArrayBuffer(file);
  });
};

const defaultCosts = [{ name: "Кол-во", value: 1, isSystem: true }];

document.addNewCostKey = (button) => {
  const row = button.closest(".cost-mgmt-container");
  const input = row.querySelector(".new-cost-input");
  const name = input.value.trim();

  if (!name) return alert("Введите название");

  if (!defaultCosts.find((i) => i.name === name)) {
    defaultCosts.push({ name: name, value: 0, isSystem: false });
  }

  Object.keys(mem).forEach((art) => {
    if (Array.isArray(mem[art]) && !mem[art].find((i) => i.name === name)) {
      mem[art].push({ name: name, value: 0, isSystem: false });
    }
  });

  const currentArticles = Array.from(document.querySelectorAll(".product-block")).map((el) => el.dataset.art);
  renderCostInputs(currentArticles);
};

const openedSpoilers = new Set();

window.toggleSpoiler = function (checkbox) {
  const productBlock = checkbox.closest(".product-block");
  const art = productBlock.getAttribute("data-art"); // Получаем артикул
  const spoiler = productBlock.querySelector(".spoiler-content");

  if (checkbox.checked) {
    spoiler.classList.add("is-open");
    openedSpoilers[art] = true;
  } else {
    spoiler.classList.remove("is-open");
    delete openedSpoilers[art];
  }
  localStorage.setItem("openedSpoilers", JSON.stringify(openedSpoilers));
};

function renderCostInputs(articles) {
  const container = document.getElementById("inputsContainer");
  container.innerHTML = articles.length > 0 ? "" : "<p>Нет данных</p>";

  articles.sort().forEach((art, index) => {
    if (!mem[art] || !Array.isArray(mem[art])) {
      mem[art] = defaultCosts.map((item) => ({ ...item }));
    }

    const currentCosts = mem[art];
    const isOpen = openedSpoilers[art] === true;

    const qtyObj = currentCosts.find((i) => i.isSystem);
    const itemCount = qtyObj ? qtyObj.value : 1;

    const costSum = currentCosts
      .filter((i) => !i.isSystem)
      .reduce((acc, cur) => acc + (Number.parseFloat(cur.value) || 0), 0);

    container.innerHTML += `
<div class="product-block shadow-medium" data-art="${art}">
  <div class="input-row">
    <span class="text">${art}</span>
    <div class="controls-wrapper">
        <label class="switch-label">
            Рассчитать
            <input type="checkbox" class="toggle-details" onchange="toggleSpoiler(this)" ${isOpen ? "checked" : ""}>
        </label>
        <input type="number" class="cost-input art-cost" data-art="${art}" value="0" tabindex=${index + 3}>
    </div>
  </div>
  <div class="spoiler-content ${isOpen ? "is-open" : ""}">
    <div class="spoiler-inner">
      <div class="spoiler-body">
        <table class="costTable">
          <tr class="s-field">
            <th>Наименование</th>
            <th>Сумма</th>
            <th>Штука</th>
          </tr>
          ${currentCosts
            .map(
              (item, index) => `
            <tr class="s-field">
                <td>${item.name}</td>
                <td class="total-cost">
                    <input type="number" name="${item.name}" class="s-input" value="${item.value}" oninput="calcSubtotal(this)">
                </td>
                <td class="unit-val">${item.isSystem ? "" : (item.value / itemCount).toFixed(2)}</td>
            </tr>
          `,
            )
            .join("")}
        </table>
        <div class="cost-mgmt-container">
            <h4 class="cost-mgmt-title">Добавить общую статью расхода</h4>
            <div class="new-cost-row">
                <input type="text" class="new-cost-input" name="new-cost-name"
                    onkeypress="if(event.key === 'Enter') { this.nextElementSibling.click(); }"
                    placeholder="Название (напр. Маркировка)">
                <button type="button" class="btnAddCost" onclick="addNewCostKey(this)">+ Добавить</button>
            </div>
        </div>

        <div class="spoiler-footer">
            Итого: <strong class="subtotal-display-total">${costSum}</strong> т |
            Итого за единицу: <strong class="subtotal-display-unit">${(costSum / itemCount).toFixed(2)}</strong> т.
        </div>
      </div>
    </div>
  </div>
</div>`;
  });

  document.getElementById("extra-payments").style.display = "flex";
  document.getElementById("costInputs").style.display = "block";
  document.getElementById("finalResult").innerHTML = "";
}

document.calcSubtotal = (input) => {
  const productBlock = input.closest(".product-block");
  const art = productBlock.dataset.art;
  const fieldName = input.name;
  const newVal = Number.parseFloat(input.value) || 0;

  const targetItem = mem[art].find((i) => i.name === fieldName);
  if (targetItem) targetItem.value = newVal;

  const qtyObj = mem[art].find((i) => i.isSystem);
  const quantity = qtyObj ? Number.parseFloat(qtyObj.value) || 1 : 1;

  const totalMoney = mem[art]
    .filter((i) => !i.isSystem)
    .reduce((acc, cur) => acc + (Number.parseFloat(cur.value) || 0), 0);

  const perUnit = (totalMoney / quantity).toFixed(2);

  productBlock.querySelectorAll(".s-field").forEach((row) => {
    const rowInput = row.querySelector(".s-input");
    const unitCell = row.querySelector(".unit-val");
    if (rowInput && unitCell) {
      const rowItem = mem[art].find((i) => i.name === rowInput.name);
      if (rowItem && !rowItem.isSystem) {
        unitCell.textContent = (rowItem.value / quantity).toFixed(2);
      }
    }
  });

  productBlock.querySelector(".subtotal-display-total").textContent = totalMoney;
  productBlock.querySelector(".subtotal-display-unit").textContent = perUnit;
  productBlock.querySelector(".art-cost").value = perUnit;
};

window.getReports = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Пользователь не авторизован");

    const reportsCollectionRef = collection(db, "userReports", user.uid, "reports");
    const querySnapshot = await getDocs(reportsCollectionRef);
    const reports = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const combinedReportData = [
      { key: "fileName", translatedLabel: "Отчет за", class: false },
      { key: "salesCount", translatedLabel: "Продаж", class: false },
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

    const getRightName = (str) => {
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
      console.log("str", str);
      return str
        .replace("Отчет за ", "")
        .replace(/(\d{4})-(\d{2})-(\d{2}) - \d{4}-\d{2}-(\d{2})/, (match, y, m, d1, d2) => {
          return `${months[parseInt(m) - 1]} ${parseInt(d1)}-${parseInt(d2)} (${y})`;
        });
    };

    historyContainer.innerHTML = `
      <div class="container shadow-deep">
        <h2>📊 История отчетов:</h3>
        <table class="history-table scrollable">
          ${combinedReportData
            .map((row) => {
              return `<tr class="${row.class}"><td>${row.translatedLabel}</td>${[...reports, ...reports]
                .map((item) => {
                  if (row.key == "fileName") {
                    return `<td>${getRightName(item[row.key])}</td>`;
                  } else {
                    return `<td>${getRightNumber(item[row.key])}</td>`;
                  }
                })
                .join("")}</tr>`;
            })
            .join("")}
        </table>
      </div>
    `;
    console.log("Все отчеты пользователя:", reports);
    return reports;
  } catch (error) {
    console.error("Ошибка при получении отчетов:", error);
  }
};

const getRightNumber = (number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number);

window.calculateTotal = () => {
  const costs = {};
  document.querySelectorAll(".cost-input").forEach((input) => {
    costs[input.dataset.art] = parseFloat(input.value) || 0;
  });

  let totals = {
    cost: 0,
    payout: 0,
    delivery: 0,
    penalties: 0,
    storage: 0,
    priceWithSale: 0,
    deductions: 0,
    advertisement: 0,
    taxProcent: 0,
  };

  totals.advertisement = document.getElementById("advertisement").value || 0;
  totals.taxProcent = document.getElementById("tax").value / 100;
  let salesCount = 0;
  const dates = new Set();
  excelData.forEach((row) => {
    const getVal = (key) => {
      const val = row[key];
      if (!val) return 0;
      const parsed = parseFloat(
        String(val)
          .replace(/[^\d.-]/g, "")
          .replace(",", "."),
      );
      return isNaN(parsed) ? 0 : parsed;
    };

    const payout = getVal("К перечислению Продавцу за реализованный Товар");
    const art = row["Артикул поставщика"];
    dates.add(row["Дата продажи"]);

    if (payout > 0) {
      totals.payout += payout;
      totals.cost += costs[art] || 0;
      salesCount++;
    }
    totals.delivery += getVal("Услуги по доставке товара покупателю");
    totals.penalties += getVal("Общая сумма штрафов");
    totals.storage += getVal("Хранение");
    totals.priceWithSale += getVal("Цена розничная с учетом согласованной скидки");
    totals.deductions += getVal("Удержания");
  });

  const payments = totals.payout - totals.delivery - totals.penalties - totals.storage - totals.deductions;
  const taxAmount = payments * totals.taxProcent;
  const totalIncome = payments - taxAmount - totals.cost - totals.advertisement;
  const incomePercent = (totalIncome * 100) / totals.cost;
  const DRR = (totals.advertisement * 100) / totals.priceWithSale;
  const fullReport = {
    ...totals,
    salesCount,
    incomePercent,
    payDiffirence: totals.priceWithSale - totals.payout,
    taxAmount,
    payments,
    totalIncome,
    DRR,
  };
  const finalResult = document.getElementById("finalResult");
  const finalResultsFields = [
    {
      class: false,
      label: "Продаж учтено",
      value: fullReport.salesCount,
      valueEnd: "шт.",
    },
    {
      class: "positive",
      label: "Сумма выплат",
      value: fullReport.priceWithSale,
      valueEnd: "тг.",
    },
    {
      class: "negative",
      label: "Разница выплат",
      value: fullReport.payDiffirence,
      valueEnd: "тг.",
    },
    {
      class: "positive",
      label: "Сумма выплат (К перечислению)",
      value: fullReport.payout,
      valueEnd: "тг.",
    },
    {
      class: "negative",
      label: "Доставка",
      value: fullReport.delivery,
      valueEnd: "тг.",
    },
    {
      class: "negative",
      label: "Штрафы",
      value: fullReport.penalties,
      valueEnd: "тг.",
    },
    {
      class: "negative",
      label: "Хранение",
      value: fullReport.storage,
      valueEnd: "тг.",
    },
    {
      class: "negative",
      label: "Удержания",
      value: fullReport.deductions,
      valueEnd: "тг.",
    },
    {
      class: "positive",
      label: "Выплаты после вычета расходов",
      value: fullReport.payments,
      valueEnd: "тг.",
    },
    {
      class: "negative",
      label: "Общая себестоимость",
      value: fullReport.cost,
      valueEnd: "тг.",
    },
    {
      class: "negative",
      label: "Налог",
      value: fullReport.taxAmount,
      valueEnd: "тг.",
    },
    {
      class: "negative",
      label: "Расходы на рекламу",
      value: fullReport.advertisement,
      valueEnd: "тг.",
    },
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
    {
      class: false,
      label: "DRR %",
      value: fullReport.DRR,
      valueEnd: "%",
    },
  ];

  window.saveReport = async () => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Пользователь не авторизован");

      console.log("Saving report for user:", user.uid);

      const reportId = `report_${Date.now()}`;
      const userDocRef = doc(db, "userReports", user.uid, "reports", reportId);
      const allDatesArr = [...dates];
      const reportWithMeta = {
        ...fullReport,
        userId: user.uid,
        createdAt: new Date().toISOString(),
        fileName: `Отчет за ${allDatesArr[0]} - ${allDatesArr[allDatesArr.length - 1]}`,
      };
      await setDoc(userDocRef, reportWithMeta);

      console.log("Saved successfully! ID:", reportId);
      alert("Отчет успешно сохранен!");
    } catch (error) {
      console.error("Error during report saving:", error.code, error.message);
      alert("Ошибка при сохранении: " + error.message);
    }
  };
  finalResult.innerHTML = `
    <div class="container shadow-deep">
        <h2>📊 Сводный отчет:</h3>
        <table class="result-table">
            ${finalResultsFields.map((field) => `<tr${field.class ? ` class="${field.class}"` : ""}><td>${field.label}:</td><td class="tableNumber">${getRightNumber(field.value)} ${field.valueEnd || ""}</td></tr>`).join("")}
        </table>
        <button class="calculate-button" onclick="saveReport()" >Сохранить</button>
    </div>
`;
  if (finalResult) {
    finalResult.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
};
