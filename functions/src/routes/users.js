const router = require("express").Router();
const admin  = require("firebase-admin");
const { verifyToken, requireSuperAdmin, requireAdmin, logAction } = require("../middleware/auth");

// Tüm kullanıcılar — sadece admin+
router.get("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { role, status, search, limit = 50, offset = 0 } = req.query;
    let query = req.db.collection("users").orderBy("createdAt", "desc");

    if (role)   query = query.where("role", "==", role);
    if (status) query = query.where("status", "==", status);

    const snap  = await query.limit(parseInt(limit)).get();
    let users   = snap.docs.map(d => {
      const { privateKey, password, ...safe } = d.data();
      return safe;
    });

    if (search) {
      const q = search.toLowerCase();
      users = users.filter(u =>
        (u.name  || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.okul  || "").toLowerCase().includes(q)
      );
    }

    res.json({ users, total: users.length });
  } catch (err) {
    res.status(500).json({ error: "Kullanıcılar alınamadı" });
  }
});

// Kullanıcı detay
router.get("/:uid", verifyToken, requireAdmin, async (req, res) => {
  try {
    const snap = await req.db.collection("users").doc(req.params.uid).get();
    if (!snap.exists) return res.status(404).json({ error: "Kullanıcı bulunamadı" });
    const { password, ...safe } = snap.data();
    res.json({ user: safe });
  } catch (err) {
    res.status(500).json({ error: "Kullanıcı alınamadı" });
  }
});

// Rol değiştir — sadece SuperAdmin
router.patch("/:uid/role", verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!["teacher", "admin", "superadmin"].includes(role)) {
      return res.status(400).json({ error: "Geçersiz rol" });
    }
    await req.db.collection("users").doc(req.params.uid).update({
      role,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    await logAction(req.db, req.user.uid, "ROLE_CHANGE", {
      targetUid: req.params.uid, newRole: role
    });
    res.json({ message: "Rol güncellendi" });
  } catch (err) {
    res.status(500).json({ error: "Rol güncellenemedi" });
  }
});

// Kullanıcı durumu (active / blocked / passive) — SuperAdmin
router.patch("/:uid/status", verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["active", "blocked", "passive"].includes(status)) {
      return res.status(400).json({ error: "Geçersiz durum" });
    }
    await req.db.collection("users").doc(req.params.uid).update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    // Firebase Auth'da da bloke
    if (status === "blocked") {
      await admin.auth().updateUser(req.params.uid, { disabled: true });
    } else {
      await admin.auth().updateUser(req.params.uid, { disabled: false });
    }
    await logAction(req.db, req.user.uid, "STATUS_CHANGE", {
      targetUid: req.params.uid, newStatus: status
    });
    res.json({ message: "Durum güncellendi" });
  } catch (err) {
    res.status(500).json({ error: "Durum güncellenemedi" });
  }
});

// Kullanıcı sil — SuperAdmin
router.delete("/:uid", verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    if (req.params.uid === req.user.uid) {
      return res.status(400).json({ error: "Kendinizi silemezsiniz" });
    }
    await admin.auth().deleteUser(req.params.uid);
    await req.db.collection("users").doc(req.params.uid).delete();
    await logAction(req.db, req.user.uid, "USER_DELETE", { targetUid: req.params.uid });
    res.json({ message: "Kullanıcı silindi" });
  } catch (err) {
    res.status(500).json({ error: "Kullanıcı silinemedi" });
  }
});

// Audit logları — SuperAdmin
router.get("/audit/logs", verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    const snap = await req.db.collection("audit_logs")
      .orderBy("timestamp", "desc")
      .limit(200)
      .get();
    const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: "Loglar alınamadı" });
  }
});

module.exports = router;
