const App = {
  user: null,
  workspaces: [],
  currentWorkspaceId: null,
  currentView: "documents",
  documents: [],
  selectedDocId: null,
  tasks: [],
  members: [],
  aiSource: null,

  async boot(user) {
    this.user = user;
    document.getElementById("auth-screen").classList.add("hidden");
    document.getElementById("app-screen").classList.remove("hidden");
    document.getElementById("current-user").textContent = `${user.name} · ${user.email}`;

    this.bindGlobalEvents();
    await this.loadWorkspaces();
  },

  bindGlobalEvents() {
    document.querySelectorAll(".nav-tab").forEach((btn) => {
      btn.addEventListener("click", () => this.switchView(btn.dataset.view));
    });

    document.getElementById("workspace-select").addEventListener("change", (e) => {
      this.selectWorkspace(e.target.value);
    });

    document.getElementById("new-workspace-btn").addEventListener("click", () => {
      document.getElementById("workspace-modal").classList.remove("hidden");
    });
    document.getElementById("workspace-cancel-btn").addEventListener("click", () => {
      document.getElementById("workspace-modal").classList.add("hidden");
    });
    document.getElementById("workspace-form").addEventListener("submit", (e) => this.handleCreateWorkspace(e));

    document.getElementById("new-doc-btn").addEventListener("click", () => this.handleCreateDocument());
    document.getElementById("save-doc-btn").addEventListener("click", () => this.handleSaveDocument());
    document.getElementById("delete-doc-btn").addEventListener("click", () => this.handleDeleteDocument());
    document.getElementById("doc-comment-form").addEventListener("submit", (e) => this.handlePostComment(e));

    document.getElementById("new-task-btn").addEventListener("click", () => {
      document.getElementById("task-modal").classList.remove("hidden");
    });
    document.getElementById("task-cancel-btn").addEventListener("click", () => {
      document.getElementById("task-modal").classList.add("hidden");
    });
    document.getElementById("task-form").addEventListener("submit", (e) => this.handleCreateTask(e));

    document.getElementById("invite-form").addEventListener("submit", (e) => this.handleInvite(e));
    document.getElementById("ai-form").addEventListener("submit", (e) => this.handleAskAI(e));
  },

  switchView(view) {
    this.currentView = view;
    document.querySelectorAll(".nav-tab").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
    document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
    document.getElementById(`view-${view}`).classList.remove("hidden");

    if (view === "documents") this.loadDocuments();
    if (view === "tasks") this.loadTasks();
    if (view === "members") this.loadMembers();
  },

  // ---------- Workspaces ----------
  async loadWorkspaces() {
    const { workspaces } = await Api.listWorkspaces();
    this.workspaces = workspaces;

    const select = document.getElementById("workspace-select");
    select.innerHTML = workspaces.map((w) => `<option value="${w._id}">${escapeHtml(w.name)}</option>`).join("");

    if (workspaces.length === 0) {
      select.innerHTML = `<option value="">No workspaces yet</option>`;
      return;
    }

    const toSelect = this.currentWorkspaceId && workspaces.some((w) => w._id === this.currentWorkspaceId)
      ? this.currentWorkspaceId
      : workspaces[0]._id;
    select.value = toSelect;
    await this.selectWorkspace(toSelect);
  },

  async selectWorkspace(id) {
    if (!id) return;
    this.currentWorkspaceId = id;
    this.switchView(this.currentView);
  },

  async handleCreateWorkspace(e) {
    e.preventDefault();
    const name = document.getElementById("workspace-name").value.trim();
    const description = document.getElementById("workspace-description").value.trim();
    if (!name) return;

    const { workspace } = await Api.createWorkspace({ name, description });
    document.getElementById("workspace-modal").classList.add("hidden");
    e.target.reset();
    await this.loadWorkspaces();
    document.getElementById("workspace-select").value = workspace._id;
    await this.selectWorkspace(workspace._id);
  },

  // ---------- Documents ----------
  async loadDocuments() {
    if (!this.currentWorkspaceId) return;
    const { documents } = await Api.listDocuments(this.currentWorkspaceId);
    this.documents = documents;
    this.renderDocList();
  },

  renderDocList() {
    const list = document.getElementById("doc-list");
    if (this.documents.length === 0) {
      list.innerHTML = `<li class="muted" style="padding: 12px;">No documents yet. Create one to get started.</li>`;
      return;
    }
    list.innerHTML = this.documents
      .map(
        (d) => `
        <li class="list-item ${d._id === this.selectedDocId ? "selected" : ""}" data-id="${d._id}">
          <div class="item-title">${escapeHtml(d.title || "Untitled")}</div>
          <div class="item-meta">Updated ${new Date(d.updatedAt).toLocaleString()}</div>
        </li>`
      )
      .join("");

    list.querySelectorAll(".list-item").forEach((el) => {
      el.addEventListener("click", () => this.openDocument(el.dataset.id));
    });
  },

  async handleCreateDocument() {
    if (!this.currentWorkspaceId) return alert("Create or select a workspace first.");
    const { document: doc } = await Api.createDocument(this.currentWorkspaceId, { title: "Untitled", content: "" });
    await this.loadDocuments();
    this.openDocument(doc._id);
  },

  async openDocument(id) {
    this.selectedDocId = id;
    this.renderDocList();
    const doc = this.documents.find((d) => d._id === id);
    if (!doc) return;

    document.getElementById("doc-editor").classList.remove("hidden");
    document.getElementById("doc-title").value = doc.title;
    document.getElementById("doc-content").value = doc.content;

    await this.loadComments("Document", id);
  },

  async handleSaveDocument() {
    if (!this.selectedDocId) return;
    const title = document.getElementById("doc-title").value.trim() || "Untitled";
    const content = document.getElementById("doc-content").value;
    await Api.updateDocument(this.currentWorkspaceId, this.selectedDocId, { title, content });
    await this.loadDocuments();
  },

  async handleDeleteDocument() {
    if (!this.selectedDocId) return;
    if (!confirm("Delete this document? This cannot be undone.")) return;
    await Api.deleteDocument(this.currentWorkspaceId, this.selectedDocId);
    this.selectedDocId = null;
    document.getElementById("doc-editor").classList.add("hidden");
    await this.loadDocuments();
  },

  // ---------- Comments (shared by documents & tasks) ----------
  async loadComments(targetType, targetId) {
    const { comments } = await Api.listComments(this.currentWorkspaceId, targetType, targetId);
    const listId = targetType === "Document" ? "doc-comments" : null;
    if (!listId) return;

    const list = document.getElementById(listId);
    list.innerHTML = comments
      .map(
        (c) => `
        <li class="comment-item">
          <span class="comment-author">${escapeHtml(c.author?.name || "Someone")}</span>
          ${escapeHtml(c.body)}
        </li>`
      )
      .join("") || `<li class="muted">No comments yet.</li>`;

    // stash for the submit handler
    this._commentTarget = { targetType, targetId };
  },

  async handlePostComment(e) {
    e.preventDefault();
    const input = e.target.querySelector("input");
    const body = input.value.trim();
    if (!body || !this._commentTarget) return;

    await Api.createComment(this.currentWorkspaceId, { ...this._commentTarget, body });
    input.value = "";
    await this.loadComments(this._commentTarget.targetType, this._commentTarget.targetId);
  },

  // ---------- Tasks ----------
  async loadTasks() {
    if (!this.currentWorkspaceId) return;
    const { tasks } = await Api.listTasks(this.currentWorkspaceId);
    this.tasks = tasks;
    this.renderTaskBoard();
  },

  renderTaskBoard() {
    ["todo", "in_progress", "done"].forEach((status) => {
      const col = document.querySelector(`.task-list[data-status="${status}"]`);
      const tasksForCol = this.tasks.filter((t) => t.status === status);

      col.innerHTML = tasksForCol
        .map(
          (t) => `
          <li class="task-card" data-id="${t._id}">
            <div class="task-title">${escapeHtml(t.title)}</div>
            <span class="task-priority ${t.priority}">${t.priority}</span>
            <select class="task-status-select" data-id="${t._id}">
              <option value="todo" ${t.status === "todo" ? "selected" : ""}>To Do</option>
              <option value="in_progress" ${t.status === "in_progress" ? "selected" : ""}>In Progress</option>
              <option value="done" ${t.status === "done" ? "selected" : ""}>Done</option>
            </select>
          </li>`
        )
        .join("");
    });

    document.querySelectorAll(".task-status-select").forEach((sel) => {
      sel.addEventListener("change", async (e) => {
        await Api.updateTask(this.currentWorkspaceId, e.target.dataset.id, { status: e.target.value });
        await this.loadTasks();
      });
    });
  },

  async handleCreateTask(e) {
    e.preventDefault();
    if (!this.currentWorkspaceId) return alert("Create or select a workspace first.");

    const title = document.getElementById("task-title").value.trim();
    const description = document.getElementById("task-description").value.trim();
    const priority = document.getElementById("task-priority").value;
    if (!title) return;

    await Api.createTask(this.currentWorkspaceId, { title, description, priority });
    document.getElementById("task-modal").classList.add("hidden");
    e.target.reset();
    await this.loadTasks();
  },

  // ---------- Members ----------
  async loadMembers() {
    if (!this.currentWorkspaceId) return;
    const { workspace } = await Api.getWorkspace(this.currentWorkspaceId);
    this.members = workspace.members;
    const list = document.getElementById("member-list");

    list.innerHTML = workspace.members
      .map(
        (m) => `
        <li class="list-item" style="cursor:default; display:flex; align-items:center; justify-content:space-between;">
          <div>
            <span class="item-title">${escapeHtml(m.user?.name || "Unknown")}</span>
            <span class="member-role-badge">${m.role}</span>
          </div>
          <div class="item-meta">${escapeHtml(m.user?.email || "")}</div>
        </li>`
      )
      .join("");
  },

  async handleInvite(e) {
    e.preventDefault();
    if (!this.currentWorkspaceId) return alert("Create or select a workspace first.");

    const email = document.getElementById("invite-email").value.trim();
    const role = document.getElementById("invite-role").value;

    try {
      await Api.inviteMember(this.currentWorkspaceId, { email, role });
      document.getElementById("invite-email").value = "";
      await this.loadMembers();
    } catch (err) {
      alert(err.message);
    }
  },

  // ---------- AI (RAG + SSE) ----------
  handleAskAI(e) {
    e.preventDefault();
    if (!this.currentWorkspaceId) return alert("Create or select a workspace first.");

    const input = document.getElementById("ai-question");
    const question = input.value.trim();
    if (!question) return;
    input.value = "";

    if (this.aiSource) this.aiSource.close();

    const messages = document.getElementById("ai-messages");
    messages.insertAdjacentHTML("beforeend", `<div class="ai-msg user">${escapeHtml(question)}</div>`);

    const assistantId = `ai-reply-${Date.now()}`;
    messages.insertAdjacentHTML(
      "beforeend",
      `<div class="ai-msg assistant" id="${assistantId}"><span class="reply-text"></span><span class="typing-cursor"></span></div>`
    );
    messages.scrollTop = messages.scrollHeight;

    const replyEl = document.getElementById(assistantId);
    const textEl = replyEl.querySelector(".reply-text");

    this.aiSource = Api.askAI(this.currentWorkspaceId, question, {
      onSources: (chunks) => {
        if (!chunks || chunks.length === 0) return;
        const chips = chunks
          .map((c, i) => `<span class="source-chip">[${i + 1}] ${escapeHtml(c.sourceType)}</span>`)
          .join("");
        replyEl.insertAdjacentHTML("beforeend", `<div class="sources">Grounded in: ${chips}</div>`);
      },
      onToken: (text) => {
        textEl.textContent += text;
        messages.scrollTop = messages.scrollHeight;
      },
      onDone: () => {
        replyEl.querySelector(".typing-cursor")?.remove();
      },
      onError: (msg) => {
        replyEl.querySelector(".typing-cursor")?.remove();
        textEl.textContent += `\n[Error: ${msg}]`;
      },
    });
  },
};

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
