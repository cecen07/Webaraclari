const jwt   = require("jsonwebtoken");
const admin = require("firebase-admin");

const JWT_SECRET = process.env.JWT_SECRET || "CHANGE_THIS_IN_PRODUCTION";

// ─── Token doğrulama ────────────────────────────────────────────────────────
async function verifyToken(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token  = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Token gerekli" });

    // Önce Firebase ID token dene, sonra JWT
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(token);
      req.uid  = decoded.uid;
      req.email = decoded.email;
    } catch {
      decoded   = jwt.verify(token, JWT_SECRET);
      req.uid   = decoded.uid;
      req.email = decoded.email;
    }

    // Kullanıcı bilgilerini Firestore'dan çek
    const snap = await req.db.collection("users").doc(req.uid).get();
    if (!snap.exists) return res.status(401).json({ error: "Kullanıcı bulunamadı" });

    const userData = snap.data();
    if (userData.status === "blocked") return res.status(403).json({ error: "Hesabınız engellendi" });

    req.user = { uid: req.uid, email: req.email, ...userData };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Geçersiz token" });
  }
}

// ─── Rol kontrolleri ────────────────────────────────────────────────────────
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Giriş gerekli" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Bu işlem için yetkiniz yok" });
    }
    next();
  };
}

const requireSuperAdmin = requireRole("superadmin");
const requireAdmin      = requireRole("superadmin", "admin");
const requireTeacher    = requireRole("superadmin", "admin", "teacher");

// ─── Şüpheli işlem logu ─────────────────────────────────────────────────────
async function logAction(db, uid, action, details = {}) {
  try {
    await db.collection("audit_logs").add({
      uid,
      action,
      details,
      ip: details.ip || null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error("Log hatası:", e);
  }
}

module.exports = { verifyToken, requireRole, requireSuperAdmin, requireAdmin, requireTeacher, logAction };
