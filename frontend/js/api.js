// Change this if the backend runs somewhere other than localhost:5000
const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:5000/api"
  : "/api";

const Api = {
  getToken() {
    return localStorage.getItem("aiws_token");
  },
  setToken(token) {
    localStorage.setItem("aiws_token", token);
  },
  clearToken() {
    localStorage.removeItem("aiws_token");
  },

  async request(path, { method = "GET", body, auth = true } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (auth) {
      const token = this.getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 204) return null;

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    return data;
  },

  // ---- Auth ----
  register(payload) {
    return this.request("/auth/register", { method: "POST", body: payload, auth: false });
  },
  login(payload) {
    return this.request("/auth/login", { method: "POST", body: payload, auth: false });
  },
  me() {
    return this.request("/auth/me");
  },

  // ---- Workspaces ----
  listWorkspaces() {
    return this.request("/workspaces");
  },
  createWorkspace(payload) {
    return this.request("/workspaces", { method: "POST", body: payload });
  },
  getWorkspace(id) {
    return this.request(`/workspaces/${id}`);
  },
  inviteMember(workspaceId, payload) {
    return this.request(`/workspaces/${workspaceId}/members`, { method: "POST", body: payload });
  },
  updateMemberRole(workspaceId, userId, role) {
    return this.request(`/workspaces/${workspaceId}/members/${userId}`, { method: "PATCH", body: { role } });
  },
  removeMember(workspaceId, userId) {
    return this.request(`/workspaces/${workspaceId}/members/${userId}`, { method: "DELETE" });
  },

  // ---- Documents ----
  listDocuments(workspaceId) {
    return this.request(`/workspaces/${workspaceId}/documents`);
  },
  createDocument(workspaceId, payload) {
    return this.request(`/workspaces/${workspaceId}/documents`, { method: "POST", body: payload });
  },
  updateDocument(workspaceId, docId, payload) {
    return this.request(`/workspaces/${workspaceId}/documents/${docId}`, { method: "PATCH", body: payload });
  },
  deleteDocument(workspaceId, docId) {
    return this.request(`/workspaces/${workspaceId}/documents/${docId}`, { method: "DELETE" });
  },

  // ---- Tasks ----
  listTasks(workspaceId) {
    return this.request(`/workspaces/${workspaceId}/tasks`);
  },
  createTask(workspaceId, payload) {
    return this.request(`/workspaces/${workspaceId}/tasks`, { method: "POST", body: payload });
  },
  updateTask(workspaceId, taskId, payload) {
    return this.request(`/workspaces/${workspaceId}/tasks/${taskId}`, { method: "PATCH", body: payload });
  },
  deleteTask(workspaceId, taskId) {
    return this.request(`/workspaces/${workspaceId}/tasks/${taskId}`, { method: "DELETE" });
  },

  // ---- Comments ----
  listComments(workspaceId, targetType, targetId) {
    return this.request(`/workspaces/${workspaceId}/comments?targetType=${targetType}&targetId=${targetId}`);
  },
  createComment(workspaceId, payload) {
    return this.request(`/workspaces/${workspaceId}/comments`, { method: "POST", body: payload });
  },

  // ---- AI (SSE streaming) ----
  /**
   * Opens an SSE connection to ask the RAG-grounded assistant a question.
   * callbacks: { onSources(chunks), onToken(text), onDone(), onError(msg) }
   */
  askAI(workspaceId, question, callbacks) {
    const token = this.getToken();
    const url = `${API_BASE}/ai/${workspaceId}/ask?q=${encodeURIComponent(question)}&token=${encodeURIComponent(token || "")}`;
    const source = new EventSource(url);

    source.addEventListener("sources", (e) => callbacks.onSources?.(JSON.parse(e.data).chunks));
    source.addEventListener("token", (e) => callbacks.onToken?.(JSON.parse(e.data).text));
    source.addEventListener("done", () => {
      callbacks.onDone?.();
      source.close();
    });
    source.addEventListener("error", (e) => {
      let message = "Connection to AI service failed";
      try {
        if (e.data) message = JSON.parse(e.data).error || message;
      } catch { /* ignore parse errors on transport-level error events */ }
      callbacks.onError?.(message);
      source.close();
    });

    return source;
  },
};
