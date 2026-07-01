🤖 AI-Augmented Collaborative Workspace

A Notion-style team workspace (documents, tasks, comments) with a RAG-powered AI assistant that answers questions grounded in your team's own data, streamed live over Server-Sent Events (SSE).

⚙️ Stack
Backend: Node.js + Express + MongoDB (Mongoose)
Auth: JWT, role-based access control (owner / admin / member / viewer)
RAG pipeline: local open embedding model (@xenova/transformers, all-MiniLM-L6-v2 — runs on-device, no API key) → MongoDB Atlas Vector Search → Google Gemini API → SSE streaming to the browser
Frontend: vanilla HTML/CSS/JS
Containerization: Docker + docker-compose (backend, frontend, mongo)
📁 Project Structure
ai-workspace/
├── backend/
│   ├── src/
│   │   ├── config/db.js
│   │   ├── models/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   │   ├── embeddingService.js
│   │   │   ├── ragService.js
│   │   │   └── llmService.js   # Gemini API integration
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
🧠 How the RAG Pipeline Works
Whenever a document, task, or comment is created/updated, its text is chunked and embedded locally (embeddingService.js) and stored in the EmbeddingChunk collection.
When a user asks a question (GET /api/ai/:workspaceId/ask?q=...), the query is embedded and MongoDB Atlas Vector Search retrieves the most relevant chunks for that workspace.
These chunks are injected into a structured prompt and sent to the Google Gemini API, which generates a context-aware response.
The response is streamed token-by-token to the frontend using SSE (Server-Sent Events), with referenced chunks shown as citations.
If Atlas Vector Search is not available, the system falls back to local cosine similarity search for development mode.
🚀 Setup
1. Backend
cd backend
npm install
cp .env.example .env

Edit .env:

MONGO_URI=your_mongodb_atlas_connection
JWT_SECRET=your_secret_key
GEMINI_API_KEY=your_google_gemini_api_key

Start server:

npm start
2. Atlas Vector Search (one-time setup)

Create index on EmbeddingChunk collection:

{
  "fields": [
    { "type": "vector", "path": "embedding", "numDimensions": 384, "similarity": "cosine" },
    { "type": "filter", "path": "workspace" }
  ]
}
3. Frontend
cd frontend
python3 -m http.server 3000

Open:

http://localhost:3000

Backend runs at:

http://localhost:5000/api
4. Docker (Full Stack)
docker-compose up --build
Frontend → http://localhost:3000
Backend → http://localhost:5000
MongoDB → localhost:27017
📡 API Overview
Method	Route	Description
POST	/api/auth/register, /api/auth/login	Authentication
GET/POST/PATCH/DELETE	/api/workspaces	Workspace management
GET/POST/PATCH/DELETE	/api/workspaces/:id/documents	Document CRUD
GET/POST/PATCH/DELETE	/api/workspaces/:id/tasks	Task CRUD
GET/POST/DELETE	/api/workspaces/:id/comments	Comments
GET (SSE)	/api/ai/:workspaceId/ask?q=...	RAG-based AI assistant
