import os
import sys
import json
import sqlite3
import urllib.parse
from http import HTTPStatus
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from datetime import datetime

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

PORT = 1000
DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "budget.db")
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
                category TEXT NOT NULL,
                amount REAL NOT NULL,
                description TEXT,
                created_at TEXT NOT NULL
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS budgets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT UNIQUE NOT NULL,
                monthly_limit REAL NOT NULL
            )
        """)
        # Create indexes for fast querying
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_trans_date ON transactions(date)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_trans_category ON transactions(category)")
        
        # Check if we should insert default initial budgets if none exist
        cursor.execute("SELECT COUNT(*) as count FROM budgets")
        if cursor.fetchone()["count"] == 0:
            default_budgets = [
                ("Housing & Rent", 1200.0),
                ("Groceries & Food", 500.0),
                ("Utilities & Bills", 250.0),
                ("Transportation", 200.0),
                ("Entertainment", 150.0),
                ("Shopping", 200.0),
                ("Healthcare", 100.0),
                ("Miscellaneous", 100.0),
            ]
            cursor.executemany("INSERT INTO budgets (category, monthly_limit) VALUES (?, ?)", default_budgets)
            
        # Check if we should insert some sample transactions for demonstration if empty
        cursor.execute("SELECT COUNT(*) as count FROM transactions")
        if cursor.fetchone()["count"] == 0:
            now_month = datetime.now().strftime("%Y-%m")
            sample_transactions = [
                (f"{now_month}-01", "income", "Salary", 3500.0, "Monthly Base Salary", datetime.now().isoformat()),
                (f"{now_month}-02", "expense", "Housing & Rent", 1150.0, "Apartment Rent", datetime.now().isoformat()),
                (f"{now_month}-03", "expense", "Groceries & Food", 145.20, "Supermarket weekly run", datetime.now().isoformat()),
                (f"{now_month}-05", "expense", "Utilities & Bills", 95.50, "Electric & Gas Bill", datetime.now().isoformat()),
                (f"{now_month}-08", "expense", "Transportation", 45.00, "Gas refill", datetime.now().isoformat()),
                (f"{now_month}-10", "expense", "Entertainment", 24.99, "Movie & Streaming subscriptions", datetime.now().isoformat()),
                (f"{now_month}-12", "income", "Freelance / Side Gig", 420.0, "Website consulting work", datetime.now().isoformat()),
                (f"{now_month}-14", "expense", "Groceries & Food", 82.40, "Trader Joe's groceries", datetime.now().isoformat()),
                (f"{now_month}-16", "expense", "Shopping", 65.00, "New winter jacket", datetime.now().isoformat()),
            ]
            cursor.executemany("""
                INSERT INTO transactions (date, type, category, amount, description, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, sample_transactions)
            
        conn.commit()

class BudgetRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def _send_json_response(self, data, status=HTTPStatus.OK):
        response_bytes = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response_bytes)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.end_headers()
        self.wfile.write(response_bytes)

    def _send_error_json(self, message, status=HTTPStatus.BAD_REQUEST):
        self._send_json_response({"error": message}, status=status)

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query = urllib.parse.parse_qs(parsed_url.query)

        if path.startswith("/api/"):
            self.handle_api_get(path, query)
        else:
            # Fallback to static files
            if path == "/" or path == "":
                self.path = "/index.html"
            super().do_GET()

    def handle_api_get(self, path, query):
        if path == "/api/transactions":
            month = query.get("month", [None])[0]  # format: YYYY-MM
            category = query.get("category", [None])[0]
            ttype = query.get("type", [None])[0]
            search = query.get("search", [None])[0]

            sql = "SELECT * FROM transactions WHERE 1=1"
            params = []

            if month:
                sql += " AND date LIKE ?"
                params.append(f"{month}%")
            if category and category != "all":
                sql += " AND category = ?"
                params.append(category)
            if ttype and ttype != "all":
                sql += " AND type = ?"
                params.append(ttype)
            if search:
                sql += " AND (description LIKE ? OR category LIKE ?)"
                params.extend([f"%{search}%", f"%{search}%"])

            sql += " ORDER BY date DESC, id DESC"

            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(sql, params)
                rows = [dict(row) for row in cursor.fetchall()]
                self._send_json_response({"transactions": rows})

        elif path == "/api/budgets":
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM budgets ORDER BY category ASC")
                rows = [dict(row) for row in cursor.fetchall()]
                self._send_json_response({"budgets": rows})

        elif path == "/api/summary":
            month = query.get("month", [datetime.now().strftime("%Y-%m")])[0]

            with get_db_connection() as conn:
                cursor = conn.cursor()
                
                # Fetch all transactions for this month
                cursor.execute("SELECT * FROM transactions WHERE date LIKE ?", (f"{month}%",))
                transactions = [dict(r) for r in cursor.fetchall()]

                total_income = sum(t["amount"] for t in transactions if t["type"] == "income")
                total_expenses = sum(t["amount"] for t in transactions if t["type"] == "expense")
                net_savings = total_income - total_expenses

                # Category breakdown for expenses
                category_expenses = {}
                for t in transactions:
                    if t["type"] == "expense":
                        cat = t["category"]
                        category_expenses[cat] = category_expenses.get(cat, 0.0) + t["amount"]

                # Category breakdown for income
                category_income = {}
                for t in transactions:
                    if t["type"] == "income":
                        cat = t["category"]
                        category_income[cat] = category_income.get(cat, 0.0) + t["amount"]

                # Fetch budget limits and calculate budget vs actual
                cursor.execute("SELECT * FROM budgets")
                budgets_db = [dict(r) for r in cursor.fetchall()]
                
                budget_status = []
                total_budget_limit = 0.0
                for b in budgets_db:
                    cat = b["category"]
                    limit = float(b["monthly_limit"])
                    spent = float(category_expenses.get(cat, 0.0))
                    total_budget_limit += limit
                    budget_status.append({
                        "category": cat,
                        "limit": limit,
                        "spent": spent,
                        "remaining": limit - spent,
                        "percentage": round((spent / limit * 100) if limit > 0 else 0, 1)
                    })

                # Also include categories that had expenses but have no explicit budget set
                for cat, spent in category_expenses.items():
                    if not any(b["category"] == cat for b in budgets_db):
                        budget_status.append({
                            "category": cat,
                            "limit": 0.0,
                            "spent": spent,
                            "remaining": -spent,
                            "percentage": 100.0 if spent > 0 else 0
                        })

                self._send_json_response({
                    "month": month,
                    "total_income": round(total_income, 2),
                    "total_expenses": round(total_expenses, 2),
                    "net_savings": round(net_savings, 2),
                    "total_budget_limit": round(total_budget_limit, 2),
                    "category_expenses": category_expenses,
                    "category_income": category_income,
                    "budget_status": budget_status,
                    "transaction_count": len(transactions)
                })

        elif path == "/api/export":
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT id, date, type, category, amount, description, created_at FROM transactions ORDER BY date DESC")
                rows = cursor.fetchall()
                
                csv_lines = ["ID,Date,Type,Category,Amount,Description,Created At"]
                for r in rows:
                    desc = f'"{r["description"].replace(chr(34), chr(34)+chr(34))}"' if r["description"] else '""'
                    csv_lines.append(f'{r["id"]},{r["date"]},{r["type"]},{r["category"]},{r["amount"]:.2f},{desc},{r["created_at"]}')
                
                csv_data = "\n".join(csv_lines).encode("utf-8")
                self.send_response(HTTPStatus.OK)
                self.send_header("Content-Type", "text/csv; charset=utf-8")
                self.send_header("Content-Disposition", 'attachment; filename="budget_transactions.csv"')
                self.send_header("Content-Length", str(len(csv_data)))
                self.end_headers()
                self.wfile.write(csv_data)
        else:
            self._send_error_json("Endpoint not found", status=HTTPStatus.NOT_FOUND)

    def _read_json_body(self):
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            return None
        body = self.rfile.read(content_length).decode("utf-8")
        return json.loads(body)

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        if not path.startswith("/api/"):
            self._send_error_json("Invalid API path", status=HTTPStatus.NOT_FOUND)
            return

        try:
            data = self._read_json_body()
        except Exception as e:
            self._send_error_json(f"Invalid JSON: {str(e)}")
            return

        if path == "/api/transactions":
            if not data:
                self._send_error_json("Missing request body")
                return

            date = data.get("date")
            ttype = data.get("type")
            category = data.get("category")
            amount = data.get("amount")
            description = data.get("description", "").strip()

            if not date or not ttype or not category or amount is None:
                self._send_error_json("Missing required fields (date, type, category, amount)")
                return

            try:
                amount = float(amount)
                if amount <= 0:
                    self._send_error_json("Amount must be positive")
                    return
            except ValueError:
                self._send_error_json("Amount must be a valid number")
                return

            if ttype not in ("income", "expense"):
                self._send_error_json("Type must be either 'income' or 'expense'")
                return

            created_at = datetime.now().isoformat()

            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO transactions (date, type, category, amount, description, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (date, ttype, category, amount, description, created_at))
                new_id = cursor.lastrowid
                conn.commit()

            self._send_json_response({
                "success": True,
                "transaction": {
                    "id": new_id,
                    "date": date,
                    "type": ttype,
                    "category": category,
                    "amount": amount,
                    "description": description,
                    "created_at": created_at
                }
            }, status=HTTPStatus.CREATED)

        elif path == "/api/budgets":
            if not data:
                self._send_error_json("Missing request body")
                return

            category = data.get("category", "").strip()
            monthly_limit = data.get("monthly_limit")

            if not category or monthly_limit is None:
                self._send_error_json("Missing category or monthly_limit")
                return

            try:
                monthly_limit = float(monthly_limit)
                if monthly_limit < 0:
                    self._send_error_json("Limit must be >= 0")
                    return
            except ValueError:
                self._send_error_json("Invalid monthly_limit")
                return

            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO budgets (category, monthly_limit)
                    VALUES (?, ?)
                    ON CONFLICT(category) DO UPDATE SET monthly_limit=excluded.monthly_limit
                """, (category, monthly_limit))
                conn.commit()

            self._send_json_response({"success": True, "category": category, "monthly_limit": monthly_limit})

        elif path == "/api/reset":
            # Reset database to demo data
            if os.path.exists(DB_FILE):
                os.remove(DB_FILE)
            init_db()
            self._send_json_response({"success": True, "message": "Database reset to defaults"})
        else:
            self._send_error_json("Endpoint not found", status=HTTPStatus.NOT_FOUND)

    def do_PUT(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        if path.startswith("/api/transactions/"):
            try:
                trans_id = int(path.split("/")[-1])
            except ValueError:
                self._send_error_json("Invalid transaction ID")
                return

            try:
                data = self._read_json_body()
            except Exception as e:
                self._send_error_json(f"Invalid JSON: {str(e)}")
                return

            date = data.get("date")
            ttype = data.get("type")
            category = data.get("category")
            amount = data.get("amount")
            description = data.get("description", "").strip()

            if not date or not ttype or not category or amount is None:
                self._send_error_json("Missing required fields (date, type, category, amount)")
                return

            try:
                amount = float(amount)
                if amount <= 0:
                    self._send_error_json("Amount must be positive")
                    return
            except ValueError:
                self._send_error_json("Amount must be a valid number")
                return

            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE transactions
                    SET date = ?, type = ?, category = ?, amount = ?, description = ?
                    WHERE id = ?
                """, (date, ttype, category, amount, description, trans_id))
                conn.commit()

                if cursor.rowcount == 0:
                    self._send_error_json("Transaction not found", status=HTTPStatus.NOT_FOUND)
                    return

            self._send_json_response({"success": True, "message": "Transaction updated"})
        else:
            self._send_error_json("Endpoint not found", status=HTTPStatus.NOT_FOUND)

    def do_DELETE(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        if path.startswith("/api/transactions/"):
            try:
                trans_id = int(path.split("/")[-1])
            except ValueError:
                self._send_error_json("Invalid transaction ID")
                return

            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM transactions WHERE id = ?", (trans_id,))
                conn.commit()

                if cursor.rowcount == 0:
                    self._send_error_json("Transaction not found", status=HTTPStatus.NOT_FOUND)
                    return

            self._send_json_response({"success": True, "message": "Transaction deleted"})

        elif path.startswith("/api/budgets/"):
            category = urllib.parse.unquote(path.split("/")[-1])
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM budgets WHERE category = ?", (category,))
                conn.commit()
            self._send_json_response({"success": True, "message": "Budget deleted"})
        else:
            self._send_error_json("Endpoint not found", status=HTTPStatus.NOT_FOUND)

def run(server_class=ThreadingHTTPServer, handler_class=BudgetRequestHandler, port=PORT):
    os.makedirs(STATIC_DIR, exist_ok=True)
    init_db()
    
    server_address = ("0.0.0.0", port)
    httpd = server_class(server_address, handler_class)
    print("==================================================")
    print(f" FruitMoney Application Server is running!")
    print(f" Access in your browser at: http://localhost:{port}")
    print(f" Data is saved in: {DB_FILE}")
    print(" Press Ctrl+C to stop the server.")
    print("==================================================")
    sys.stdout.flush()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.server_close()

if __name__ == "__main__":
    run()
