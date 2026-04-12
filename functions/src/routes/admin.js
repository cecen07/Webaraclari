const router = require("express").Router();
const admin  = require("firebase-admin");
const { verifyToken, requireSuperAdmin, requireAdmin, logAction } = require("../middleware/auth");

// ─── Dashboard istatistikleri ────────────────────────────────────────────────
router.get("/dashboard", verifyToken, requireAdmin, async (req, res) => {
  try {
    const [users, questions, tools, arizalar, reports, media] = await Promise.all([
      req.db.collection("users").get(),
      req.db.collection("questions").where("status","==","active").get(),
      req.db.collection("tools").where("active","==",true).get(),
      req.db.collection("arizalar").where("durum","==","acik").get(),
      req.db.collection("reports").where("status","==","pending").get(),
      req.db.collection("media").where("status","==","active").get(),
    ]);
    res.json({
      stats: {
        totalUsers:       users.size,
        activeQuestions:  questions.size,
        totalTools:       tools.size,
        openArizalar:     arizalar.size,
        pendingReports:   reports.size,
        totalMedia:       media.size,
        teachers: users.docs.filter(d => d.data().role === "teacher").length,
        admins:   users.docs.filter(d => ["admin","superadmin"].includes(d.data().role)).length,
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Dashboard verisi alınamadı" });
  }
});

// ─── Araç JSON'u oluştur (SADECE BACKEND — API key frontend'e gitmez) ───────
// Bu endpoint araç verilerini JSON olarak üretir; frontend'e raw config asla gönderilmez
router.get("/tools/export", verifyToken, requireAdmin, async (req, res) => {
  try {
    const snap = await req.db.collection("tools").where("active","==",true).get();
    const tools = snap.docs.map(d => {
      const { addedBy, createdAt, updatedAt, ...safe } = d.data();
      return { id: d.id, ...safe };
    });
    res.json({ tools, generatedAt: new Date().toISOString(), total: tools.length });
    await logAction(req.db, req.user.uid, "TOOLS_EXPORT", { count: tools.length });
  } catch (err) {
    res.status(500).json({ error: "Export başarısız" });
  }
});

// ─── Duyurular ──────────────────────────────────────────────────────────────
router.get("/announcements", async (_req, res) => {
  try {
    const snap = await _req.db.collection("announcements")
      .where("active","==",true)
      .orderBy("createdAt","desc")
      .limit(20)
      .get();
    res.json({ announcements: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
  } catch (err) {
    res.status(500).json({ error: "Duyurular alınamadı" });
  }
});

router.post("/announcements", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { title, body, priority, target } = req.body;
    if (!title || !body) return res.status(400).json({ error: "Başlık ve içerik zorunlu" });

    const ref = await req.db.collection("announcements").add({
      title, body,
      priority: priority || "low",
      target:   target   || "all",
      active:   true,
      authorId: req.user.uid,
      authorName: req.user.name,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.status(201).json({ message: "Duyuru yayınlandı", id: ref.id });
  } catch (err) {
    res.status(500).json({ error: "Duyuru eklenemedi" });
  }
});

router.delete("/announcements/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    await req.db.collection("announcements").doc(req.params.id).update({ active: false });
    res.json({ message: "Duyuru kaldırıldı" });
  } catch (err) {
    res.status(500).json({ error: "İşlem başarısız" });
  }
});

// ─── Moderasyon logları ──────────────────────────────────────────────────────
router.get("/logs", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 100, action } = req.query;
    let query = req.db.collection("audit_logs").orderBy("timestamp","desc").limit(parseInt(limit));
    if (action) query = query.where("action","==",action);
    const snap = await query.get();
    res.json({ logs: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
  } catch (err) {
    res.status(500).json({ error: "Loglar alınamadı" });
  }
});

// ─── Sistem ayarları (SuperAdmin) ───────────────────────────────────────────
router.get("/settings", verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    const snap = await req.db.collection("settings").doc("system").get();
    res.json({ settings: snap.exists ? snap.data() : {} });
  } catch (err) {
    res.status(500).json({ error: "Ayarlar alınamadı" });
  }
});

router.put("/settings", verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    const allowed = ["siteName","maintenanceMode","allowRegistration","featuredTools"];
    const update  = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    update.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    update.updatedBy = req.user.uid;
    await req.db.collection("settings").doc("system").set(update, { merge: true });
    await logAction(req.db, req.user.uid, "SETTINGS_UPDATE", update);
    res.json({ message: "Ayarlar güncellendi" });
  } catch (err) {
    res.status(500).json({ error: "Güncelleme başarısız" });
  }
});

module.exports = router;
