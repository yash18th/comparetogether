# Official Swiggy Model Context Protocol (MCP) Integration Guide

This document outlines the architecture, setup, and execution flow for integrating **FoodCompare** with Swiggy's official **Builders Club / Food Model Context Protocol (MCP)** server via **OAuth 2.1 + PKCE**.

---

## 1. Overview & Architecture

Swiggy provides official access to its Food ordering ecosystem through its Model Context Protocol (MCP) server at:
* **Base URL**: `https://mcp.swiggy.com`
* **Food MCP Endpoint**: `https://mcp.swiggy.com/food`
* **Documentation**: [https://mcp.swiggy.com/builders/](https://mcp.swiggy.com/builders/)

### Core Architectural Principles
1. **No Fake Formulas or Inventions**: Swiggy prices, delivery charges, and platform fees are **never calculated via arbitrary mathematical approximations**. When unverified or pending authentication, the system displays **"Final price unavailable"** and flags status as `INTEGRATION_PENDING`.
2. **Server-Side Security**: All PKCE generation, authorization code exchange, and JWT access tokens reside **strictly on the backend**. No OAuth secrets or access tokens are ever exposed to the client browser.
3. **Mandatory Address Ordering**: Swiggy's Food MCP strictly requires a real `addressId` returned by Swiggy's `get_addresses` tool before executing any restaurant or menu query.

---

## 2. Environment Variables & Configuration

Configure backend variables in `server/.env` (reference `server/.env.example`):

```env
# Swiggy Official MCP & Builders Club Configuration
SWIGGY_MCP_BASE_URL=https://mcp.swiggy.com
SWIGGY_MCP_FOOD_ENDPOINT=https://mcp.swiggy.com/food
SWIGGY_OAUTH_CALLBACK_URL=http://localhost:3001/api/integrations/swiggy/callback
SWIGGY_CLIENT_ID=foodcompare-dev-client
SWIGGY_CLIENT_SECRET=
```

Frontend configuration in `client/.env` (reference `client/.env.example`):
```env
VITE_API_URL=http://localhost:3001/api
```

---

## 3. OAuth 2.1 with PKCE Step-by-Step Flow

```
[User / Admin]              [FoodCompare Backend]                 [Swiggy MCP]
       |                              |                                |
       |--- Click "Connect Swiggy" -->|                                |
       |                              |-- Generate code_verifier       |
       |                              |-- Compute SHA-256 challenge    |
       |                              |-- Save verifier & state to DB  |
       |<-- Redirect to authUrl ------|                                |
       |                                                               |
       |---------------- Redirect to Consent Screen ------------------>|
       |                                 (User enters phone & OTP)     |
       |<--------------- Redirect to Callback with code & state -------|
       |                                                               |
       |--- GET /api/integrations/swiggy/callback?code=...&state=... ->|
       |                              |                                |
       |                              |-- Verify state from DB         |
       |                              |-- POST /auth/token ----------->|
       |                              |   (grant_type, code, verifier) |
       |                              |<-- { access_token, expires_in }|
       |                              |                                |
       |                              |-- Call get_addresses tool ---->|
       |                              |<-- [ { id: "addr_123", ... } ]-|
       |                              |-- Persist session in SQLite    |
       |<-- Redirect /admin (Success)-|                                |
```

### Endpoints Implemented in FoodCompare:
* `GET /api/integrations/swiggy/connect`: Generates a cryptographic 43-character `code_verifier` and S256 `code_challenge`, persists them in `oauth_sessions`, and redirects to `https://mcp.swiggy.com/auth/authorize`.
* `GET /api/integrations/swiggy/callback`: Validates the `state` against CSRF attacks, performs `POST https://mcp.swiggy.com/auth/token`, saves the JWT access token, and triggers initial address synchronization.
* `GET /api/integrations/swiggy/status`: Returns current status (`LIVE`, `AUTHORIZED`, `INTEGRATION_PENDING`, `EXPIRED`, `UNAVAILABLE`) and synced address summary without leaking tokens.
* `POST /api/integrations/swiggy/disconnect`: Deletes active tokens from the SQLite database and resets status to `INTEGRATION_PENDING`.

---

## 4. Swiggy Food MCP Tools Workflow

### Step 1: Address Resolution (`get_addresses`)
* **Tool Name**: `get_addresses`
* **Requirement**: Mandatory first step. Swiggy delivery radiuses and menu availability depend entirely on latitude, longitude, and registered customer addresses.
* **Storage**: Primary `addressId` and locality are saved in `oauth_sessions.address_id`. `addressId` is **never invented**.

### Step 2: Restaurant Search (`search_restaurants`)
* **Tool Name**: `search_restaurants`
* **Arguments**: `{ addressId: string, query: string }`
* **Output**: List of matching restaurant branches delivering to the address with Swiggy `restaurantId`, rating, and delivery SLA.

### Step 3: Menu Retrieval (`search_menu` & `get_restaurant_menu`)
* **Tool Names**:
  * `search_menu`: `{ addressId: string, restaurantId: string, query: string }`
  * `get_restaurant_menu`: `{ addressId: string, restaurantId: string }`
* **Output**: Accurate dish prices, portions, variant options (Half, Full, Regular, Large), and add-on lists.

---

## 5. Scalable Platform Adapter Design

The `PlatformAdapter` contract explicitly identifies data provenance:
* `LIVE`: Directly retrieved from active authorized real-time API call.
* `AUTHORIZED`: Confirmed merchant or official partner feed.
* `INTEGRATION_PENDING`: Adapter configured in architecture, but awaiting active user/production OAuth session.
* `UNAVAILABLE`: Platform service temporarily unreachable.

### Transparent Pricing Rule:
If any checkout fee component (delivery, packaging, platform fee, taxes) is missing from the platform response, FoodCompare sets `finalPriceUnavailable: true`. The UI displays:
> **"Final price unavailable"**
> *(Live checkout session required)*

This guarantees that users are **never misled by arbitrary or approximated final sums**.

---

## 6. Branch Scoping & Matching Precision

* **Strict Branch Isolation**: Restaurant branches are treated as independent entities (`branch_id`). Prices from an Indiranagar branch are **never combined** with a Koramangala or Whitefield branch.
* **Dietary & Variant Guards**: `ProductMatcher` enforces 100% strict dietary separation (Veg vs Non-Veg cannot match) and variant verification (e.g., Half vs Full).

---

## 7. Local Setup & Production Requirements

### Local Development:
1. Start the backend: `cd server && npm run dev`
2. Start the frontend: `cd client && npm run dev`
3. Visit Admin -> Integrations -> Click **Connect Swiggy MCP (OAuth 2.1 + PKCE)**.
4. Swiggy supports local redirect URIs on `http://localhost:3001/api/integrations/swiggy/callback`.

### Production Deployment:
1. Register application on [Swiggy Builders Club](https://mcp.swiggy.com/builders/).
2. Submit production application with demo video demonstrating the OAuth flow and Food MCP tool usage.
3. Configure production `SWIGGY_CLIENT_ID` and `SWIGGY_CLIENT_SECRET`.
4. Ensure HTTPS callback URL is whitelisted in your Swiggy Builders console.
