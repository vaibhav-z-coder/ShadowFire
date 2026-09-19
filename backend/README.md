# TrustHire Backend (Spring Boot + PostgreSQL)

This is the backend service for the **TrustHire** job-offer verification platform. It provides REST APIs for analyzing job offers, running deterministic fraud detection checks (C1–C7), storing scan history in PostgreSQL, and exposing health-check probes.

---

## Tech Stack

- **Java 21 (LTS)** & **Spring Boot 3.3.4**
- **Spring Data JPA** & **Hibernate**
- **PostgreSQL** (with dynamic Render `DATABASE_URL` parsing and in-memory H2 fallback for local testing)
- **Multi-stage Docker build** (lightweight Alpine JRE 21)

---

## REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/scans` | Submit offer text & optional details for analysis & persistence |
| `GET` | `/api/v1/scans` | List scan history (supports `?band=high_risk` and `?query=google`) |
| `GET` | `/api/v1/scans/{id}` | Retrieve a specific scan result by UUID |
| `DELETE` | `/api/v1/scans/{id}` | Delete a scan from history |
| `GET` | `/api/v1/health` | Service health status check |

---

## How to Deploy on Render (Step-by-Step)

### Option A: Render Dashboard (Manual Setup — Recommended)

1. **Log in to [Render Dashboard](https://dashboard.render.com)**.
2. **Create the PostgreSQL Database**:
   - Click **New +** → **PostgreSQL**.
   - Name: `trusthire-db`.
   - Database: `trusthire`.
   - User: `trusthire_user`.
   - Plan: **Free**.
   - Click **Create Database**.
   - Copy the **Internal Database URL** (e.g. `postgres://...`).

3. **Create the Web Service**:
   - Click **New +** → **Web Service**.
   - Connect your GitHub repository: `vaibhav-z-coder/ShadowFire`.
   - **Name**: `trusthire-backend`.
   - **Root Directory**: `backend` *(Crucial!)*.
   - **Runtime**: **Docker**.
   - **Instance Type**: **Free**.
   - **Health Check Path**: `/api/v1/health`.

4. **Add Environment Variables**:
   In the **Environment Variables** section of the Web Service:
   - `DATABASE_URL`: Paste the Internal Database URL from Step 2.
   - `CORS_ALLOWED_ORIGINS`: `*` (or your deployed frontend URL e.g. `https://your-frontend.vercel.app`).
   - `PORT`: `8080`.

5. **Deploy**:
   - Click **Deploy Web Service**.
   - Render will build the Docker container and start your Spring Boot application automatically.

---

### Option B: Render Blueprint (`render.yaml`)

1. In Render Dashboard, click **Blueprints** → **New Blueprint Instance**.
2. Select your repository `vaibhav-z-coder/ShadowFire`.
3. Set the Blueprint spec path to `backend/render.yaml`.
4. Render will provision both the PostgreSQL database and Docker Web Service together.

---

## Local Development

If running locally without PostgreSQL, the application automatically falls back to an in-memory H2 database:

```bash
cd backend
# If Maven is installed:
mvn spring-boot:run

# Or run with Docker:
docker build -t trusthire-backend .
docker run -p 8080:8080 trusthire-backend
```
