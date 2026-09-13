# TwinMind

**AI-Powered Digital Twin for Business Operations**

TwinMind is an AI digital twin that predicts operational problems before they affect a business. It connects a business's operational data into one living digital model — understanding inventory, suppliers, orders, production, and expenses — then predicts risks and recommends actions before problems become expensive.

## 🎯 Target Market

Small and medium-sized manufacturing businesses (10–200 employees) with regular raw-material purchases, inventory management, multiple suppliers, and repeated customer orders.

## 🏗️ Architecture

```
┌──────────────────────────────────────────────┐
│        React + TypeScript Frontend           │
│  (Tailwind CSS + Recharts + React Router)    │
├──────────────────────────────────────────────┤
│              REST API (JSON)                 │
├──────────────────────────────────────────────┤
│          Python FastAPI Backend              │
│  ┌────────┬────────┬──────────────────────┐  │
│  │  Auth  │  CRUD  │  Risk & Prediction   │  │
│  │  JWT   │  APIs  │  Engine              │  │
│  ├────────┴────────┴──────────────────────┤  │
│  │       SQLAlchemy ORM + SQLite          │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Python 3.12+
- Node.js 20+

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
python run.py
```

The API will be available at **http://localhost:8000**  
API docs at **http://localhost:8000/docs**

### Seed Demo Data

```bash
curl -X POST http://localhost:8000/api/seed
```

This creates a fictional company "Precision Auto Components" with:
- 25 raw materials (some critically low)
- 8 suppliers (varying reliability: 55%–98%)
- 40 products with bill-of-materials
- 15 customers (Tata Motors, Maruti, Mahindra, etc.)
- 150 purchase orders (with delivery history)
- 200 sales orders
- Pre-calculated risk alerts

**Demo login:** `demo@twinmind.com` / `password123`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The app will be available at **http://localhost:5173**

## 📦 Core Modules

| Module | Description |
|--------|-------------|
| **Inventory Engine** | Predicts stockouts, calculates reorder points, flags excess inventory |
| **Supplier Engine** | Scores supplier reliability, detects single-source dependencies |
| **Order Engine** | Assesses which customer orders are at risk of delay |
| **Health Engine** | Computes operational health score (0–100) with breakdown |
| **Scenario Simulator** | What-if analysis: demand changes, supplier delays, price changes |
| **Recommendation Engine** | Generates prioritized options with cost/risk/delay tradeoffs |

## 📊 Key Features

- **Operational Health Score** — weighted composite of inventory stability, supplier reliability, order fulfillment, production readiness, and financial health
- **Predictive Risk Alerts** — critical/high/medium/low severity with financial impact estimates
- **AI Explanations** — every alert explains what happened, why it matters, and what to do
- **What-If Simulator** — test decisions before making them
- **Multi-option Recommendations** — compare actions by cost, delay, and risk
- **CSV/Excel Upload** — import existing business data from spreadsheets
- **Interactive Dashboard** — KPIs, charts, and risk overview at a glance

## 🗂️ Project Structure

```
twinmind/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI entry point
│   │   ├── config.py        # Settings
│   │   ├── database.py      # SQLAlchemy setup
│   │   ├── auth.py          # JWT authentication
│   │   ├── models/          # 15 SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── routers/         # 16 API routers
│   │   ├── engine/          # Prediction & risk engines
│   │   └── seed/            # Demo data generator
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # 12 page components
│   │   ├── services/        # API client
│   │   ├── contexts/        # Auth state management
│   │   └── types/           # TypeScript interfaces
│   ├── package.json
│   └── vite.config.ts
├── .gitignore
└── README.md
```

## 🛡️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Recharts |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 |
| Database | SQLite (MVP) → PostgreSQL (production) |
| Auth | JWT (PyJWT + pwdlib/bcrypt) |
| Data Processing | pandas + openpyxl |

## 📄 License

MIT
