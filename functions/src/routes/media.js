const router  = require("express").Router();
const admin   = require("firebase-admin");
const multer  = require("multer");
const { v4: uuidv4 } = require("uuid");
const { verifyToken, requireAdmin } = require("../middleware/auth");

// Multer: memory storage (Firebase Storage'a yüklenecek)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg","image/png","image/gif","image/webp","image/svg+xml",
                     "video/mp4","video/webm","application/pdf"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Desteklenmeyen dosya türü"));
  }
});

// ─── Medya listele (üye gerekli) ────────────────────────────────────────────
router.get("/", verifyToken, async (req, res) => {
  try {
    const { category, type, search, limit = 30 } = req.query;
    let query = req.db.collection("media")
      .where("status", "==", "active")
      .orderBy("createdAt", "desc")
      .limit(parseInt(limit));

    if (category) query = query.where("category", "==", category);
    if (type)     query = query.where("fileType", "==", type);

    const snap  = await query.get();
    let items   = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(m =>
        (m.name || "").toLowerCase().includes(q) ||
        (m.tags || []).some(t => t.includes(q))
      );
    }

    res.json({ media: items, total: items.length });
  } catch (err) {
    res.status(500).json({ error: "Medya listesi alınamadı" });
  }
});

// ─── Dosya yükle (üye gerekli) ──────────────────────────────────────────────
router.post("/upload", verifyToken, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Dosya seçilmedi" });

    const { name, category, tags, description } = req.body;
    const fileId  = uuidv4();
    const ext     = req.file.originalname.split(".").pop();
    const path    = `media/${category || "genel"}/${fileId}.${ext}`;

    const bucket  = admin.storage().bucket();
    const fileRef = bucket.file(path);

    await fileRef.save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype,
        metadata: { uploadedBy: req.user.uid }
      }
    });

    await fileRef.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${path}`;

    const mediaDoc = {
      name:        name || req.file.originalname,
      description: description || "",
      category:    category || "genel",
      tags:        tags ? tags.split(",").map(t => t.trim()) : [],
      fileType:    req.file.mimetype.startsWith("video") ? "video" : "image",
      mimeType:    req.file.mimetype,
      size:        req.file.size,
      url:         publicUrl,
      storagePath: path,
      uploadedBy:  req.user.uid,
      uploaderName: req.user.name,
      status:      "active",
      downloads:   0,
      createdAt:   admin.firestore.FieldValue.serverTimestamp(),
    };

    const ref = await req.db.collection("media").add(mediaDoc);
    res.status(201).json({ message: "Dosya yüklendi", mediaId: ref.id, url: publicUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Yükleme başarısız" });
  }
});

// ─── İndir (sayaç artır) ────────────────────────────────────────────────────
router.post("/:id/download", verifyToken, async (req, res) => {
  try {
    const snap = await req.db.collection("media").doc(req.params.id).get();
    if (!snap.exists) return res.status(404).json({ error: "Dosya bulunamadı" });

    await req.db.collection("media").doc(req.params.id).update({
      downloads: admin.firestore.FieldValue.increment(1)
    });

    res.json({ url: snap.data().url });
  } catch (err) {
    res.status(500).json({ error: "İndirme başarısız" });
  }
});

// ─── Sil (Admin veya sahibi) ────────────────────────────────────────────────
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const snap = await req.db.collection("media").doc(req.params.id).get();
    if (!snap.exists) return res.status(404).json({ error: "Dosya bulunamadı" });

    const media = snap.data();
    const isOwner = media.uploadedBy === req.user.uid;
    const isAdmin = ["superadmin","admin"].includes(req.user.role);
    if (!isOwner && !isAdmin) return res.status(403).json({ error: "Yetki yok" });

    // Storage'dan sil
    try {
      await admin.storage().bucket().file(media.storagePath).delete();
    } catch (e) { /* dosya zaten yoksa geç */ }

    await req.db.collection("media").doc(req.params.id).delete();
    res.json({ message: "Dosya silindi" });
  } catch (err) {
    res.status(500).json({ error: "Silme başarısız" });
  }
});

// ─── Kategoriler ────────────────────────────────────────────────────────────
router.get("/categories", verifyToken, async (_req, res) => {
  res.json({
    categories: [
      { id: "genel",     name: "Genel"          },
      { id: "egitim",    name: "Eğitim Görseli"  },
      { id: "mebkit",    name: "MEBKit"          },
      { id: "3d",        name: "3D Baskı"        },
      { id: "robotik",   name: "Robotik"         },
      { id: "sunum",     name: "Sunum Materyali" },
      { id: "video",     name: "Video"           },
    ]
  });
});

module.exports = router;
