// FruitMoney Client Application Controller

const EXPENSE_CATEGORIES = [
  "Housing & Rent",
  "Groceries & Food",
  "Dining Out",
  "Utilities & Bills",
  "Transportation",
  "Entertainment",
  "Shopping",
  "Healthcare",
  "Personal Care",
  "Education",
  "Travel",
  "Miscellaneous"
];

const INCOME_CATEGORIES = [
  "Salary",
  "Freelance / Side Gig",
  "Investments",
  "Gifts",
  "Refunds",
  "Other Income"
];

const QUICK_PRESETS = [
  { name: "☕ Coffee ($5)", type: "expense", category: "Dining Out", amount: 5.0, desc: "Coffee" },
  { name: "🛒 Groceries ($50)", type: "expense", category: "Groceries & Food", amount: 50.0, desc: "Grocery run" },
  { name: "⛽ Gas ($40)", type: "expense", category: "Transportation", amount: 40.0, desc: "Gas station" },
  { name: "🍽️ Lunch ($15)", type: "expense", category: "Dining Out", amount: 15.0, desc: "Quick lunch" },
  { name: "🎬 Streaming ($15)", type: "expense", category: "Entertainment", amount: 15.0, desc: "Monthly streaming sub" },
  { name: "💰 Paycheck", type: "income", category: "Salary", amount: 2000.0, desc: "Bi-weekly paycheck" }
];

const CHART_COLORS = [
  "#1C6CFF", "#00CC4B", "#FECE4C", "#FF4433", "#BF5AF2",
  "#32D74B", "#FF375F", "#64D2FF", "#FF9F0A", "#5E5CE6"
];

// App State
let currentMonth = "";
let currentBudgets = [];
let editingTransactionId = null;

// DOM Elements
const monthPicker = document.getElementById("monthPicker");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");
const currentMonthBtn = document.getElementById("currentMonthBtn");

const totalIncomeEl = document.getElementById("totalIncome");
const totalExpensesEl = document.getElementById("totalExpenses");
const netBalanceEl = document.getElementById("netBalance");
const budgetSpentPercentEl = document.getElementById("budgetSpentPercent");
const budgetLimitSubEl = document.getElementById("budgetLimitSub");
const incomeCountEl = document.getElementById("incomeCount");
const expenseCountEl = document.getElementById("expenseCount");
const savingsRateBadgeEl = document.getElementById("savingsRateBadge");

const budgetProgressList = document.getElementById("budgetProgressList");
const chartCanvas = document.getElementById("expenseChartCanvas");
const chartLegend = document.getElementById("chartLegend");

const searchInput = document.getElementById("searchInput");
const typeFilter = document.getElementById("typeFilter");
const categoryFilter = document.getElementById("categoryFilter");
const transactionsTableBody = document.getElementById("transactionsTableBody");
const emptyTransactionsState = document.getElementById("emptyTransactionsState");
const transactionsSubtitle = document.getElementById("transactionsSubtitle");

// Modals
const transactionModal = document.getElementById("transactionModal");
const openAddModalBtn = document.getElementById("openAddModalBtn");
const emptyAddBtn = document.getElementById("emptyAddBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelModalBtn = document.getElementById("cancelModalBtn");
const transactionForm = document.getElementById("transactionForm");
const modalTitle = document.getElementById("modalTitle");
const editTransactionIdInput = document.getElementById("editTransactionId");
const transAmount = document.getElementById("transAmount");
const transDate = document.getElementById("transDate");
const transCategory = document.getElementById("transCategory");
const transDescription = document.getElementById("transDescription");
const quickPresetsContainer = document.getElementById("quickPresetsContainer");

const budgetModal = document.getElementById("budgetModal");
const manageBudgetsBtn = document.getElementById("manageBudgetsBtn");
const quickEditBudgetBtn = document.getElementById("quickEditBudgetBtn");
const closeBudgetModalBtn = document.getElementById("closeBudgetModalBtn");
const doneBudgetModalBtn = document.getElementById("doneBudgetModalBtn");
const budgetEditorList = document.getElementById("budgetEditorList");
const addCategoryBudgetForm = document.getElementById("addCategoryBudgetForm");
const newCategoryName = document.getElementById("newCategoryName");
const newCategoryLimit = document.getElementById("newCategoryLimit");

const exportCsvBtn = document.getElementById("exportCsvBtn");
const toastEl = document.getElementById("toast");

// Initialize application
document.addEventListener("DOMContentLoaded", () => {
  initDateControls();
  initEventListeners();
  loadAllData();
});

function initDateControls() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  currentMonth = `${year}-${month}`;
  monthPicker.value = currentMonth;

  // Default transaction date to today
  const day = String(now.getDate()).padStart(2, "0");
  transDate.value = `${year}-${month}-${day}`;
}

