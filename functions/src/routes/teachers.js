const router = require("express").Router();
const { verifyToken, requireAdmin } = require("../middleware/auth");

router.get("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const snap = await req.db.collection("users")
      .where("role","==","teacher")
      .where("status","==","active")
      .orderBy("name")
      .get();
    const teachers = snap.docs.map(d => {
      const { password, ...safe } = d.data();
      return safe;
    });
    res.json({ teachers });
  } catch (err) {
    res.status(500).json({ error: "Öğretmenler alınamadı" });
  }
});

module.exports = router;
