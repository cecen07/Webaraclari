const router  = require("express").Router();
const admin   = require("firebase-admin");
const jwt     = require("jsonwebtoken");
const bcrypt  = require("bcryptjs");
const { logAction } = require("../middleware/auth");

const JWT_SECRET = process.env.JWT_SECRET || "CHANGE_THIS_IN_PRODUCTION";
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "";

// ─── Kayıt (Öğretmen) ───────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { email, password, name, il, ilce, okul, brans, gorevYeri, kidem } = req.body;

    if (!email || !password || !name || !il || !okul || !brans) {
      return res.status(400).json({ error: "Zorunlu alanlar eksik: ad, e-posta, şifre, il, okul, branş" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Şifre en az 8 karakter olmalı" });
    }

    // Firebase Auth'da kullanıcı oluştur
    const userRecord = await admin.auth().createUser({ email, password, displayName: name });

    // Firestore'a kaydet
    const role = email === SUPER_ADMIN_EMAIL ? "superadmin" : "teacher";
    await req.db.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      name,
      role,
      status: "active",
      // Öğretmen bilgileri
      il:        il        || "",
      ilce:      ilce      || "",
      okul:      okul      || "",
      brans:     brans     || "",
      gorevYeri: gorevYeri || "",
      kidem:     parseInt(kidem) || 0,
      bio:       "",
      photoURL:  "",
      // İstatistikler
      reputation:    0,
      questionCount: 0,
      answerCount:   0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await logAction(req.db, userRecord.uid, "REGISTER", { email, role });

    // Custom token üret
    const token = await admin.auth().createCustomToken(userRecord.uid);
    res.status(201).json({ message: "Kayıt başarılı", token, uid: userRecord.uid, role });
  } catch (err) {
    if (err.code === "auth/email-already-exists") {
      return res.status(409).json({ error: "Bu e-posta adresi zaten kayıtlı" });
    }
    console.error(err);
    res.status(500).json({ error: "Kayıt sırasında hata oluştu" });
  }
});

// ─── Token yenile / kullanıcı bilgisi ───────────────────────────────────────
router.post("/verify", async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: "Token gerekli" });

    const decoded = await admin.auth().verifyIdToken(idToken);
    const snap    = await req.db.collection("users").doc(decoded.uid).get();

    if (!snap.exists) return res.status(404).json({ error: "Kullanıcı bulunamadı" });

    const user = snap.data();
    if (user.status === "blocked") return res.status(403).json({ error: "Hesabınız engellendi" });

    // Hassas alanları çıkar
    const { privateKey, password, ...safeUser } = user;

    res.json({ user: safeUser });
  } catch (err) {
    res.status(401).json({ error: "Geçersiz token" });
  }
});

// ─── Profil güncelle ────────────────────────────────────────────────────────
router.put("/profile", async (req, res) => {
  try {
    const { verifyToken } = require("../middleware/auth");
    // inline token doğrulama
    const header = req.headers.authorization || "";
    const token  = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Token gerekli" });

    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;

    const allowed = ["name", "il", "ilce", "okul", "brans", "gorevYeri", "kidem", "bio", "photoURL"];
    const update  = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });
    update.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await req.db.collection("users").doc(uid).update(update);
    if (update.name) await admin.auth().updateUser(uid, { displayName: update.name });

    res.json({ message: "Profil güncellendi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Profil güncellenemedi" });
  }
});

module.exports = router;