function initEventListeners() {
  // Month selector
  monthPicker.addEventListener("change", (e) => {
    currentMonth = e.target.value;
    loadAllData();
  });

  prevMonthBtn.addEventListener("click", () => changeMonth(-1));
  nextMonthBtn.addEventListener("click", () => changeMonth(1));
  currentMonthBtn.addEventListener("click", () => {
    initDateControls();
    loadAllData();
  });

  // Filter listeners
  let searchTimeout;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(fetchTransactions, 250);
  });

  typeFilter.addEventListener("change", () => {
    populateCategoryFilterOptions();
    fetchTransactions();
  });

  categoryFilter.addEventListener("change", fetchTransactions);

  // Add / Edit Transaction Modal
  openAddModalBtn.addEventListener("click", () => openTransactionModal());
  emptyAddBtn.addEventListener("click", () => openTransactionModal());
  closeModalBtn.addEventListener("click", closeTransactionModal);
  cancelModalBtn.addEventListener("click", closeTransactionModal);

  // Type change in modal form
  const typeRadios = document.querySelectorAll('input[name="transType"]');
  typeRadios.forEach(radio => {
    radio.addEventListener("change", (e) => {
      populateCategorySelect(e.target.value);
      renderQuickPresets(e.target.value);
    });
  });

  transactionForm.addEventListener("submit", handleTransactionSubmit);

  // Budget Management Modal
  manageBudgetsBtn.addEventListener("click", openBudgetModal);
  quickEditBudgetBtn.addEventListener("click", openBudgetModal);
  closeBudgetModalBtn.addEventListener("click", closeBudgetModal);
  doneBudgetModalBtn.addEventListener("click", closeBudgetModal);
  addCategoryBudgetForm.addEventListener("submit", handleAddBudgetSubmit);

  // CSV Export
  exportCsvBtn.addEventListener("click", () => {
    window.location.href = "/api/export";
    showToast("Exporting transactions to CSV...");
  });

  // Close modals when clicking backdrop
  window.addEventListener("click", (e) => {
    if (e.target === transactionModal) closeTransactionModal();
    if (e.target === budgetModal) closeBudgetModal();
  });
}

function changeMonth(delta) {
  const [yearStr, monthStr] = currentMonth.split("-");
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10) + delta;

  if (month < 1) {
    month = 12;
    year -= 1;
  } else if (month > 12) {
    month = 1;
    year += 1;
  }

  currentMonth = `${year}-${String(month).padStart(2, "0")}`;
  monthPicker.value = currentMonth;
  loadAllData();
}

async function loadAllData() {
  await Promise.all([
    fetchSummary(),
    fetchBudgets(),
    fetchTransactions()
  ]);
  populateCategoryFilterOptions();
}

// Fetch and Render Summary Dashboard
async function fetchSummary() {
  try {
    const res = await fetch(`/api/summary?month=${currentMonth}`);
    const data = await res.json();
    if (res.ok) {
      renderSummaryCards(data);
      renderBudgetProgress(data.budget_status);
      renderExpenseChart(data.category_expenses);
    } else {
      showToast(data.error || "Failed to load summary", "error");
    }
  } catch (err) {
    console.error(err);
  }
}

function formatCurrency(num) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2
  }).format(num || 0);
}

function renderSummaryCards(data) {
  totalIncomeEl.textContent = formatCurrency(data.total_income);
  totalExpensesEl.textContent = formatCurrency(data.total_expenses);
  netBalanceEl.textContent = formatCurrency(data.net_savings);

  // Savings rate
  if (data.total_income > 0) {
    const rate = ((data.net_savings / data.total_income) * 100).toFixed(1);
    savingsRateBadgeEl.textContent = `${rate}% Savings Rate`;
    savingsRateBadgeEl.style.display = "inline-block";
  } else {
    savingsRateBadgeEl.style.display = "none";
  }

  // Budget spent percentage
  if (data.total_budget_limit > 0) {
    const pct = ((data.total_expenses / data.total_budget_limit) * 100).toFixed(1);
    budgetSpentPercentEl.textContent = `${pct}%`;
    budgetLimitSubEl.textContent = `Limit: ${formatCurrency(data.total_budget_limit)}`;
  } else {
    budgetSpentPercentEl.textContent = "N/A";
    budgetLimitSubEl.textContent = "No budget limits set";
  }

  transactionsSubtitle.textContent = `Showing transactions for ${formatMonthHeader(currentMonth)}`;
}

