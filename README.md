# StockIt

StockIt is a full-stack application with a Python (Flask) backend and a Node.js (React/Vite) frontend.

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
