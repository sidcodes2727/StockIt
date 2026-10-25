# StockIt

StockIt is a stock information system for retail stores, warehouses and pharmacies: products, suppliers, purchases (stock in), sales (stock out), low-stock alerts, printable invoices and CSV/PDF reports. It's a full-stack application with a Python (Flask) backend and a React (Vite) frontend.

## Highlights

- **Stock meter** — every quantity is drawn against its own reorder level, so one glance down a column shows what needs restocking.
- **Dashboard** — today's sales in a sentence, an inventory-health ring (healthy / low / out), animated stat tiles with a 7-day sparkline, and a sales trend that highlights today.
- **Command palette** — press <kbd>⌘K</kbd> / <kbd>Ctrl K</kbd> (or <kbd>/</kbd>) anywhere to search products, jump to a page, or start a sale or purchase.
- **Reports** — sales, purchases, inventory valuation and a restock list, each with headline totals and CSV/PDF export.
- **Light and dark themes** — "Console & Paper": a dark console rail, warm paper or graphite canvas, one violet accent and a volt-lime highlight.

| Shortcut | Action |
| --- | --- |
| <kbd>⌘K</kbd> / <kbd>Ctrl K</kbd> | Open or close the command palette |
| <kbd>/</kbd> | Open the command palette (when not typing in a field) |
| <kbd>↑</kbd> <kbd>↓</kbd> <kbd>↵</kbd> | Move through and run palette results |

## Project Structure

- `backend/` - Contains the Flask API, database models, and application logic.
- `frontend/` - Contains the React application built with Vite and Tailwind CSS.

---

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Python](https://www.python.org/) (v3.8 or higher)
- [PostgreSQL](https://www.postgresql.org/) (or a hosted Postgres database like Neon)

---

## Getting Started

### 1. Backend Setup

The backend is built with Python and Flask.

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create a virtual environment (recommended):**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
   *(On Windows, use `venv\Scripts\activate` instead)*

3. **Install dependencies:**
   ```bash
   pip3 install -r requirements.txt
   ```

4. **Environment Variables:**
   Copy the `.env.example` file to `.env` and update the values:
   ```bash
   cp .env.example .env
   ```
   *Make sure to configure your `DATABASE_URL` in the `.env` file to point to your PostgreSQL database.*

5. **Run Database Migrations (if applicable):**
   ```bash
   flask db upgrade
   ```

6. **Seed the Database (optional):**
   You can populate the database with initial demo data:
   ```bash
   python3 seed.py
   ```

7. **Start the backend server:**
   ```bash
   python3 run.py
   # The server will typically run on http://127.0.0.1:5000
   ```

---

### 2. Frontend Setup

The frontend is built with React, Vite, and Tailwind CSS.

1. **Navigate to the frontend directory:**
   Open a new terminal window/tab and run:
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```
   *(Note: Make sure you are in the `frontend` folder. Running this in the `backend` folder will cause an error.)*

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Access the application:**
   Open your browser and go to `http://localhost:5173` (or the URL provided in your terminal).

## Default Seed Accounts
If you ran `seed.py` for the backend, you can log in using these demo accounts:
- **Admin**: `admin@stockflow.test` / `Admin@123`
- **Staff**: `staff@stockflow.test` / `Staff@123`