function formatMonthHeader(ym) {
  const [year, month] = ym.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// Render Category Budget Progress Bars
function renderBudgetProgress(budgetStatus) {
  budgetProgressList.innerHTML = "";

  if (!budgetStatus || budgetStatus.length === 0) {
    budgetProgressList.innerHTML = `
      <div class="empty-state" style="padding: 20px 0;">
        <p>No budget limits configured.</p>
        <button class="btn btn-secondary btn-sm" onclick="openBudgetModal()">Set Monthly Budgets</button>
      </div>
    `;
    return;
  }

  // Sort: highest percentage spent first
  const sorted = [...budgetStatus].sort((a, b) => b.percentage - a.percentage);

  sorted.forEach(item => {
    const isOver = item.limit > 0 && item.spent > item.limit;
    let statusClass = "safe";
    if (item.percentage >= 100 || (item.limit === 0 && item.spent > 0)) {
      statusClass = "danger";
    } else if (item.percentage >= 80) {
      statusClass = "warning";
    }

    const fillWidth = Math.min(Math.max(item.percentage, 0), 100);

    const div = document.createElement("div");
    div.className = "budget-progress-item";
    div.innerHTML = `
      <div class="budget-item-meta">
        <span class="budget-category-title">${escapeHtml(item.category)}</span>
        <div class="budget-spent-info">
          <span class="budget-spent-amount">${formatCurrency(item.spent)}</span>
          ${item.limit > 0 ? `/ ${formatCurrency(item.limit)} (${item.percentage}%)` : '<span style="color:var(--text-light)">(No limit)</span>'}
        </div>
      </div>
      <div class="progress-bar-bg" title="${isOver ? 'Over budget!' : `${item.percentage}% used`}">
        <div class="progress-bar-fill ${statusClass}" style="width: ${fillWidth}%"></div>
      </div>
    `;
    budgetProgressList.appendChild(div);
  });
}

// Render HTML5 Canvas Donut Chart for Expense Breakdown
function renderExpenseChart(categoryExpenses) {
  const ctx = chartCanvas.getContext("2d");
  const width = chartCanvas.width;
  const height = chartCanvas.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(centerX, centerY) - 10;
  const innerRadius = radius * 0.58;

  ctx.clearRect(0, 0, width, height);
  chartLegend.innerHTML = "";

  const categories = Object.keys(categoryExpenses || {});
  const total = categories.reduce((sum, cat) => sum + categoryExpenses[cat], 0);

  if (categories.length === 0 || total === 0) {
    // Draw empty state circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = radius - innerRadius;
    ctx.stroke();

    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 13px Plus Jakarta Sans, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("No Expenses", centerX, centerY);
    return;
  }

  let startAngle = -Math.PI / 2;

  categories.forEach((cat, index) => {
    const amount = categoryExpenses[cat];
    const sliceAngle = (amount / total) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;
    const color = CHART_COLORS[index % CHART_COLORS.length];

    // Draw donut slice
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    startAngle = endAngle;

    // Legend item
    const pct = ((amount / total) * 100).toFixed(1);
    const legendItem = document.createElement("div");
    legendItem.className = "legend-item";
    legendItem.innerHTML = `
      <div class="legend-color" style="background: ${color}"></div>
      <span>${escapeHtml(cat)}</span>
      <span class="legend-pct">${formatCurrency(amount)} (${pct}%)</span>
    `;
    chartLegend.appendChild(legendItem);
  });

  // Center text inside donut
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.font = "bold 16px Plus Jakarta Sans, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(formatCurrency(total), centerX, centerY - 6);

  ctx.fillStyle = "#7F8BA4";
  ctx.font = "11px Plus Jakarta Sans, sans-serif";
  ctx.fillText("Total Spent", centerX, centerY + 14);
}

// Fetch and Render Transactions Table
async function fetchTransactions() {
  const search = searchInput.value.trim();
  const type = typeFilter.value;
  const category = categoryFilter.value;

  let url = `/api/transactions?month=${currentMonth}`;
  if (type !== "all") url += `&type=${encodeURIComponent(type)}`;
  if (category !== "all") url += `&category=${encodeURIComponent(category)}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (res.ok) {
      renderTransactionsTable(data.transactions);
    }
  } catch (err) {
    console.error(err);
  }
}

function renderTransactionsTable(transactions) {
  transactionsTableBody.innerHTML = "";

  if (!transactions || transactions.length === 0) {
    emptyTransactionsState.style.display = "block";
    return;
  }
  emptyTransactionsState.style.display = "none";

  // Update counts
  const incomeCount = transactions.filter(t => t.type === "income").length;
  const expenseCount = transactions.filter(t => t.type === "expense").length;
  incomeCountEl.textContent = `${incomeCount} transactions`;
  expenseCountEl.textContent = `${expenseCount} transactions`;

  transactions.forEach(t => {
    const isIncome = t.type === "income";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-weight: 500;">${t.date}</td>
      <td>
        <span class="badge ${isIncome ? 'badge-income' : 'badge-expense'}">
          ${isIncome ? '📈 Income' : '📉 Expense'}
        </span>
      </td>
      <td><span class="badge badge-category">${escapeHtml(t.category)}</span></td>
      <td style="color: ${t.description ? '#334155' : '#94a3b8'};">
        ${t.description ? escapeHtml(t.description) : '<em>No description</em>'}
      </td>
      <td class="text-right ${isIncome ? 'amount-income' : 'amount-expense'}">
        ${isIncome ? '+' : '-'}${formatCurrency(t.amount)}
      </td>
      <td class="text-center">
        <button class="table-action-btn edit-btn" onclick="editTransaction(${t.id})" title="Edit">✏️</button>
        <button class="table-action-btn delete-btn" onclick="deleteTransaction(${t.id})" title="Delete">🗑️</button>
      </td>
    `;
    transactionsTableBody.appendChild(tr);
  });
}

