# 🍉 FruitMoney - Personal Finance & Budget Tracker

A modern, web-based budget application with persistent data storage running on **Port 1000**.

![FruitMoney Web App](https://img.shields.io/badge/Port-1000-blue) ![Python](https://img.shields.io/badge/Python-3.x-green) ![Storage](https://img.shields.io/badge/Database-SQLite-orange)

## 🚀 Quick Start

### Option 1: Double-click launch (Windows)
Double-click **`start.bat`** in this folder. It will launch the backend server and open `http://localhost:1000` in your web browser.

### Option 2: Command Line
```powershell
python server.py
```
Then open your browser and navigate to:
**[http://localhost:1000](http://localhost:1000)**

---

## ✨ Features

- **📊 Comprehensive Financial Dashboard**:
  - Real-time summary cards: **Total Income**, **Total Expenses**, **Net Balance / Cash Flow**, and **Budget Utilization %**.
  - Monthly savings rate badge calculation.
- **🎯 Visual Monthly Budget Goals**:
  - Set custom spending limits per category (e.g. Housing, Groceries, Utilities, Entertainment, Shopping).
  - Real-time progress bars with dynamic color badges:
    - 🟢 **Green (Safe)**: Under 80% of budget limit.
    - 🟡 **Amber (Warning)**: 80% – 100% of budget limit.
    - 🔴 **Red (Over-budget Alert)**: Exceeded budget limit.
- **🍩 Interactive Expense Breakdown Chart**:
  - Built-in HTML5 Canvas donut chart displaying category spending distribution and percentages.
- **💸 Transaction Management**:
  - Add & edit income and expense transactions.
  - Quick-preset chips for fast logging (e.g. Coffee, Groceries, Gas, Lunch, Paycheck).
  - Categorization, amount validation, and date picker defaulted to today.
  - Search transactions by keyword and filter by type or category.
  - Inline edit and delete capabilities.
- **📅 Month Navigation**:
  - Easily jump between past, present, and future months with arrow buttons or date picker.
- **📥 CSV Data Export**:
  - Export your complete transaction history with one click.
- **💾 Persistent SQLite Database**:
  - All transactions and budget targets are automatically saved locally to `budget.db`.
  - Zero external dependencies: powered by Python's standard library.

---

## 🛠️ Project Structure

```
BudgetApp/
├── server.py             # Multi-threaded Python HTTP Server & REST API
├── budget.db             # Persistent SQLite database (auto-created)
├── start.bat             # Windows one-click batch launcher
├── start.ps1             # PowerShell launcher
├── README.md             # Documentation
└── static/
    ├── index.html        # Main dashboard UI
    ├── style.css         # Modern styling & responsive design
    └── app.js            # Frontend logic, charts & API integrations
```
