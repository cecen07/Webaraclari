const router = require("express").Router();
const admin  = require("firebase-admin");
const { verifyToken, requireAdmin, logAction } = require("../middleware/auth");

// ─── Araçları listele (herkese açık) ────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { cat, search, featured } = req.query;
    let query = req.db.collection("tools").where("active", "==", true);
    if (cat)      query = query.where("cat", "==", cat);
    if (featured) query = query.where("featured", "==", true);

    const snap  = await query.orderBy("name").get();
    let tools   = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (search) {
      const q = search.toLowerCase();
      tools = tools.filter(t =>
        (t.name || "").toLowerCase().includes(q) ||
        (t.desc || "").toLowerCase().includes(q) ||
        (t.cat  || "").toLowerCase().includes(q)
      );
    }

    res.json({ tools, total: tools.length });
  } catch (err) {
    res.status(500).json({ error: "Araçlar alınamadı" });
  }
});

// ─── Kategoriler (herkese açık) ─────────────────────────────────────────────
router.get("/categories", async (req, res) => {
  try {
    const snap = await req.db.collection("tool_categories").orderBy("name").get();
    const cats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ categories: cats });
  } catch (err) {
    res.status(500).json({ error: "Kategoriler alınamadı" });
  }
});

// ─── Araç ekle/güncelle (Admin) ─────────────────────────────────────────────
router.post("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, desc, cat, url, logo, badges, note, featured, meb,
            kimlerIcin, ornekKullanim } = req.body;
    if (!name || !cat) return res.status(400).json({ error: "Ad ve kategori zorunlu" });

    const data = {
      name, desc: desc || "", cat, url: url || "", logo: logo || "",
      badges: badges || [], note: note || "",
      featured: !!featured, meb: !!meb, active: true,
      kimlerIcin:   kimlerIcin   || "",
      ornekKullanim: ornekKullanim || "",
      addedBy: req.user.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const ref = await req.db.collection("tools").add(data);
    await logAction(req.db, req.user.uid, "TOOL_ADD", { toolId: ref.id, name });
    res.status(201).json({ message: "Araç eklendi", toolId: ref.id });
  } catch (err) {
    res.status(500).json({ error: "Araç eklenemedi" });
  }
});

router.put("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const allowed = ["name","desc","cat","url","logo","badges","note","featured","meb",
                     "active","kimlerIcin","ornekKullanim"];
    const update  = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });
    update.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    await req.db.collection("tools").doc(req.params.id).update(update);
    res.json({ message: "Araç güncellendi" });
  } catch (err) {
    res.status(500).json({ error: "Güncelleme başarısız" });
  }
});

router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    await req.db.collection("tools").doc(req.params.id).delete();
    await logAction(req.db, req.user.uid, "TOOL_DELETE", { toolId: req.params.id });
    res.json({ message: "Araç silindi" });
  } catch (err) {
    res.status(500).json({ error: "Silme başarısız" });
  }
});

module.exports = router;
