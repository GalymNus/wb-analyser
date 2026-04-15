import {
  doc,
  setDoc,
  runTransaction,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { auth, db, getTokens } from "./auth.js";
import { calculateReport, extractArticles } from "./report-calculator.js";
import { buildFinalResultFields, formatNumber, formatReportName, historyRows } from "./report-formatters.js";
import { decodeAttrValue, encodeAttrValue, escapeHtml, sanitizeCostName } from "./input-helpers.js";

let excelData = [];
const mem = {};

const calcContainer = document.getElementById("calcContainer");
const historyContainer = document.getElementById("history");

window.toggleProductSalesSpoiler = (button) => {
  const detailsRow = button.closest("tr")?.nextElementSibling;
  if (!detailsRow) return;
  const isOpen = detailsRow.classList.toggle("is-open");
  button.textContent = isOpen ? "cкрыть" : "подробнее";
};

export async function spendToken() {
  try {
    const userDocRef = doc(db, "users", auth.currentUser.uid);
    const newTokens = await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userDocRef);
      if (!userDoc.exists()) {
        throw new Error("Пользователь не найден");
      }

      const credits = Number(userDoc.data().credits) || 0;
      if (credits < 1) {
        throw new Error("Недостаточно токенов");
      }

      const updatedCredits = credits - 1;
      transaction.update(userDocRef, {
        credits: updatedCredits,
      });

      return updatedCredits;
    });

    const authUserTokens = document.getElementById("authUserTokens");
    authUserTokens.innerText = `${newTokens} 🪙`;
    localStorage.setItem("tokens", newTokens);
  } catch (error) {
    console.error("Ошибка при списании токена:", error);
    throw error;
  }
}

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
  uploader.addEventListener("change", async function (e) {
    const currentTokens = await getTokens(auth.currentUser.uid);
    if (currentTokens < 1) {
      alert("Не достадочно токенов!");
      return;
    }
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
      const articles = extractArticles(excelData);

      renderCostInputs(articles);
    };
    reader.readAsArrayBuffer(file);
  });
};

const defaultCosts = [{ name: "Кол-во", value: 1, isSystem: true }];

document.addNewCostKey = (button) => {
  const row = button.closest(".cost-mgmt-container");
  const input = row.querySelector(".new-cost-input");
  const name = sanitizeCostName(input.value);
  input.value = name;

  if (!name) return alert("Введите название");

  if (!defaultCosts.find((i) => i.name === name)) {
    defaultCosts.push({ name: name, value: 0, isSystem: false });
  }

  Object.keys(mem).forEach((art) => {
    if (Array.isArray(mem[art]) && !mem[art].find((i) => i.name === name)) {
      mem[art].push({ name: name, value: 0, isSystem: false });
    }
  });

  const currentArticles = Array.from(document.querySelectorAll(".product-block")).map((el) =>
    decodeAttrValue(el.dataset.art),
  );
  renderCostInputs(currentArticles);
};

const openedSpoilers = new Set();

