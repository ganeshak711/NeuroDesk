# AI-Augmented Collaborative Workspace

A Notion-style team workspace (documents, tasks, comments) with a **RAG-powered AI assistant** that answers questions grounded in your team's own data, streamed live over Server-Sent Events.

## Stack

- **Backend:** Node.js + Express + MongoDB (Mongoose)
- **Auth:** JWT, role-based access control (owner / admin / member / viewer)
- **RAG pipeline:** local open embedding model (`@xenova/transformers`, all-MiniLM-L6-v2 — runs on-device, no API key) → MongoDB Atlas Vector Search → Claude (Anthropic API)(I used Gemini Free Api) → SSE streaming to the browser
- **Frontend:** vanilla HTML/CSS/JS
- **Containerization:** Docker + docker-compose (backend, frontend, mongo)

## Project structure

```
NeuroDesk/
├── backend/
│   ├── src/
│   │   ├── config/db.js            # Mongo connection
│   │   ├── models/                 # User, Workspace, Document, Task, Comment, EmbeddingChunk
│   │   ├── middleware/             # JWT auth + workspace role checks
│   │   ├── routes/                 # auth, workspaces, documents, tasks, comments, ai
│   │   ├── services/
│   │   │   ├── embeddingService.js # local embedding model + text chunking
│   │   │   ├── ragService.js       # indexing + $vectorSearch retrieval
│   │   │   └── llmService.js       # gemini streaming completion
│   │   └── server.js
│   ├── package.json
│   ├── .env.example
│   └── Dockerfile
├── frontend/
│   ├── index.html
│   ├── css/style.css
│   ├── js/{api,auth,app}.js
│   └── Dockerfile
└── docker-compose.yml
```

## How the RAG pipeline works

1. Whenever a **document**, **task**, or **comment** is created/updated, its text is chunked and embedded locally (`embeddingService.js`) and stored in the `EmbeddingChunk` collection.
2. When someone asks the AI a question (`GET /api/ai/:workspaceId/ask?q=...`), the question is embedded and MongoDB **Atlas Vector Search** (`$vectorSearch`) retrieves the most relevant chunks, scoped to that workspace.
3. Those chunks are stitched into a system prompt and sent to Claude, and the reply is **streamed token-by-token** back to the browser over SSE, with the source chunks shown as citations.
4. If you're running plain local MongoDB (no Atlas Search index), the backend automatically falls back to an in-process cosine-similarity search so development still works — see `ragService.js`.

## Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# then edit .env:
#   MONGO_URI          -> your MongoDB Atlas connection string
#   JWT_SECRET          -> any long random string
#   ANTHROPIC_API_KEY oR Gemini API key  -> your Google Gemini API  or Anthropic
npm start
```

The first request that triggers an embedding will download the small (~90MB) `all-MiniLM-L6-v2` model automatically — no API key needed for embeddings.

### 2. Enable Atlas Vector Search (one-time, in MongoDB Atlas)

On the `EmbeddingChunk` collection, create a Search Index named `vector_index`:

```json
{
  "fields": [
    { "type": "vector", "path": "embedding", "numDimensions": 384, "similarity": "cosine" },
    { "type": "filter", "path": "workspace" }
  ]
}
```

(Local `mongod` doesn't support `$vectorSearch` — the app falls back automatically for dev, but for the real pipeline you need Atlas.)

### 3. Frontend

Just open `frontend/index.html` in a browser, or serve it with any static server:

```bash
cd frontend
python3 -m http.server 3000
```

It talks to the backend at `http://localhost:5000/api` by default (see `js/api.js`).

### 4. Or run everything with Docker

```bash
docker-compose up --build
```

- Frontend → http://localhost:3000
- Backend → http://localhost:5000
- Mongo → localhost:27017 (local dev only — swap `MONGO_URI` for Atlas for real vector search)

## API overview

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | Auth |
| GET/POST/PATCH/DELETE | `/api/workspaces` | Workspace CRUD + membership |
| GET/POST/PATCH/DELETE | `/api/workspaces/:id/documents` | Document CRUD |
| GET/POST/PATCH/DELETE | `/api/workspaces/:id/tasks` | Task CRUD |
| GET/POST/DELETE | `/api/workspaces/:id/comments` | Comments on docs/tasks |
| GET (SSE) | `/api/ai/:workspaceId/ask?q=...` | RAG-grounded, streamed AI answer |
