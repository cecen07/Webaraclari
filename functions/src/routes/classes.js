const router = require("express").Router();
const admin  = require("firebase-admin");
const { v4: uuidv4 } = require("uuid");
const { verifyToken, requireTeacher, logAction } = require("../middleware/auth");

// ─── Öğretmenin sınıfları ───────────────────────────────────────────────────
router.get("/", verifyToken, requireTeacher, async (req, res) => {
  try {
    const snap = await req.db.collection("classes")
      .where("teacherUid", "==", req.user.uid)
      .orderBy("createdAt", "desc")
      .get();
    const classes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ classes });
  } catch (err) {
    res.status(500).json({ error: "Sınıflar alınamadı" });
  }
});

// ─── Sınıf oluştur ──────────────────────────────────────────────────────────
router.post("/", verifyToken, requireTeacher, async (req, res) => {
  try {
    const { name, description, grade } = req.body;
    if (!name) return res.status(400).json({ error: "Sınıf adı zorunlu" });

    // Benzersiz sınıf kodu (Tinkercad tarzı)
    const classCode = generateClassCode();

    const classData = {
      name,
      description: description || "",
      grade:       grade || "",
      teacherUid:  req.user.uid,
      teacherName: req.user.name,
      classCode,
      studentCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const ref = await req.db.collection("classes").add(classData);
    await logAction(req.db, req.user.uid, "CLASS_CREATE", { classId: ref.id, name });

    res.status(201).json({ message: "Sınıf oluşturuldu", classId: ref.id, classCode });
  } catch (err) {
    res.status(500).json({ error: "Sınıf oluşturulamadı" });
  }
});

// ─── Sınıf detayı + öğrenciler ──────────────────────────────────────────────
router.get("/:classId", verifyToken, requireTeacher, async (req, res) => {
  try {
    const classSnap = await req.db.collection("classes").doc(req.params.classId).get();
    if (!classSnap.exists) return res.status(404).json({ error: "Sınıf bulunamadı" });

    const classData = classSnap.data();
    // Sadece kendi sınıfını görebilir (admin hepsini görebilir)
    if (classData.teacherUid !== req.user.uid && !["superadmin","admin"].includes(req.user.role)) {
      return res.status(403).json({ error: "Bu sınıfa erişim yetkiniz yok" });
    }

    const studentsSnap = await req.db.collection("classes")
      .doc(req.params.classId)
      .collection("students")
      .orderBy("name")
      .get();
    const students = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    res.json({ class: { id: classSnap.id, ...classData }, students });
  } catch (err) {
    res.status(500).json({ error: "Sınıf detayı alınamadı" });
  }
});

// ─── Öğrenci ekle (tekli) ───────────────────────────────────────────────────
router.post("/:classId/students", verifyToken, requireTeacher, async (req, res) => {
  try {
    await checkClassOwner(req);
    const { name, studentNo, email, notes } = req.body;
    if (!name) return res.status(400).json({ error: "Öğrenci adı zorunlu" });

    const studentData = {
      name,
      studentNo: studentNo || "",
      email:     email     || "",
      notes:     notes     || "",
      classId:   req.params.classId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const ref = await req.db.collection("classes")
      .doc(req.params.classId)
      .collection("students")
      .add(studentData);

    // Sınıf sayacını güncelle
    await req.db.collection("classes").doc(req.params.classId).update({
      studentCount: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({ message: "Öğrenci eklendi", studentId: ref.id });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Öğrenci eklenemedi" });
  }
});

// ─── Toplu öğrenci ekle ─────────────────────────────────────────────────────
router.post("/:classId/students/bulk", verifyToken, requireTeacher, async (req, res) => {
  try {
    await checkClassOwner(req);
    const { students } = req.body; // [{ name, studentNo, email }]
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: "Öğrenci listesi boş" });
    }
    if (students.length > 100) {
      return res.status(400).json({ error: "Tek seferde en fazla 100 öğrenci eklenebilir" });
    }

    const batch = req.db.batch();
    const colRef = req.db.collection("classes").doc(req.params.classId).collection("students");

    students.forEach(s => {
      if (!s.name) return;
      const ref = colRef.doc();
      batch.set(ref, {
        name:      s.name      || "",
        studentNo: s.studentNo || "",
        email:     s.email     || "",
        notes:     s.notes     || "",
        classId:   req.params.classId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
    await req.db.collection("classes").doc(req.params.classId).update({
      studentCount: admin.firestore.FieldValue.increment(students.length),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({ message: `${students.length} öğrenci eklendi` });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Toplu ekleme başarısız" });
  }
});

// ─── Öğrenci güncelle ───────────────────────────────────────────────────────
router.put("/:classId/students/:studentId", verifyToken, requireTeacher, async (req, res) => {
  try {
    await checkClassOwner(req);
    const allowed = ["name", "studentNo", "email", "notes"];
    const update  = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });
    update.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await req.db.collection("classes")
      .doc(req.params.classId)
      .collection("students")
      .doc(req.params.studentId)
      .update(update);

    res.json({ message: "Öğrenci güncellendi" });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Güncelleme başarısız" });
  }
});

// ─── Öğrenci sil ────────────────────────────────────────────────────────────
router.delete("/:classId/students/:studentId", verifyToken, requireTeacher, async (req, res) => {
  try {
    await checkClassOwner(req);
    await req.db.collection("classes")
      .doc(req.params.classId)
      .collection("students")
      .doc(req.params.studentId)
      .delete();
    await req.db.collection("classes").doc(req.params.classId).update({
      studentCount: admin.firestore.FieldValue.increment(-1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ message: "Öğrenci silindi" });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Silme başarısız" });
  }
});

// ─── Sınıf sil ──────────────────────────────────────────────────────────────
router.delete("/:classId", verifyToken, requireTeacher, async (req, res) => {
  try {
    await checkClassOwner(req);
    // Alt koleksiyonu da sil
    const studentsSnap = await req.db.collection("classes")
      .doc(req.params.classId).collection("students").get();
    const batch = req.db.batch();
    studentsSnap.forEach(d => batch.delete(d.ref));
    batch.delete(req.db.collection("classes").doc(req.params.classId));
    await batch.commit();
    await logAction(req.db, req.user.uid, "CLASS_DELETE", { classId: req.params.classId });
    res.json({ message: "Sınıf silindi" });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: "Silme başarısız" });
  }
});

// ─── Yardımcılar ────────────────────────────────────────────────────────────
async function checkClassOwner(req) {
  const snap = await req.db.collection("classes").doc(req.params.classId).get();
  if (!snap.exists) { const e = new Error("Sınıf bulunamadı"); e.status = 404; throw e; }
  if (snap.data().teacherUid !== req.user.uid && !["superadmin","admin"].includes(req.user.role)) {
    const e = new Error("Bu sınıfa erişim yetkiniz yok"); e.status = 403; throw e;
  }
}

function generateClassCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

module.exports = router;