window.toggleSpoiler = function (checkbox) {
  const productBlock = checkbox.closest(".product-block");
  const art = decodeAttrValue(productBlock.getAttribute("data-art")); // Получаем артикул
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

    const safeArt = escapeHtml(art);
    const artAttrValue = encodeAttrValue(art);
    container.innerHTML += `
<div class="product-block shadow-medium" data-art="${artAttrValue}">
  <div class="input-row">
    <span class="text">${safeArt}</span>
    <div class="controls-wrapper">
        <label class="switch-label">
            Рассчитать
            <input type="checkbox" class="toggle-details" onchange="toggleSpoiler(this)" ${isOpen ? "checked" : ""}>
        </label>
        <input type="number" class="cost-input art-cost" data-art="${artAttrValue}" value="0" tabindex=${index + 3}>
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
                <td>${escapeHtml(item.name)}</td>
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
  const art = decodeAttrValue(productBlock.dataset.art);
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
    const reportsQuery = query(reportsCollectionRef, orderBy("fileName", "desc"), limit(5));
    const querySnapshot = await getDocs(reportsQuery);
    const reports = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    historyContainer.innerHTML = `
      <div class="container shadow-deep">
        <h2>📊 История отчетов:</h3>
        ${
          reports.length > 0
            ? `
        <table class="history-table scrollable ${reports.length === 1 ? "single-report" : ""}">
          ${historyRows
            .map((row) => {
              return `<tr class="${row.class}"><td>${row.translatedLabel}</td>${reports
                .map((report) => {
                  if (row.key == "fileName") {
                    return `<td>${escapeHtml(formatReportName(report[row.key]))}</td>`;
                  } else if (row.key == "productSales") {
                    const sortedReportSales = report[row.key].sort();
                    return `<td>${sortedReportSales
                      .map(({ name, salesCount }) => `${name}-${salesCount}`)
                      .join("<br>")}</td>`;
                  } else {
                    return `<td>${escapeHtml(formatNumber(report[row.key]))}</td>`;
                  }
                })
                .join("")}</tr>`;
            })
            .join("")}
        </table>`
            : `<span>Не найдено сохраненных отчетов.</span>`
        }
      </div>
    `;
    console.log("Все отчеты пользователя:", reports);
    return reports;
  } catch (error) {
    console.error("Ошибка при получении отчетов:", error);
  }
};

window.calculateTotal = async () => {
  if (!auth.currentUser?.uid) {
    alert("Пользователь не авторизован");
    return;
  }
  const currentTokens = await getTokens(auth.currentUser.uid);
  if (currentTokens < 1) {
    alert("Не достадочно токенов!");
    return;
  } else {
    await spendToken();
  }
  const costs = {};
  document.querySelectorAll(".cost-input").forEach((input) => {
    costs[decodeAttrValue(input.dataset.art)] = parseFloat(input.value) || 0;
  });

  const advertisementValue = document.getElementById("advertisement").value;
  const taxValue = document.getElementById("tax").value;
  const { fullReport, dates } = calculateReport(excelData, costs, advertisementValue, taxValue);
  const finalResult = document.getElementById("finalResult");
  const finalResultsFields = buildFinalResultFields(fullReport);
  const productRows = finalResultsFields.filter((field) => field.isCount);
  const mainRows = finalResultsFields.filter((field) => !field.isCount);

  window.saveReport = async () => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Пользователь не авторизован");

      console.log("Saving report for user:", user.uid);

      const reportId = `report_${Date.now()}`;
      const userDocRef = doc(db, "userReports", user.uid, "reports", reportId);
      const reportWithMeta = {
        ...fullReport,
        userId: user.uid,
        createdAt: new Date().toISOString(),
        fileName: `Отчет за ${dates[0]} - ${dates[dates.length - 1]}`,
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
            ${mainRows
              .map((field) => {
                const renderedValue = `${formatNumber(field.value)} ${field.valueEnd || ""}`;
                const baseRow = `<tr${field.class ? ` class="${field.class}"` : ""}><td>${escapeHtml(field.label)}:</td><td class="tableNumber">${renderedValue}</td></tr>`;
                if (field.label !== "Продаж учтено" || productRows.length === 0) {
                  return baseRow;
                }

                const salesRow = `<tr${field.class ? ` class="${field.class}"` : ""}>
                  <td class="product-sales-label">
                    ${escapeHtml(field.label)}:
                    <button type="button" class="product-sales-inline-toggle" onclick="toggleProductSalesSpoiler(this)">подробнее</button>
                  </td>
                  <td class="tableNumber">${renderedValue}</td>
                </tr>`;

                return `${salesRow}
                <tr class="product-sales-details-row">
                  <td colspan="2">
                    <table class="product-sales-table">
                      ${productRows
                        .map(
                          (row) =>
                            `<tr><td>${escapeHtml(row.label)}</td><td class="tableNumber">${row.value} ${row.valueEnd || ""}</td></tr>`,
                        )
                        .join("")}
                    </table>
                  </td>
                </tr>`;
              })
              .join("")}
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
