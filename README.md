# 🤖 AI-Augmented Collaborative Workspace

A Notion-style team workspace (documents, tasks, comments) with a **RAG-powered AI assistant** that answers questions grounded in your team's own data, streamed live over Server-Sent Events (SSE).

---

## ⚙️ Stack

- **Backend:** Node.js + Express + MongoDB (Mongoose)
- **Auth:** JWT, role-based access control (owner / admin / member / viewer)
- **RAG Pipeline:** local embedding model (@xenova/transformers, all-MiniLM-L6-v2) → MongoDB Atlas Vector Search → Google Gemini API → SSE streaming
- **Frontend:** Vanilla HTML/CSS/JS
- **Containerization:** Docker + docker-compose

---

## 🧠 RAG Flow

1. Documents/tasks/comments are chunked and embedded
2. Stored in EmbeddingChunk collection
3. Query → Vector Search → relevant context
4. Context → Gemini API → response
5. SSE streams response to frontend

---

## 📡 API Overview

| Method | Route | Description |
|------|--------|-------------|
| POST | /api/auth/register | Register |
| POST | /api/auth/login | Login |
| GET/POST/PATCH/DELETE | /api/workspaces | Workspaces |
| GET/POST/PATCH/DELETE | /api/workspaces/:id/documents | Documents |
| GET/POST/PATCH/DELETE | /api/workspaces/:id/tasks | Tasks |
| GET/POST/DELETE | /api/workspaces/:id/comments | Comments |
| GET | /api/ai/:workspaceId/ask | AI Chat |

---

## 🚀 Summary

AI-powered Notion-like workspace with RAG + Gemini + real-time streaming.
