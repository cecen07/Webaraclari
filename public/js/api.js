/**
 * YENİLİKÇİ SINIF — API İstemcisi
 * Tüm istekler /api/* üzerinden backend Functions'a gider.
 * Frontend'de HİÇBİR Firebase API key veya admin credential bulunmaz.
 */

const API = (() => {
  const BASE = "/api";

  // ─── Token yönetimi ───────────────────────────────────────────────────────
  let _token = null;

  function setToken(t) {
    _token = t;
    try { sessionStorage.setItem("ys_token", t); } catch(e) {}
  }

  function getToken() {
    if (_token) return _token;
    try { _token = sessionStorage.getItem("ys_token"); } catch(e) {}
    return _token;
  }

  function clearToken() {
    _token = null;
    try { sessionStorage.removeItem("ys_token"); } catch(e) {}
  }

  // ─── Temel fetch ─────────────────────────────────────────────────────────
  async function request(method, path, body = null, isFormData = false) {
    const headers = {};
    if (!isFormData) headers["Content-Type"] = "application/json";
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body) opts.body = isFormData ? body : JSON.stringify(body);

    const res = await fetch(BASE + path, opts);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) throw { status: res.status, message: data.error || "İstek başarısız" };
    return data;
  }

  const get    = (path)          => request("GET",    path);
  const post   = (path, body)    => request("POST",   path, body);
  const put    = (path, body)    => request("PUT",    path, body);
  const patch  = (path, body)    => request("PATCH",  path, body);
  const del    = (path)          => request("DELETE", path);
  const upload = (path, formData)=> request("POST",   path, formData, true);
  // Dışarıdan ham istek atmak için (community vote vb.)
  const rawReq = (method, path, body) => request(method, path, body);

  // ─── Auth ────────────────────────────────────────────────────────────────
  const auth = {
    // Firebase Client SDK ile giriş yapıp ID token alıyoruz, sonra backend'e doğrulatıyoruz
    async login(email, password) {
      // Firebase Client Auth (sadece ID token almak için kullanılır)
      const fbAuth = firebase.auth();
      const cred   = await fbAuth.signInWithEmailAndPassword(email, password);
      const idToken = await cred.user.getIdToken();
      const data    = await post("/auth/verify", { idToken });
      setToken(idToken);
      return data;
    },
    async register(payload) {
      return post("/auth/register", payload);
    },
    async logout() {
      clearToken();
      await firebase.auth().signOut();
    },
    async updateProfile(payload) {
      return put("/auth/profile", payload);
    },
    async refreshToken() {
      const user = firebase.auth().currentUser;
      if (!user) return null;
      const idToken = await user.getIdToken(true);
      setToken(idToken);
      return idToken;
    }
  };

  // ─── Araçlar ─────────────────────────────────────────────────────────────
  const tools = {
    list:       (params = {}) => get("/tools?" + new URLSearchParams(params)),
    categories: ()             => get("/tools/categories"),
    add:        (data)         => post("/tools", data),
    update:     (id, data)     => put(`/tools/${id}`, data),
    remove:     (id)           => del(`/tools/${id}`),
  };

  // ─── Sınıflar ────────────────────────────────────────────────────────────
  const classes = {
    list:           ()           => get("/classes"),
    get:            (id)         => get(`/classes/${id}`),
    create:         (data)       => post("/classes", data),
    delete:         (id)         => del(`/classes/${id}`),
    addStudent:     (cid, data)  => post(`/classes/${cid}/students`, data),
    bulkStudents:   (cid, list)  => post(`/classes/${cid}/students/bulk`, { students: list }),
    updateStudent:  (cid, sid, data) => put(`/classes/${cid}/students/${sid}`, data),
    deleteStudent:  (cid, sid)   => del(`/classes/${cid}/students/${sid}`),
  };

  // ─── Topluluk ────────────────────────────────────────────────────────────
  const community = {
    questions:   (params = {}) => get("/community/questions?" + new URLSearchParams(params)),
    postQuestion:(data)         => post("/community/questions", data),
    answers:     (qid)          => get(`/community/questions/${qid}/answers`),
    postAnswer:  (qid, body)    => post(`/community/questions/${qid}/answers`, { body }),
    voteAnswer:  (qid, aid, dir)=> patch(`/community/questions/${qid}/answers/${aid}/vote`, { dir }),
    deleteQuestion:(qid)        => del(`/community/questions/${qid}`),
    report:      (qid, reason)  => post(`/community/questions/${qid}/report`, { reason }),
    reports:     ()             => get("/community/reports"),
    resolveReport:(id, action)  => patch(`/community/reports/${id}`, { action }),
  };

  // ─── Medya ───────────────────────────────────────────────────────────────
  const media = {
    list:       (params = {})   => get("/media?" + new URLSearchParams(params)),
    categories: ()               => get("/media/categories"),
    upload:     (formData)       => upload("/media/upload", formData),
    download:   (id)             => post(`/media/${id}/download`),
    remove:     (id)             => del(`/media/${id}`),
  };

  // ─── Admin ───────────────────────────────────────────────────────────────
  const adminApi = {
    dashboard:        ()            => get("/admin/dashboard"),
    exportTools:      ()            => get("/admin/tools/export"),
    announcements:    ()            => get("/admin/announcements"),
    addAnnouncement:  (data)        => post("/admin/announcements", data),
    removeAnnouncement:(id)         => del(`/admin/announcements/${id}`),
    logs:             (params = {}) => get("/admin/logs?" + new URLSearchParams(params)),
    settings:         ()            => get("/admin/settings"),
    updateSettings:   (data)        => put("/admin/settings", data),
  };

  // ─── Kullanıcılar ────────────────────────────────────────────────────────
  const users = {
    list:         (params = {}) => get("/users?" + new URLSearchParams(params)),
    get:          (uid)          => get(`/users/${uid}`),
    changeRole:   (uid, role)    => patch(`/users/${uid}/role`, { role }),
    changeStatus: (uid, status)  => patch(`/users/${uid}/status`, { status }),
    delete:       (uid)          => del(`/users/${uid}`),
    auditLogs:    ()             => get("/users/audit/logs"),
  };

  // ─── Arızalar ────────────────────────────────────────────────────────────
  const arizalar = {
    list:   (params = {}) => get("/arizalar?" + new URLSearchParams(params)),
    add:    (data)         => post("/arizalar", data),
    update: (id, durum)    => patch(`/arizalar/${id}/durum`, { durum }),
    remove: (id)           => del(`/arizalar/${id}`),
  };

  return { auth, tools, classes, community, media, admin: adminApi, users, arizalar, getToken, setToken, clearToken, request: rawReq };
})();

// Token otomatik yenileme — her saat
setInterval(async () => {
  try { await API.auth.refreshToken(); } catch(e) {}
}, 55 * 60 * 1000);
