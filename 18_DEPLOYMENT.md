# 18 — Deployment & Production Infrastructure

## 1. Deployment Pipeline Overview

```
+========================================================================+
|                         LOCAL DEVELOPMENT ENVIRONMENT                  |
|  - Next.js Turbopack dev server: npm run dev                           |
|  - Neon PostgreSQL Cloud DB (or local docker PostgreSQL)              |
|  - Prisma Client: npx prisma generate                                  |
+===================================+====================================+
                                    | git push origin main
                                    v
+========================================================================+
|                        CONTINUOUS INTEGRATION (CI)                     |
|  - Vercel / GitHub Actions                                             |
|  - .npmrc ensures frozen-lockfile=false for seamless pnpm installs     |
|  - Build step: prisma generate && next build                           |
+===================================+====================================+
                                    | Compiled Artifacts
                                    v
+========================================================================+
|                         PRODUCTION RUNTIME DEPLOYMENT                  |
|  - Web / API Tier: Vercel Serverless / Edge Network (or Render/Docker) |
|  - Database Tier: Neon Serverless PostgreSQL (Auto-scaling compute)    |
|  - File Storage Tier: AWS S3 (Scalable Object Storage)                 |
|  - Observability Tier: Langfuse OpenTelemetry Agent Tracing            |
+========================================================================+
```

---

## 2. Docker & Container Support (`compose.yaml`)
AgentSphere includes a multi-service Docker configuration for local containerized development:
- **`app`**: Node.js Next.js production build.
- **`postgres`**: Local PostgreSQL container with initialized schema.
- **`adminer`**: Web-based database management interface for direct inspection.
