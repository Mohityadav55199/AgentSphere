# 05 — AgentSphere Database & Persistence Architecture

## 1. Database Fundamentals & PostgreSQL Overview

### Core Relational Concepts
- **Table / Model**: A structured collection of data organized into rows and columns (e.g. `User`, `Thread`, `MCPServer`).
- **Primary Key (`@id`)**: A unique identifier for every record in a table. AgentSphere uses `UUID` (Universally Unique Identifier, e.g. `36fa5bfd-ae6d-40f2-950e-89ea1d387608`) to prevent ID enumeration attacks.
- **Foreign Key**: A column in one table referencing the Primary Key of another (e.g., `Thread.userId -> User.id`).
- **Cascade Delete (`onDelete: Cascade`)**: When a `User` is deleted, all their associated `Thread` records are automatically deleted by the database.

---

## 2. Entity-Relationship (ER) Diagram

```
+========================================================================+
|                                  USER                                  |
|------------------------------------------------------------------------|
| * id          : String (UUID, PK)                                      |
|   name        : String                                                 |
|   email       : String (UNIQUE)                                        |
|   password    : String (scrypt hash with salt)                         |
|   createdAt   : DateTime (now)                                         |
|   updatedAt   : DateTime (auto-updated)                                |
+===================================+====================================+
                                    | 1
                                    |
                                    | has many (1 : N)
                                    |
                                    v N
+========================================================================+
|                                 THREAD                                 |
|------------------------------------------------------------------------|
| * id          : String (UUID, PK)                                      |
|   title       : String                                                 |
|   isPinned    : Boolean (default: false)                               |
|   userId      : String (FK -> User.id, nullable for guest/anon threads)|
|   createdAt   : DateTime (now)                                         |
|   updatedAt   : DateTime (auto-updated)                                |
+========================================================================+

+========================================================================+
|                               MCPSERVER                                |
|------------------------------------------------------------------------|
| * id          : String (UUID, PK)                                      |
|   name        : String (UNIQUE)                                        |
|   type        : MCPServerType (ENUM: 'stdio' | 'http')                 |
|   enabled     : Boolean (default: true)                                |
|   command     : String? (e.g., 'npx', 'node', 'python')                |
|   args        : Json? (CLI arguments array)                            |
|   env         : Json? (Environment variables key-value map)            |
|   url         : String? (HTTP SSE endpoint)                            |
|   headers     : Json? (HTTP request headers)                           |
|   requiresAuth: Boolean? (default: false)                              |
|   authTokens  : Json? (OAuth token store: access_token, refresh_token) |
|   clientInfo  : Json? (OAuth client credentials & authorization URL)   |
|   codeVerifier: String? (PKCE security verification string)            |
|   oauthStatus : String? (UNKNOWN | NOT_REQUIRED | REQUIRED | CONNECTED)|
|   createdAt   : DateTime (now)                                         |
|   updatedAt   : DateTime (now)                                         |
+========================================================================+
```

---

## 3. LangGraph Checkpoint Persistence (Internal Schema)
In addition to the Prisma models above, `@langchain/langgraph-checkpoint-postgres` automatically manages tables in the `public` schema for conversational graph memory:
1. `checkpoints`: Stores execution metadata, current graph node position, and parent checkpoint ID for every step.
2. `checkpoint_blobs`: Stores serialized channel values (including the LangChain `messages` array containing `HumanMessage`, `AIMessage`, and `ToolMessage` objects).
3. `checkpoint_writes`: Stores intermediate pending writes and state diffs.
4. `checkpoint_migrations`: Tracks schema versioning for LangGraph checkpoint migrations.
