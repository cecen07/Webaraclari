const router = require("express").Router();
const admin  = require("firebase-admin");
const { verifyToken, requireAdmin, requireTeacher, logAction } = require("../middleware/auth");

const postLimiter = require("express-rate-limit")({
  windowMs: 10 * 60 * 1000, max: 20,
  message: { error: "Çok fazla gönderi. 10 dakika bekleyin." }
});

// ─── Sorular (ÜYE GEREKLİ) ──────────────────────────────────────────────────
router.get("/questions", verifyToken, async (req, res) => {
  try {
    const { filter, tag, limit = 20, id } = req.query;

    // Tekli soru getir
    if (id) {
      const snap = await req.db.collection("questions").doc(id).get();
      if (!snap.exists) return res.status(404).json({ error: "Soru bulunamadı" });
      return res.json({ questions: [{ id: snap.id, ...snap.data() }] });
    }

    let query = req.db.collection("questions")
      .where("status", "==", "active")
      .orderBy("createdAt", "desc")
      .limit(parseInt(limit));

    const snap = await query.get();
    let questions = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (filter === "unanswered") questions = questions.filter(q => q.answerCount === 0);
    if (filter === "answered")   questions = questions.filter(q => q.answerCount  > 0);
    if (filter === "mine")       questions = questions.filter(q => q.authorId === req.user.uid);
    if (tag)                     questions = questions.filter(q => (q.tags || []).includes(tag));

    res.json({ questions });
  } catch (err) {
    res.status(500).json({ error: "Sorular alınamadı" });
  }
});

// ─── Soru oluştur ───────────────────────────────────────────────────────────
router.post("/questions", verifyToken, postLimiter, async (req, res) => {
  try {
    const { title, body, tags, category } = req.body;
    if (!title || !body) return res.status(400).json({ error: "Başlık ve içerik zorunlu" });
    if (title.length > 200) return res.status(400).json({ error: "Başlık çok uzun" });
    if (body.length > 5000)  return res.status(400).json({ error: "İçerik çok uzun" });

    const data = {
      title: title.trim(),
      body:  body.trim(),
      tags:  (tags || []).slice(0, 5).map(t => t.toLowerCase().trim()),
      category: category || "genel",
      authorId:   req.user.uid,
      authorName: req.user.name,
      status:    "active",
      voteCount:  0,
      answerCount: 0,
      reportCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const ref = await req.db.collection("questions").add(data);
    // Kullanıcı istatistiği
    await req.db.collection("users").doc(req.user.uid).update({
      questionCount: admin.firestore.FieldValue.increment(1)
    });

    res.status(201).json({ message: "Soru eklendi", questionId: ref.id });
  } catch (err) {
    res.status(500).json({ error: "Soru eklenemedi" });
  }
});

// ─── Şikayet ────────────────────────────────────────────────────────────────
router.post("/questions/:id/report", verifyToken, async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: "Şikayet nedeni gerekli" });

    await req.db.collection("reports").add({
      contentType: "question",
      contentId:   req.params.id,
      reporterId:  req.user.uid,
      reason,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await req.db.collection("questions").doc(req.params.id).update({
      reportCount: admin.firestore.FieldValue.increment(1)
    });
    res.json({ message: "Şikayet iletildi" });
  } catch (err) {
    res.status(500).json({ error: "Şikayet gönderilemedi" });
  }
});

// ─── Moderasyon (Admin) ─────────────────────────────────────────────────────
router.get("/reports", verifyToken, requireAdmin, async (req, res) => {
  try {
    const snap = await req.db.collection("reports")
      .where("status", "==", "pending")
      .orderBy("createdAt", "desc")
      .get();
    res.json({ reports: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
  } catch (err) {
    res.status(500).json({ error: "Raporlar alınamadı" });
  }
});

router.patch("/reports/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { action } = req.body; // "dismiss" | "remove"
    const report = (await req.db.collection("reports").doc(req.params.id).get()).data();
    if (!report) return res.status(404).json({ error: "Rapor bulunamadı" });

    await req.db.collection("reports").doc(req.params.id).update({
      status: action === "remove" ? "removed" : "dismissed",
      resolvedBy: req.user.uid,
      resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (action === "remove") {
      await req.db.collection(report.contentType === "question" ? "questions" : "answers")
        .doc(report.contentId)
        .update({ status: "removed" });
    }

    await logAction(req.db, req.user.uid, "MODERATION", { reportId: req.params.id, action });
    res.json({ message: "Moderasyon işlemi tamamlandı" });
  } catch (err) {
    res.status(500).json({ error: "İşlem başarısız" });
  }
});

// ─── Yanıtlar ───────────────────────────────────────────────────────────────
router.get("/questions/:id/answers", verifyToken, async (req, res) => {
  try {
    const snap = await req.db.collection("questions").doc(req.params.id)
      .collection("answers").orderBy("votes", "desc").get();
    res.json({ answers: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
  } catch (err) {
    res.status(500).json({ error: "Yanıtlar alınamadı" });
  }
});

router.post("/questions/:id/answers", verifyToken, postLimiter, async (req, res) => {
  try {
    const { body } = req.body;
    if (!body || body.trim().length < 10) return res.status(400).json({ error: "Yanıt çok kısa (en az 10 karakter)" });

    const batch = req.db.batch();
    const aRef = req.db.collection("questions").doc(req.params.id).collection("answers").doc();
    batch.set(aRef, {
      body: body.trim(),
      authorId:   req.user.uid,
      authorName: req.user.name,
      votes: 0, accepted: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    batch.update(req.db.collection("questions").doc(req.params.id), {
      answerCount: admin.firestore.FieldValue.increment(1)
    });
    batch.update(req.db.collection("users").doc(req.user.uid), {
      answerCount: admin.firestore.FieldValue.increment(1),
      reputation:  admin.firestore.FieldValue.increment(5),
    });
    await batch.commit();
    res.status(201).json({ message: "Yanıt eklendi", answerId: aRef.id });
  } catch (err) {
    res.status(500).json({ error: "Yanıt eklenemedi" });
  }
});

// Yanıt oylama
router.patch("/questions/:qid/answers/:aid/vote", verifyToken, async (req, res) => {
  try {
    const { dir } = req.body;
    if (![1,-1].includes(parseInt(dir))) return res.status(400).json({ error: "Geçersiz oy" });
    await req.db.collection("questions").doc(req.params.qid)
      .collection("answers").doc(req.params.aid)
      .update({ votes: admin.firestore.FieldValue.increment(parseInt(dir)) });
    res.json({ message: "Oy kaydedildi" });
  } catch(err) {
    res.status(500).json({ error: "Oy verilemedi" });
  }
});

// Soru sil (admin veya sahibi)
router.delete("/questions/:id", verifyToken, async (req, res) => {
  try {
    const snap = await req.db.collection("questions").doc(req.params.id).get();
    if (!snap.exists) return res.status(404).json({ error: "Soru bulunamadı" });
    const q = snap.data();
    const isOwner = q.authorId === req.user.uid;
    const isAdmin = ["superadmin","admin"].includes(req.user.role);
    if (!isOwner && !isAdmin) return res.status(403).json({ error: "Yetki yok" });

    // Alt koleksiyonu da temizle
    const answersSnap = await req.db.collection("questions").doc(req.params.id).collection("answers").get();
    const batch = req.db.batch();
    answersSnap.forEach(d => batch.delete(d.ref));
    batch.delete(req.db.collection("questions").doc(req.params.id));
    await batch.commit();
    res.json({ message: "Soru silindi" });
  } catch(err) {
    res.status(500).json({ error: "Soru silinemedi" });
  }
});

module.exports = router;
