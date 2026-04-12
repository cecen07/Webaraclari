// functions/src/routes/config.js
// Firebase client config'i backend'den sunar — kaynak kodda YOK
const router = require("express").Router();

// Firebase Client SDK config (public bilgiler — auth domain restriction ile korunur)
// Bu bilgiler Firebase Console'dan alınır, Functions environment'a set edilir:
// firebase functions:config:set client.api_key="..." client.auth_domain="..." vb.
router.get("/client", (_req, res) => {
  const cfg = {
    apiKey:            process.env.FB_CLIENT_API_KEY      || functions_config("client.api_key"),
    authDomain:        process.env.FB_AUTH_DOMAIN         || functions_config("client.auth_domain"),
    projectId:         process.env.FB_PROJECT_ID          || functions_config("client.project_id"),
    storageBucket:     process.env.FB_STORAGE_BUCKET      || functions_config("client.storage_bucket"),
    messagingSenderId: process.env.FB_MESSAGING_SENDER_ID || functions_config("client.messaging_sender_id"),
    appId:             process.env.FB_APP_ID              || functions_config("client.app_id"),
  };

  // Hiçbir değer yoksa hata ver
  if (!cfg.apiKey || !cfg.projectId) {
    return res.status(503).json({ error: "Sistem yapılandırması tamamlanmadı" });
  }

  // Cache-Control: client config'i 1 saat cache'le (sık istek olmasın)
  res.set("Cache-Control", "public, max-age=3600");
  res.json({ config: cfg });
});

function functions_config(key) {
  try {
    const functions = require("firebase-functions");
    const parts = key.split(".");
    let val = functions.config();
    for (const p of parts) val = val?.[p];
    return val || "";
  } catch { return ""; }
}

module.exports = router;
