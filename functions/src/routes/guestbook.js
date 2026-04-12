const router = require("express").Router();
const admin  = require("firebase-admin");
const { verifyToken, requireAdmin } = require("../middleware/auth");

// ─── Guestbook (herkese açık yaz, admin onaylar) ─────────────────────────
router.get("/", async (req, res) => {
  try {
    const snap = await req.db.collection("guestbook")
      .where("status", "==", "approved")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();
    res.json({ entries: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
  } catch(e) { res.status(500).json({ error: "Yüklenemedi" }); }
});

router.post("/", async (req, res) => {
  try {
    const { name, role, school, message, rating } = req.body;
    if (!name || !message) return res.status(400).json({ error: "Ad ve mesaj zorunlu" });
    if (message.length > 600) return res.status(400).json({ error: "Mesaj çok uzun" });

    await req.db.collection("guestbook").add({
      name: name.trim(),
      role: role||"",
      school: school||"",
      message: message.trim(),
      rating: parseInt(rating)||5,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.status(201).json({ message: "Mesaj alındı, onay bekliyor" });
  } catch(e) { res.status(500).json({ error: "Gönderilemedi" }); }
});

// Admin: bekleyenleri listele
router.get("/pending", verifyToken, requireAdmin, async (req, res) => {
  try {
    const snap = await req.db.collection("guestbook")
      .where("status", "==", "pending")
      .orderBy("createdAt", "desc")
      .get();
    res.json({ entries: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
  } catch(e) { res.status(500).json({ error: "Yüklenemedi" }); }
});

// Onayla / reddet
router.patch("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["approved","rejected"].includes(status)) return res.status(400).json({ error: "Geçersiz durum" });
    await req.db.collection("guestbook").doc(req.params.id).update({
      status,
      reviewedBy: req.user.uid,
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ message: status === "approved" ? "Onaylandı" : "Reddedildi" });
  } catch(e) { res.status(500).json({ error: "İşlem başarısız" }); }
});

router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    await req.db.collection("guestbook").doc(req.params.id).delete();
    res.json({ message: "Silindi" });
  } catch(e) { res.status(500).json({ error: "Silinemedi" }); }
});

module.exports = router;