// Category filter dropdown options
function populateCategoryFilterOptions() {
  const currentVal = categoryFilter.value;
  const selectedType = typeFilter.value;

  categoryFilter.innerHTML = '<option value="all">All Categories</option>';
  let cats = [];

  if (selectedType === "income") {
    cats = INCOME_CATEGORIES;
  } else if (selectedType === "expense") {
    cats = EXPENSE_CATEGORIES;
  } else {
    cats = Array.from(new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]));
  }

  cats.sort().forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categoryFilter.appendChild(opt);
  });

  if (Array.from(categoryFilter.options).some(o => o.value === currentVal)) {
    categoryFilter.value = currentVal;
  }
}

// Modal Functions: Add & Edit Transaction
function openTransactionModal(existingData = null) {
  transactionForm.reset();
  editingTransactionId = existingData ? existingData.id : null;
  editTransactionIdInput.value = editingTransactionId || "";

  const activeType = existingData ? existingData.type : "expense";
  const typeRadio = document.querySelector(`input[name="transType"][value="${activeType}"]`);
  if (typeRadio) typeRadio.checked = true;

  populateCategorySelect(activeType);
  renderQuickPresets(activeType);

  if (existingData) {
    modalTitle.textContent = "Edit Transaction";
    transAmount.value = existingData.amount;
    transDate.value = existingData.date;
    transCategory.value = existingData.category;
    transDescription.value = existingData.description || "";
  } else {
    modalTitle.textContent = "Add Transaction";
    // Set date to today or current month 1st
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
    transDate.value = todayStr;
  }

  transactionModal.style.display = "flex";
  transAmount.focus();
}

function closeTransactionModal() {
  transactionModal.style.display = "none";
  editingTransactionId = null;
}

function populateCategorySelect(type) {
  transCategory.innerHTML = "";
  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    transCategory.appendChild(opt);
  });
}

function renderQuickPresets(type) {
  quickPresetsContainer.innerHTML = "";
  const matchingPresets = QUICK_PRESETS.filter(p => p.type === type);

  matchingPresets.forEach(preset => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "preset-chip";
    chip.textContent = preset.name;
    chip.addEventListener("click", () => {
      transCategory.value = preset.category;
      transAmount.value = preset.amount;
      if (preset.desc) transDescription.value = preset.desc;
    });
    quickPresetsContainer.appendChild(chip);
  });
}

