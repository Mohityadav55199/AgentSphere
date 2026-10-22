# ⚡ Render Free Tier Keep-Alive & Automated Database Backup Guide

This document describes how to configure the keep-alive monitor and automated daily database backups for **AgentSphere** when running on **Render's Free Tier**.

---

## 1. ⚡ Render Free Tier Wake-up Banner

Render's free web services spin down after **15 minutes of inactivity**. When a new visitor accesses the app, the initial cold start can take **50–60 seconds**.

### Features of the In-App Banner:

- **Location**: Rendered across the top of all screens above the main header ([`FreeTierBanner.tsx`](file:///c:/Projects/AgentSphere/src/components/FreeTierBanner.tsx)).
- **Transparent Notice**: Clearly informs users that the instance is hosted on Render's free tier and that cold starts take up to 50 seconds.
- **Live Status Ping**: Automatically pings [`/api/health`](file:///c:/Projects/AgentSphere/src/app/api/health/route.ts) on load:
  - 🟢 **Server Online (Warm)**: Server is responsive.
  - 🟡 **Waking up...**: Backend is spinning up or cold-starting.
- **Session Dismissal**: Users can dismiss the banner using the `✕` button; their preference is saved in `sessionStorage` for the duration of their visit.

---

## 2. 🌐 GitHub Actions Keep-Alive Workflow

To prevent the Render free instance from going to sleep, a scheduled GitHub Actions workflow runs every **14 minutes** to ping the server's health check endpoint.

- **Workflow File**: [`.github/workflows/keep-alive.yml`](file:///c:/Projects/AgentSphere/.github/workflows/keep-alive.yml)
- **Schedule**: `*/14 * * * *` (Render spins down at 15 minutes; 14-minute interval keeps it permanently warm).
- **Endpoint**: `https://<YOUR_RENDER_URL>/api/health`

### Setup Instructions:

1. Open your GitHub repository in your browser.
2. Go to **Settings** > **Secrets and variables** > **Actions**.
3. Under **Repository secrets**, click **New repository secret**:
   - **Name**: `RENDER_APP_URL`
   - **Secret**: `https://your-app-name.onrender.com` (your public Render URL)
4. To test manually:
   - Navigate to the **Actions** tab on GitHub.
   - Click on **Keep Server Warm (Render Free Tier)** on the left sidebar.
   - Click **Run workflow** > select branch > click **Run workflow**.

---

## 3. 🗄️ Automated Database Backup Cronjob

Render free tier PostgreSQL instances expire after 30 days unless upgraded or backed up. AgentSphere includes an automated backup system that dumps PostgreSQL data and stores it securely.

- **Workflow File**: [`.github/workflows/db-backup.yml`](file:///c:/Projects/AgentSphere/.github/workflows/db-backup.yml)
- **Schedule**: `0 2 * * *` (Runs every day at 02:00 UTC).
- **Manual Trigger**: Available anytime via **Actions** > **Database Backup Cronjob** > **Run workflow**.
- **Local / Script Execution**: `npm run db:backup` (defined in [`scripts/backup-database.mjs`](file:///c:/Projects/AgentSphere/scripts/backup-database.mjs)).

### Setup Instructions:

1. In your GitHub repository, go to **Settings** > **Secrets and variables** > **Actions**.
2. Add the following **Repository secret**:
   - **Name**: `DATABASE_URL`
   - **Secret**: Your Render external database connection string:
     `postgresql://user:password@external-host.render.com/dbname?sslmode=require`

### (Optional) Cloud Storage Upload (AWS S3 / Cloudflare R2 / MinIO):

If you also want the backup uploaded to an S3 bucket in addition to GitHub Artifacts, add:

- `S3_BUCKET_NAME`: e.g. `my-agentsphere-backups`
- `S3_ACCESS_KEY_ID`: Your storage access key
- `S3_SECRET_ACCESS_KEY`: Your storage secret key
- `S3_ENDPOINT`: (Optional) e.g. `https://<account-id>.r2.cloudflarestorage.com` or custom S3 endpoint.
- `S3_REGION`: (Optional) e.g. `us-east-1`

### How to Download Backups:

1. Go to the **Actions** tab in your GitHub repository.
2. Click on the latest successful **Database Backup Cronjob** run.
3. Scroll down to the **Artifacts** section at the bottom of the page.
4. Click on the backup archive (e.g., `agentsphere-backup-20261021_020000.sql.gz`) to download it.

### How to Restore a Backup:

```bash
# Decompress and stream directly into PostgreSQL
gunzip -c agentsphere-backup-YYYYMMDD_HHMMSS.sql.gz | psql "$DATABASE_URL"
```

---

## 4. 🌐 Using a Cronjob Website (e.g. cron-job.org)

If you prefer using an external cron service like **[cron-job.org](https://cron-job.org)** instead of or alongside GitHub Actions, AgentSphere provides dedicated HTTP endpoints.

### Step 1: Keep Server Awake (Render Keep-Alive)

1. Sign up / Log in to **[cron-job.org](https://cron-job.org)** (100% free).
2. Go to **Cronjobs** > **Create cronjob**.
3. Fill in the details:
   - **Title**: `AgentSphere Render Keep-Alive`
   - **URL**: `https://agentsphere.onrender.com/api/health` (replace with your Render URL)
   - **Execution schedule**: Every **10 minutes** or **14 minutes**.
   - **Request Method**: `GET`
4. Click **Create**.
5. _Result_: cron-job.org will ping your server 24/7, keeping it warm and preventing it from entering cold sleep!

### Step 2: Automated Database Backup via cron-job.org

1. In Render's dashboard for your web service, add an environment variable:
   - `CRON_SECRET` = `your_strong_random_secret_password`
2. In **[cron-job.org](https://cron-job.org)**, click **Create cronjob**:
   - **Title**: `AgentSphere Daily Database Backup`
   - **URL**: `https://agentsphere.onrender.com/api/cron/backup?key=your_strong_random_secret_password`
   - **Execution schedule**: User-defined (e.g. **Every day at 02:00**).
   - **Request Method**: `GET`
3. Click **Create**.
4. _Result_: When triggered, the `/api/cron/backup` endpoint securely backs up the database. If S3/R2 storage is configured, it automatically uploads the compressed archive to your S3 bucket!

---

## 5. 🛠️ Verification Checklist

| Component                    | File / Endpoint                                                                                          | Status                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------- |
| **Health API**               | [`src/app/api/health/route.ts`](file:///c:/Projects/AgentSphere/src/app/api/health/route.ts)             | ✅ Created                       |
| **Notice Banner**            | [`src/components/FreeTierBanner.tsx`](file:///c:/Projects/AgentSphere/src/components/FreeTierBanner.tsx) | ✅ Created                       |
| **Layout Integration**       | [`src/components/MainLayout.tsx`](file:///c:/Projects/AgentSphere/src/components/MainLayout.tsx)         | ✅ Integrated                    |
| **Cron Backup API**          | [`src/app/api/cron/backup/route.ts`](file:///c:/Projects/AgentSphere/src/app/api/cron/backup/route.ts)   | ✅ Created                       |
| **cron-job.org Setup**       | `docs/KEEP-ALIVE-AND-BACKUPS.md`                                                                         | ✅ Documented                    |
| **Keep-Alive GitHub Action** | [`.github/workflows/keep-alive.yml`](file:///c:/Projects/AgentSphere/.github/workflows/keep-alive.yml)   | ✅ Created                       |
| **DB Backup GitHub Action**  | [`.github/workflows/db-backup.yml`](file:///c:/Projects/AgentSphere/.github/workflows/db-backup.yml)     | ✅ Created                       |
| **Backup Runner Script**     | [`scripts/backup-database.mjs`](file:///c:/Projects/AgentSphere/scripts/backup-database.mjs)             | ✅ Created (`npm run db:backup`) |
| **Render Config**            | [`render.yaml`](file:///c:/Projects/AgentSphere/render.yaml)                                             | ✅ Updated                       |
