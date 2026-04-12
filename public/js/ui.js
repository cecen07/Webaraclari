/**
 * YENİLİKÇİ SINIF — UI Yöneticisi
 */

const UI = (() => {

  // ─── Başlangıç ───────────────────────────────────────────────────────────
  function init() {
    renderNav();
    setupEventListeners();
    // URL hash'e göre sayfa aç
    const hash = location.hash.replace("#","") || "home";
    App.showPage(hash);
  }

  // ─── Nav ─────────────────────────────────────────────────────────────────
  function renderNav() {
    const user = App.getUser();
    const guestEl = document.getElementById("navAuthGuest");
    const userEl  = document.getElementById("navAuthUser");
    const adminBtn = document.getElementById("adminNavBtn");

    if (user) {
      if (guestEl) guestEl.style.display = "none";
      if (userEl)  userEl.style.display  = "flex";
      const av   = document.getElementById("navAvatar");
      const name = document.getElementById("navUserName");
      if (av) {
        if (user.photoURL) av.innerHTML = `<img src="${user.photoURL}" alt="">`;
        else av.textContent = (user.name||"?").slice(0,2).toUpperCase();
      }
      if (name) name.textContent = user.name || user.email;
      if (adminBtn) adminBtn.style.display = App.isAdmin() ? "block" : "none";
    } else {
      if (guestEl) guestEl.style.display = "flex";
      if (userEl)  userEl.style.display  = "none";
      if (adminBtn) adminBtn.style.display = "none";
    }
  }

  function onLogin(user) {
    renderNav();
    showToast(`Hoş geldiniz, ${user.name || user.email}! 👋`, "success");
  }

  function onLogout() {
    renderNav();
    App.showPage("home");
  }

  // ─── Modal ───────────────────────────────────────────────────────────────
  function openModal(id)  {
    const m = document.getElementById(id);
    if (m) m.classList.add("open");
  }
  function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove("open");
  }

  function showAuthModal(tab = "login") {
    openModal("authModal");
    switchAuthTab(tab);
  }

  function switchAuthTab(tab) {
    ["login","register"].forEach(t => {
      document.getElementById(t+"Tab")?.classList.toggle("active", t === tab);
      document.getElementById(t+"Form")?.classList.toggle("active", t === tab);
    });
  }

  // ─── Toast bildirimleri ──────────────────────────────────────────────────
  function showToast(msg, type = "info", duration = 4000) {
    const container = document.getElementById("toastContainer") || createToastContainer();
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    const icons = { success:"✅", error:"❌", warn:"⚠️", info:"ℹ️" };
    toast.innerHTML = `<span>${icons[type]||"ℹ️"}</span><span>${msg}</span>
      <button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;font-size:1rem;margin-left:auto;opacity:.6;">×</button>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
  }

  function createToastContainer() {
    const c = document.createElement("div");
    c.id = "toastContainer";
    c.style.cssText = "position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:360px;";
    document.body.appendChild(c);
    return c;
  }

  // ─── Form yardımcıları ───────────────────────────────────────────────────
  function val(id)       { return (document.getElementById(id)||{}).value || ""; }
  function setVal(id, v) { const e = document.getElementById(id); if(e) e.value = v; }
  function esc(s)        { return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

  function showAlert(id, type, msg) {
    const e = document.getElementById(id);
    if (!e) return;
    e.className = `alert alert-${type}`;
    e.textContent = msg;
    e.style.display = "flex";
    setTimeout(() => e.style.display = "none", 6000);
  }

  function setLoading(btnId, loading, text = "") {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = loading;
    if (loading) { btn._origText = btn.textContent; btn.innerHTML = '<span class="spinner"></span> Yükleniyor…'; }
    else btn.textContent = text || btn._origText || "Tamam";
  }

  // ─── Auth işlemleri ──────────────────────────────────────────────────────
  async function doLogin() {
    const email = val("loginEmail"), pass = val("loginPass");
    if (!email || !pass) { showAlert("loginError","error","E-posta ve şifre gerekli"); return; }
    setLoading("loginBtn", true);
    try {
      const data = await API.auth.login(email, pass);
      closeModal("authModal");
      showToast("Giriş başarılı!", "success");
    } catch (e) {
      showAlert("loginError", "error", translateAuthError(e.message || e));
    } finally {
      setLoading("loginBtn", false, "Giriş Yap");
    }
  }

  async function doRegister() {
    const payload = {
      name:      val("regName"),
      email:     val("regEmail"),
      password:  val("regPass"),
      il:        val("regIl"),
      ilce:      val("regIlce"),
      okul:      val("regOkul"),
      brans:     val("regBrans"),
      gorevYeri: val("regGorevYeri"),
      kidem:     val("regKidem"),
    };
    const pass2 = val("regPass2");
    if (!payload.name || !payload.email || !payload.password) {
      showAlert("regError","error","Ad, e-posta ve şifre zorunludur"); return;
    }
    if (!payload.il || !payload.okul || !payload.brans) {
      showAlert("regError","error","İl, okul ve branş zorunludur"); return;
    }
    if (payload.password !== pass2) {
      showAlert("regError","error","Şifreler eşleşmiyor"); return;
    }
    if (payload.password.length < 8) {
      showAlert("regError","error","Şifre en az 8 karakter olmalı"); return;
    }
    setLoading("registerBtn", true);
    try {
      await API.auth.register(payload);
      // Kayıt sonrası otomatik giriş
      await API.auth.login(payload.email, payload.password);
      closeModal("authModal");
      showToast("Kayıt başarılı! Hoş geldiniz 🎉", "success");
    } catch (e) {
      showAlert("regError","error", e.message || "Kayıt başarısız");
    } finally {
      setLoading("registerBtn", false, "Kayıt Ol");
    }
  }

  async function doLogout() {
    await API.auth.logout();
    showToast("Çıkış yapıldı", "info");
  }

  async function doGoogleLogin() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const cred = await firebase.auth().signInWithPopup(provider);
      const idToken = await cred.user.getIdToken();
      API.setToken(idToken);
      showToast("Google ile giriş başarılı!", "success");
      closeModal("authModal");
    } catch (e) {
      showAlert("loginError","error","Google girişi başarısız");
    }
  }

  function translateAuthError(msg) {
    const map = {
      "auth/wrong-password":       "Şifre hatalı",
      "auth/user-not-found":       "Bu e-posta kayıtlı değil",
      "auth/invalid-credential":   "E-posta veya şifre hatalı",
      "auth/too-many-requests":    "Çok fazla deneme. Lütfen bekleyin",
      "auth/email-already-in-use": "Bu e-posta zaten kayıtlı",
    };
    for (const [k,v] of Object.entries(map)) { if (msg.includes(k)) return v; }
    return msg;
  }

  // ─── Event listeners ─────────────────────────────────────────────────────
  function setupEventListeners() {
    // Modal dışına tıklayınca kapat
    document.querySelectorAll(".modal").forEach(m =>
      m.addEventListener("click", e => { if (e.target === m) m.classList.remove("open"); })
    );
    // ESC ile kapat
    document.addEventListener("keydown", e => {
      if (e.key === "Escape")
        document.querySelectorAll(".modal.open").forEach(m => m.classList.remove("open"));
    });
    // Back to top
    window.addEventListener("scroll", () =>
      document.getElementById("btt")?.classList.toggle("show", window.scrollY > 400)
    );
    // Hash navigation
    window.addEventListener("hashchange", () => {
      const page = location.hash.replace("#","") || "home";
      App.showPage(page);
    });
  }

  return {
    init, renderNav, onLogin, onLogout,
    openModal, closeModal, showAuthModal, switchAuthTab,
    showToast, showAlert, setLoading,
    doLogin, doRegister, doLogout, doGoogleLogin,
    val, setVal, esc
  };
})();
