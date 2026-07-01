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

## 🧠 How the RAG Pipeline Works
Whenever a document, task, or comment is created/updated, its text is chunked and embedded locally (embeddingService.js) and stored in the EmbeddingChunk collection.
When a user asks a question (GET /api/ai/:workspaceId/ask?q=...), the query is embedded and MongoDB Atlas Vector Search retrieves the most relevant chunks for that workspace.
These chunks are injected into a structured prompt and sent to the Google Gemini API, which generates a context-aware response.
The response is streamed token-by-token to the frontend using SSE (Server-Sent Events), with referenced chunks shown as citations.
If Atlas Vector Search is not available, the system falls back to local cosine similarity search for development mode.

---

## 🚀 Setup

1. Backend
   cd backend
   npm install
   cp .env.example .env

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
