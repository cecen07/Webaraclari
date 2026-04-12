const functions = require("firebase-functions");
const express   = require("express");
const cors      = require("cors");
const helmet    = require("helmet");
const admin     = require("firebase-admin");

// ─── Firebase Admin başlat ──────────────────────────────────────────────────
// API anahtarları SADECE burada, sunucu tarafında — frontend'e asla gönderilmez
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID   || functions.config().firebase?.project_id,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL || functions.config().app?.client_email,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY  || functions.config().app?.private_key || "")
                    .replace(/\\n/g, "\n"),
    }),
    storageBucket: `${process.env.FIREBASE_PROJECT_ID || "fclwebaraclari"}.appspot.com`,
  });
}

const db      = admin.firestore();
const storage = admin.storage();

// ─── Route modülleri ────────────────────────────────────────────────────────
const authRoutes      = require("./routes/auth");
const userRoutes      = require("./routes/users");
const teacherRoutes   = require("./routes/teachers");
const classRoutes     = require("./routes/classes");
const toolRoutes      = require("./routes/tools");
const communityRoutes = require("./routes/community");
const mediaRoutes     = require("./routes/media");
const adminRoutes     = require("./routes/admin");
const arizaRoutes     = require("./routes/arizalar");
const configRoutes    = require("./routes/config");
const guestbookRoutes = require("./routes/guestbook");

// ─── Express app ────────────────────────────────────────────────────────────
const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Context: db & storage her route'a geçiliyor
app.use((req, _res, next) => {
  req.db      = db;
  req.storage = storage;
  req.admin   = admin;
  next();
});

// ─── Rate limiting ──────────────────────────────────────────────────────────
const rateLimit = require("express-rate-limit");
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Çok fazla istek. Lütfen 15 dakika sonra tekrar deneyin." },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Giriş denemesi sınırı
  message: { error: "Çok fazla giriş denemesi. 15 dakika bekleyin." },
});

app.use(globalLimiter);

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use("/api/auth",      authLimiter, authRoutes);
app.use("/api/users",     userRoutes);
app.use("/api/teachers",  teacherRoutes);
app.use("/api/classes",   classRoutes);
app.use("/api/tools",     toolRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/media",     mediaRoutes);
app.use("/api/admin",     adminRoutes);
app.use("/api/arizalar",  arizaRoutes);
app.use("/api/config",    configRoutes);
app.use("/api/guestbook", guestbookRoutes);

// ─── Health check ───────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => res.json({ status: "ok", ts: Date.now() }));

// ─── Error handler ──────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("[API ERROR]", err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Sunucu hatası" });
});

exports.api = functions
  .region("europe-west1")
  .runWith({ memory: "512MB", timeoutSeconds: 60 })
  .https.onRequest(app);

module.exports.db      = db;
module.exports.storage = storage;