async function handleTransactionSubmit(e) {
  e.preventDefault();

  const type = document.querySelector('input[name="transType"]:checked').value;
  const amount = parseFloat(transAmount.value);
  const date = transDate.value;
  const category = transCategory.value;
  const description = transDescription.value.trim();

  if (!amount || amount <= 0 || !date || !category) {
    showToast("Please fill in all required fields properly.", "error");
    return;
  }

  const payload = { type, amount, date, category, description };

  try {
    let res;
    if (editingTransactionId) {
      res = await fetch(`/api/transactions/${editingTransactionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    }

    const data = await res.json();
    if (res.ok) {
      showToast(editingTransactionId ? "Transaction updated!" : "Transaction added!");
      closeTransactionModal();
      // If transaction is in another month, optionally update current view month
      const transMonth = date.substring(0, 7);
      if (transMonth !== currentMonth) {
        currentMonth = transMonth;
        monthPicker.value = currentMonth;
      }
      loadAllData();
    } else {
      showToast(data.error || "Failed to save transaction", "error");
    }
  } catch (err) {
    console.error(err);
    showToast("Network error while saving transaction.", "error");
  }
}

async function editTransaction(id) {
  try {
    const res = await fetch(`/api/transactions?month=${currentMonth}`);
    const data = await res.json();
    const item = data.transactions.find(t => t.id === id);
    if (item) {
      openTransactionModal(item);
    }
  } catch (err) {
    console.error(err);
  }
}

async function deleteTransaction(id) {
  if (!confirm("Are you sure you want to delete this transaction?")) return;

  try {
    const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) {
      showToast("Transaction deleted.");
      loadAllData();
    } else {
      showToast(data.error || "Failed to delete transaction.", "error");
    }
  } catch (err) {
    console.error(err);
    showToast("Error deleting transaction.", "error");
  }
}

// Budget Goals Modal Management
async function fetchBudgets() {
  try {
    const res = await fetch("/api/budgets");
    const data = await res.json();
    if (res.ok) {
      currentBudgets = data.budgets || [];
    }
  } catch (err) {
    console.error(err);
  }
}

function openBudgetModal() {
  renderBudgetEditor();
  budgetModal.style.display = "flex";
}

function closeBudgetModal() {
  budgetModal.style.display = "none";
  loadAllData();
}

function renderBudgetEditor() {
  budgetEditorList.innerHTML = "";

  if (currentBudgets.length === 0) {
    budgetEditorList.innerHTML = "<p style='color:var(--text-muted);'>No budget categories set.</p>";
    return;
  }

  currentBudgets.forEach(b => {
    const row = document.createElement("div");
    row.className = "budget-editor-row";
    row.innerHTML = `
      <span class="budget-editor-category">${escapeHtml(b.category)}</span>
      <div class="input-prefix-wrapper budget-editor-input-group">
        <span class="input-prefix">$</span>
        <input type="number" step="1" min="0" value="${b.monthly_limit}" class="form-input has-prefix budget-limit-input" data-category="${escapeHtml(b.category)}">
      </div>
      <button class="table-action-btn delete-btn" title="Delete Category Budget" onclick="deleteBudget('${escapeHtml(b.category)}')">🗑️</button>
    `;
    budgetEditorList.appendChild(row);
  });

  // Attach change listeners to inline limit inputs
  document.querySelectorAll(".budget-limit-input").forEach(input => {
    input.addEventListener("change", async (e) => {
      const category = e.target.getAttribute("data-category");
      const limit = parseFloat(e.target.value);
      if (isNaN(limit) || limit < 0) return;
      await saveBudget(category, limit);
    });
  });
}

async function saveBudget(category, limit) {
  try {
    const res = await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, monthly_limit: limit })
    });
    if (res.ok) {
      showToast(`Budget for "${category}" updated.`);
      await fetchBudgets();
    }
  } catch (err) {
    console.error(err);
  }
}

async function handleAddBudgetSubmit(e) {
  e.preventDefault();
  const category = newCategoryName.value.trim();
  const limit = parseFloat(newCategoryLimit.value);

  if (!category || isNaN(limit) || limit < 0) {
    showToast("Please provide valid category name and limit.", "error");
    return;
  }

  await saveBudget(category, limit);
  newCategoryName.value = "";
  newCategoryLimit.value = "";
  renderBudgetEditor();
}

async function deleteBudget(category) {
  if (!confirm(`Remove budget goal for "${category}"?`)) return;

  try {
    const res = await fetch(`/api/budgets/${encodeURIComponent(category)}`, {
      method: "DELETE"
    });
    if (res.ok) {
      showToast(`Budget removed for "${category}".`);
      await fetchBudgets();
      renderBudgetEditor();
    }
  } catch (err) {
    console.error(err);
  }
}

// Toast Alert
let toastTimeout;
function showToast(message, type = "info") {
  toastEl.textContent = message;
  toastEl.className = `toast show ${type}`;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastEl.className = "toast";
  }, 2800);
}

// Escape HTML utility to prevent XSS
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
