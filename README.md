# FoodCompare (CompareTogether) 🍲

> A luxury-tech food price comparison platform that delivers transparent, line-item price intelligence across food delivery platforms (Zomato, Swiggy, EatClub, and Direct Restaurant Ordering) in India.

![FoodCompare Banner](client/src/assets/hero.png)

---

## ✨ Features

- **Transparent Line-Item Breakdown**: Breaks down Base Item Listed Price, Delivery Fees, Platform Fees, Packaging Fees, GST, and Discounts side-by-side.
- **Normalized Quantity Comparison**: Compares value per 100g/100ml across platforms to prevent portion size deception.
- **Official Swiggy MCP Integration (OAuth 2.1 + PKCE)**:
  - Compliant with Swiggy's Builders Club Model Context Protocol (`mcp.swiggy.com`).
  - Implements PKCE challenge (`S256`), secure server-side session exchange, and zero client-exposed secrets.
  - Transparent state reporting (`finalPriceUnavailable` marked whenever a live checkout session is required).
- **Strict Branch & Geofence Isolation**: Prevents false matches across different restaurant branches or neighborhoods.
- **Typo-Tolerant Multi-Platform Search**: Levenshtein-based fuzzy search handling spelling variations, regional names, and dietary preferences (Veg/Non-Veg hard blocks).
- **Price History & Trends**: Visual 30-day price tracking with average price and lowest historical price indicators.
- **Custom Price Alerts**: Set target thresholds and track price drops directly on the user dashboard.
- **South Asian Luxury Heritage UI**: Dark-mode palette inspired by traditional Indian architectural aesthetics with gold/sandstone accents, smooth glassmorphism, and responsive layouts.

---

## 🏗️ Architecture & Tech Stack

```
comparetogether/
├── client/                     # React 18 + Vite + TypeScript Frontend
│   ├── src/
│   │   ├── components/         # ComparisonModal, PriceHistoryChart, HeritageHero, etc.
│   │   ├── context/            # AuthContext, LocationContext, MembershipContext
│   │   ├── services/           # api.ts (HTTP client with timeout handling)
│   │   └── styles/             # Modular CSS & Heritage design tokens
├── server/                     # Node.js + Express + TypeScript Backend
│   ├── src/
│   │   ├── adapters/           # ZomatoAdapter, SwiggyAdapter, EatClubAdapter, DirectAdapter
│   │   ├── db/                 # SQLite database (WAL mode) & seed schema
│   │   ├── engine/             # NormalizationEngine, ProductMatcher, SearchEngine
│   │   ├── routes/             # compareRoutes, searchRoutes, swiggyRoutes, authRoutes
│   │   └── services/           # SwiggyMcpClient (OAuth 2.1 + PKCE)
│   └── data/                   # foodcompare.db (SQLite database, git-ignored)
└── docs/                       # Architectural guides & Swiggy MCP specification
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

### 1. Installation
Clone the repository and install root, client, and server dependencies:
```bash
git clone https://github.com/yash18th/comparetogether.git
cd comparetogether
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

### 2. Environment Configuration
Create environment files from the provided templates:

**Server (`server/.env`):**
```bash
PORT=3001
JWT_SECRET=your_jwt_secret_here
SWIGGY_CLIENT_ID=your_swiggy_client_id
SWIGGY_CLIENT_SECRET=your_swiggy_client_secret
SWIGGY_MCP_BASE_URL=https://mcp.swiggy.com
SWIGGY_OAUTH_CALLBACK_URL=http://localhost:3001/api/integrations/swiggy/callback
```

**Client (`client/.env`):**
```bash
VITE_API_URL=http://localhost:3001/api
```

### 3. Build & Run Locally
Start the backend server:
```bash
cd server
npm run build
npm start
```
*The database automatically initializes and seeds realistic multi-branch records on first startup.*

In a separate terminal, start the frontend dev server:
```bash
cd client
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

## 🧪 Verification & Testing
Run the comprehensive end-to-end automated verification suite covering fuzzy search, branch isolation, normalization engine, and Swiggy PKCE validation:
```bash
cd server
npm run build
node dist/test_verification.js
```

---

## 📄 License
ISC License.
