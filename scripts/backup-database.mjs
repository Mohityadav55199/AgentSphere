#!/usr/bin/env node

/**
 * AgentSphere Database Backup Script
 * 
 * Creates a timestamped PostgreSQL backup using pg_dump (if installed)
 * or outputs table records using Prisma.
 *
 * Usage:
 *   node scripts/backup-database.mjs
 *   npm run db:backup
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import zlib from "zlib";

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), "backups");
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ Error: DATABASE_URL environment variable is required.");
  process.exit(1);
}

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const baseFileName = `agentsphere-db-${timestamp}.sql`;
const sqlFilePath = path.join(BACKUP_DIR, baseFileName);
const gzFilePath = `${sqlFilePath}.gz`;

console.log(`🚀 Starting database backup for AgentSphere...`);
console.log(`📁 Backup directory: ${BACKUP_DIR}`);

// Helper to check if pg_dump is available on the system
function hasPgDump() {
  try {
    execSync("pg_dump --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

if (hasPgDump()) {
  console.log("📦 Found pg_dump. Performing full database dump...");
  try {
    // Run pg_dump directly with connection string
    execSync(`pg_dump "${DATABASE_URL}" --no-owner --no-acl --file="${sqlFilePath}"`, {
      stdio: "inherit",
    });

    console.log("🗜️ Compressing backup with gzip...");
    const fileContents = fs.readFileSync(sqlFilePath);
    const compressed = zlib.gzipSync(fileContents);
    fs.writeFileSync(gzFilePath, compressed);
    fs.unlinkSync(sqlFilePath); // Remove uncompressed file

    const sizeMb = (fs.statSync(gzFilePath).size / (1024 * 1024)).toFixed(2);
    console.log(`✅ Backup completed successfully: ${gzFilePath} (${sizeMb} MB)`);
  } catch (err) {
    console.error("❌ pg_dump execution failed:", err.message);
    process.exit(1);
  }
} else {
  console.log("⚠️ pg_dump not found in PATH. Using Node Prisma exporter fallback...");
  import("../src/lib/database/prisma.ts")
    .then(async ({ prisma }) => {
      try {
        const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, createdAt: true } });
        const threads = await prisma.thread.findMany();
        const mcpServers = await prisma.mCPServer.findMany();

        const dumpData = {
          metadata: {
            timestamp: new Date().toISOString(),
            generator: "AgentSphere Node Exporter",
            recordCounts: {
              users: users.length,
              threads: threads.length,
              mcpServers: mcpServers.length,
            },
          },
          data: {
            users,
            threads,
            mcpServers,
          },
        };

        const jsonFilePath = path.join(BACKUP_DIR, `agentsphere-db-${timestamp}.json.gz`);
        const compressed = zlib.gzipSync(JSON.stringify(dumpData, null, 2));
        fs.writeFileSync(jsonFilePath, compressed);

        const sizeKb = (fs.statSync(jsonFilePath).size / 1024).toFixed(2);
        console.log(`✅ Table data exported and compressed: ${jsonFilePath} (${sizeKb} KB)`);
        console.log(`📊 Exported: ${users.length} users, ${threads.length} threads, ${mcpServers.length} MCP servers.`);
        await prisma.$disconnect();
      } catch (e) {
        console.error("❌ Prisma export failed:", e.message);
        await prisma.$disconnect();
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error("❌ Failed to initialize Prisma for export:", err.message);
      process.exit(1);
    });
}
