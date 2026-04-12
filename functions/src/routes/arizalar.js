const router = require("express").Router();
const admin  = require("firebase-admin");
const { verifyToken, requireAdmin, requireTeacher } = require("../middleware/auth");

// Arızalar — öğretmenler bildirir, adminler yönetir
router.get("/", verifyToken, async (req, res) => {
  try {
    const { durum, ekipman } = req.query;
    let query = req.db.collection("arizalar").orderBy("createdAt","desc");
    if (durum)   query = query.where("durum","==",durum);
    if (ekipman) query = query.where("ekipman","==",ekipman);
    const snap = await query.limit(100).get();
    res.json({ arizalar: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
  } catch (err) {
    res.status(500).json({ error: "Arızalar alınamadı" });
  }
});

router.post("/", verifyToken, async (req, res) => {
  try {
    const { ekipman, baslik, aciklama, oncelik, cihazNo } = req.body;
    if (!ekipman || !baslik || !aciklama) {
      return res.status(400).json({ error: "Ekipman, başlık ve açıklama zorunlu" });
    }
    const ref = await req.db.collection("arizalar").add({
      ekipman, baslik, aciklama, oncelik: oncelik||"normal",
      cihazNo: cihazNo||"",
      durum: "acik",
      authorId:   req.user.uid,
      authorName: req.user.name,
      createdAt:  admin.firestore.FieldValue.serverTimestamp(),
    });
    res.status(201).json({ message: "Arıza bildirildi", id: ref.id });
  } catch (err) {
    res.status(500).json({ error: "Bildirim başarısız" });
  }
});

router.patch("/:id/durum", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { durum } = req.body;
    if (!["acik","inceleniyor","cozuldu"].includes(durum))
      return res.status(400).json({ error: "Geçersiz durum" });
    await req.db.collection("arizalar").doc(req.params.id).update({
      durum,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: req.user.uid,
    });
    res.json({ message: "Durum güncellendi" });
  } catch (err) {
    res.status(500).json({ error: "Güncelleme başarısız" });
  }
});

router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    await req.db.collection("arizalar").doc(req.params.id).delete();
    res.json({ message: "Arıza silindi" });
  } catch (err) {
    res.status(500).json({ error: "Silme başarısız" });
  }
});

module.exports = router;
