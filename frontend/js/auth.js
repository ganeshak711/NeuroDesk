const Auth = {
  currentUser: null,

  init() {
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => this.switchTab(btn.dataset.tab));
    });

    document.getElementById("login-form").addEventListener("submit", (e) => this.handleLogin(e));
    document.getElementById("register-form").addEventListener("submit", (e) => this.handleRegister(e));
    document.getElementById("logout-btn").addEventListener("click", () => this.logout());
  },

  switchTab(tab) {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
    document.getElementById("login-form").classList.toggle("hidden", tab !== "login");
    document.getElementById("register-form").classList.toggle("hidden", tab !== "register");
  },

  async handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const errorEl = document.getElementById("login-error");
    errorEl.textContent = "";

    try {
      const { token, user } = await Api.login({
        email: form.email.value,
        password: form.password.value,
      });
      Api.setToken(token);
      this.currentUser = user;
      App.boot(user);
    } catch (err) {
      errorEl.textContent = err.message;
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    const form = e.target;
    const errorEl = document.getElementById("register-error");
    errorEl.textContent = "";

    try {
      const { token, user } = await Api.register({
        name: form.name.value,
        email: form.email.value,
        password: form.password.value,
      });
      Api.setToken(token);
      this.currentUser = user;
      App.boot(user);
    } catch (err) {
      errorEl.textContent = err.message;
    }
  },

  logout() {
    Api.clearToken();
    this.currentUser = null;
    document.getElementById("app-screen").classList.add("hidden");
    document.getElementById("auth-screen").classList.remove("hidden");
  },

  async tryAutoLogin() {
    const token = Api.getToken();
    if (!token) return false;
    try {
      const { user } = await Api.me();
      this.currentUser = user;
      App.boot(user);
      return true;
    } catch {
      Api.clearToken();
      return false;
    }
  },
};

document.addEventListener("DOMContentLoaded", async () => {
  Auth.init();
  const loggedIn = await Auth.tryAutoLogin();
  if (!loggedIn) {
    document.getElementById("auth-screen").classList.remove("hidden");
  }
});
