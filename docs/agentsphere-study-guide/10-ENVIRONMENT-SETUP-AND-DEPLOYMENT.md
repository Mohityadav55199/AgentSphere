# 🚀 10-ENVIRONMENT-SETUP-AND-DEPLOYMENT.md — Setup & Deployment Manual

---

## 📌 Document Metadata & Configuration Sources
- **Package Manifest**: [package.json](file:///c:/Projects/AgentSphere/package.json) (Package Manager: `pnpm@10.33.0`)
- **Docker Orchestration**: [compose.yaml](file:///c:/Projects/AgentSphere/compose.yaml)
- **Environment Template**: [.env.example](file:///c:/Projects/AgentSphere/.env.example)
- **Deployment Configs**: [render.yaml](file:///c:/Projects/AgentSphere/render.yaml), [vercel.json](file:///c:/Projects/AgentSphere/vercel.json)

---

## 1. Prerequisites & Required Runtimes

| Requirement | Minimum Version | Purpose |
|---|---|---|
| **Node.js** | `>= 18.18.0` (LTS recommended) | JavaScript/TypeScript runtime |
| **pnpm** | `10.33.0` | High-efficiency package manager |
| **Docker Desktop** | `>= 24.0` | Runs PostgreSQL 17 and MinIO object storage |
| **API Keys** | At least one valid LLM key | Groq, Google Gemini, OpenAI, or Anthropic |

---

## 2. Environment Variables Catalog

| Variable Name | Required? | Default / Example Format | Purpose |
|---|---|---|---|
| `PORT` | Optional | `3000` | Port for Next.js HTTP server |
| `POSTGRES_PORT` | Optional | `5434` | External mapped port for Postgres (avoids default 5432 conflict) |
| `POSTGRES_USER` | Optional | `user` | Database root username |
| `POSTGRES_PASSWORD` | Optional | `password` | Database password |
| `POSTGRES_DB` | Optional | `mydb` | Primary database name |
| `DATABASE_URL` | **Required** | `postgresql://user:password@localhost:5434/mydb?schema=public` | Prisma & LangGraph database connection string |
| `GOOGLE_API_KEY` | Optional* | `AIzaSy...` | Enables Google Gemini models |
| `GROQ_API_KEY` | Optional* | `gsk_...` | Enables ultra-fast Groq Llama/Qwen inference |
| `OPENAI_API_KEY` | Optional* | `sk-proj-...` | Enables OpenAI models (GPT-4o) |
| `ANTHROPIC_API_KEY` | Optional* | `sk-ant-...` | Enables Claude 3.5 Sonnet |
| `S3_ENDPOINT` | Optional | `http://localhost:9000` | MinIO or custom S3 endpoint (leave empty for AWS S3) |
| `S3_ACCESS_KEY_ID` | Optional | `minioadmin` | S3 storage access key |
| `S3_SECRET_ACCESS_KEY` | Optional | `minioadmin` | S3 storage secret key |
| `S3_BUCKET_NAME` | Optional | `uploads` | Target bucket for file uploads |
| `S3_FORCE_PATH_STYLE` | Optional | `true` | `true` for MinIO, `false` for AWS S3/Cloudflare R2 |
| `LANGFUSE_ENABLED` | Optional | `false` | Toggles OpenTelemetry & Langfuse observability |
| `JWT_SECRET` | Optional | Auto-generated default | Secret key used to sign session cookies |

*\*Note: At least one LLM key (`GROQ_API_KEY` or `GOOGLE_API_KEY`) is required for AI responses.*

---

## 3. Local Development Setup: Step-by-Step

### Step 1: Start Supporting Infrastructure
AgentSphere requires PostgreSQL and MinIO running before Next.js starts:

```bash
docker compose up -d
```
This starts 3 containers defined in [compose.yaml](file:///c:/Projects/AgentSphere/compose.yaml):
1. **`db`**: `postgres:17-alpine` listening on port `5434`.
2. **`minio`**: Object storage listening on port `9000` (S3 API) and `9001` (Console).
3. **`createbuckets`**: Runs once to configure bucket `uploads` with public download permissions.

### Step 2: Install Node Dependencies
```bash
pnpm install
```

### Step 3: Initialize Database Schema
Generate Prisma client types and apply migrations:
```bash
pnpm prisma:generate
pnpm prisma:migrate
```

### Step 4: Launch Dev Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. Production Deployment Architectures

```mermaid
graph TD
    subgraph Vercel ["Option A: Vercel (Frontend & Serverless Edge)"]
        V_Edge["Vercel Serverless Functions<br/>(Route Handlers: /api/agent/stream)"]
        V_Neon[("External PostgreSQL<br/>(NeonDB or Supabase)")]
        V_R2[("Cloudflare R2 / AWS S3<br/>(File Storage)")]
        V_Edge --> V_Neon
        V_Edge --> V_R2
    end

    subgraph Render ["Option B: Render (Dockerized Container)"]
        R_Web["Render Web Service<br/>(Node.js runtime: pnpm start)"]
        R_DB[("Render Managed PostgreSQL<br/>or Cloud Postgres")]
        R_Web --> R_DB
    end
```

### 4.1 Deploying to Vercel
- **Config**: [vercel.json](file:///c:/Projects/AgentSphere/vercel.json) specifies `"buildCommand": "prisma generate && next build"`.
- **Database**: Use a serverless PostgreSQL instance (such as **NeonDB** or Supabase) with connection pooling enabled.
- **Object Storage**: Update `.env` to point to **AWS S3** or **Cloudflare R2** (`S3_FORCE_PATH_STYLE=false`).

### 4.2 Deploying to Render
- **Config**: [render.yaml](file:///c:/Projects/AgentSphere/render.yaml) specifies:
  - `buildCommand: npm install --include=dev && npm run build`
  - `startCommand: npx prisma db push --accept-data-loss && npm run start`

---

## 5. Troubleshooting Startup Errors

### 5.1 Port Conflicts (Port 5434 / 5432)
- **Symptom**: `Error: bind: address already in use` when running `docker compose up`.
- **Cause**: A local instance of PostgreSQL is already running on port 5432 or 5434.
- **Fix**: Open `.env` and adjust `POSTGRES_PORT=5435`, then update `DATABASE_URL` to match.

### 5.2 Prisma Client Out of Sync
- **Symptom**: `TypeError: prisma.thread.findMany is not a function` or missing TypeScript model types.
- **Fix**: Run `pnpm prisma:generate` to regenerate `@prisma/client`.

### 5.3 MinIO S3 Connection Refused
- **Symptom**: File upload fails with `ECONNREFUSED 127.0.0.1:9000`.
- **Fix**: Verify MinIO container status via `docker compose ps`. Open the MinIO console at [http://localhost:9001](http://localhost:9001) (`minioadmin` / `minioadmin`) to confirm healthy operation.

Proceed to [11-FILE-BY-FILE-CODE-TOUR.md](file:///c:/Projects/AgentSphere/docs/agentsphere-study-guide/11-FILE-BY-FILE-CODE-TOUR.md) for a comprehensive walkthrough of every source file in the project.
