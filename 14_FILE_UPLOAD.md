# 14 — Multimodal File & Image Upload Pipeline

## 1. Overview
AgentSphere allows users to upload images (PNG, JPEG, WebP) and text documents (PDF, TXT, JSON, CSV, MD) alongside chat prompts for multimodal AI reasoning.

---

## 2. File Upload Architecture (`src/app/api/agent/upload/route.ts` & `src/lib/storage/`)

```
[FRONTEND]
User selects file or pastes image in MessageInput.tsx
            ↓
FormData created with multipart/form-data
            ↓
POST /api/agent/upload
            ↓
[BACKEND ROUTE HANDLER]
1. Validates file size (Max 25MB) and MIME type.
2. Generates unique file ID (UUID) and storage key.
3. Storage Provider Selection:
   - S3 Storage (AWS SDK S3 Client): If AWS_S3_BUCKET is configured.
   - Local Disk Storage (fs.promises): Fallback to public/uploads directory.
4. Returns metadata: { fileId, url, name, size, type }
            ↓
[PROMPT DISPATCH]
When user sends message, attachments metadata is passed to streamResponse.
            ↓
[AI PROCESSING (src/lib/storage/content.ts)]
- Images: Converted to data URLs or public S3 URLs in HumanMessage { type: "image_url", image_url: { url } }.
- Documents: Extracted as text chunks and embedded into HumanMessage { type: "text", text: "..." }.
- LLM receives unified multimodal message content array.
```
