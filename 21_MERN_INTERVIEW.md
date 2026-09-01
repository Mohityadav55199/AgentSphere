# 21 — SocialAngel MERN Intern Preparation Guide

## 1. JavaScript Core Questions (30 Essential Intern Topics)
1. **Event Loop & Call Stack**: JavaScript is single-threaded. Synchronous code executes on the call stack. Asynchronous operations (like `fetch` or `setTimeout`) are offloaded to Web APIs, queue their callbacks in the Task/Microtask Queue, and are pushed back to the stack when it is empty.
2. **Promises & `async/await`**: A Promise represents an eventual completion (or failure) of an asynchronous operation with three states: `pending`, `fulfilled`, or `rejected`. `async/await` is syntactic sugar over Promises making asynchronous code read like synchronous code.
3. **Closures**: A closure is a function that remembers and accesses variables from its lexical outer scope even after the outer function has finished executing.
4. **`var` vs `let` vs `const`**: `var` is function-scoped and hoisted. `let` and `const` are block-scoped and reside in the Temporal Dead Zone (TDZ) before declaration.

---

## 2. React & Hooks Questions
1. **Virtual DOM**: A lightweight in-memory JavaScript representation of the real DOM. React compares the previous Virtual DOM with the new Virtual DOM using a reconciliation algorithm ("diffing") and updates only the changed elements in the real DOM for optimal performance.
2. **Rules of Hooks**: Only call hooks at the top level of functional components (never inside loops, conditions, or nested functions) and only from React functions.
3. **`useEffect` Dependency Array**:
   - `[]`: Runs once after initial mount.
   - `[dep1, dep2]`: Runs on mount and whenever `dep1` or `dep2` changes.
   - Omitted: Runs after every single render.

---

## 3. Node.js & Express Fundamentals
1. **Node.js Architecture**: Built on Google Chrome's V8 engine and `libuv`, providing non-blocking, event-driven I/O using an asynchronous thread pool.
2. **Express Middleware**: Functions that have access to `req`, `res`, and `next()`. Used for logging, authentication, request parsing, and error handling.

---

## 4. MongoDB & Database Fundamentals (Mapping to SQL / PostgreSQL)
1. **MongoDB (NoSQL Document DB) vs PostgreSQL (Relational SQL DB)**:
   - MongoDB stores flexible, schemaless JSON/BSON documents in **Collections**.
   - PostgreSQL stores structured records with fixed schemas in **Tables** with ACID guarantees and foreign key relations.
   - AgentSphere chose PostgreSQL because LangGraph checkpointing and user session constraints require relational integrity.
