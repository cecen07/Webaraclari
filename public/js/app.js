/**
 * YENİLİKÇİ SINIF — Uygulama Çekirdeği
 * Firebase API key bu dosyada YOK — /api/config/client'tan alınır.
 */

const App = (() => {

  const state = { user: null, initialized: false, currentPage: "home" };
  let firebaseReady = false;

  // Firebase Client başlat (config backend'den)
  async function initFirebaseClient() {
    try {
      const res = await fetch("/api/config/client");
      if (!res.ok) throw new Error("Config alınamadı");
      const { config } = await res.json();
      if (!firebase.apps.length) firebase.initializeApp(config);
      firebaseReady = true;
    } catch (e) {
      console.warn("Firebase client init:", e.message);
      firebaseReady = false;
    }
  }

  async function initAuth() {
    await initFirebaseClient();

    if (!firebaseReady) {
      state.initialized = true;
      UI.init();
      return;
    }

    firebase.auth().onAuthStateChanged(async (fbUser) => {
      try {
        if (fbUser) {
          const idToken = await fbUser.getIdToken(false);
          API.setToken(idToken);
          const res  = await fetch("/api/auth/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          });
          const data = await res.json();
          if (res.ok && data.user) {
            state.user = data.user;
            UI.onLogin(data.user);
          } else {
            await firebase.auth().signOut();
          }
        } else {
          state.user = null;
          API.clearToken();
          UI.onLogout();
        }
      } catch (e) {
        console.error("Auth hatası:", e);
        state.user = null;
        API.clearToken();
      } finally {
        if (!state.initialized) {
          state.initialized = true;
          UI.init();
        }
      }
    });
  }

  const PROTECTED  = new Set(["community", "profile", "classes", "media"]);
  const ADMIN_ONLY = new Set(["admin"]);

  function showPage(page, params) {
    if (PROTECTED.has(page) && !state.user) {
      UI.showAuthModal("login");
      UI.showToast("Bu sayfayı görüntülemek için giriş yapmanız gerekiyor.", "warn");
      return;
    }
    if (ADMIN_ONLY.has(page) && !isAdmin()) {
      UI.showToast("Bu sayfaya erişim yetkiniz yok.", "error");
      return;
    }

    state.currentPage = page;
    if (location.hash !== "#" + page) location.hash = page;

    document.querySelectorAll(".page-section").forEach(s => s.classList.remove("active"));
    const el = document.getElementById("page-" + page);
    if (el) { el.classList.add("active"); window.scrollTo({ top: 0, behavior: "smooth" }); }

    document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
    document.querySelectorAll('.nav-link[data-page="' + page + '"]').forEach(l => l.classList.add("active"));

    try {
      switch (page) {
        case "home":          Pages.home.load();          break;
        case "tools":         Pages.tools.load();         break;
        case "community":     Pages.community.load();     break;
        case "classes":       Pages.classes.load();       break;
        case "media":         Pages.media.load();         break;
        case "arizalar":      Pages.arizalar.load();      break;
        case "profile":       Pages.profile.load();       break;
        case "admin":         Pages.admin.load();         break;
        case "announcements": if (typeof loadAnnouncementsPage==="function") loadAnnouncementsPage(); break;
        case "guestbook":     if (typeof loadGuestbookPage==="function") loadGuestbookPage(); break;
      }
    } catch(e) { console.error("Sayfa yüklenemedi [" + page + "]:", e); }
  }

  // Token yenileme
  setInterval(async () => {
    try {
      const u = typeof firebase !== "undefined" && firebase.auth?.().currentUser;
      if (u) API.setToken(await u.getIdToken(true));
    } catch(e) {}
  }, 55 * 60 * 1000);

  function getUser()      { return state.user; }
  function isAdmin()      { return ["superadmin","admin"].includes(state.user?.role); }
  function isSuperAdmin() { return state.user?.role === "superadmin"; }

  return { initAuth, showPage, getUser, isAdmin, isSuperAdmin, state };
})();
