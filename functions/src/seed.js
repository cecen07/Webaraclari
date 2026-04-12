/**
 * YENİLİKÇİ SINIF — Araç Seed Script
 * Çalıştır: node functions/src/seed.js
 * (Firebase emülatör açık olmalı ya da gerçek proje config ayarlı olmalı)
 *
 * Bu script araçları Firestore'a yükler.
 * Sonraki çalıştırmalarda mevcut araçların üzerine merge eder.
 */

require("dotenv").config({ path: ".env" });
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();

const TOOLS = [
  // ── MEB / SINIIF YÖNETİMİ ─────────────────────────────────────────────
  { id:"t1",  name:"Yenilikçi Sınıf",    cat:"Sınıf yönetimi araçları",  url:"https://yenilikcisinif.meb.gov.tr/",       desc:"MEB Yenilikçi Sınıflar projesine ait resmi platform. Duyurular, materyaller ve etkinlikler.", badges:[], logo:"https://yenilikcisinif.meb.gov.tr/favicon.ico", featured:true, meb:true },
  { id:"t2",  name:"MEBKIT Öğren",       cat:"Kodlama / programlama araçları", url:"https://mebkit.eba.gov.tr/ogren/",   desc:"MEB'in blok tabanlı kodlama öğretim platformu. Robotik kodlama temellerini öğretir.", badges:["Kodlama"], logo:"https://mebkit.eba.gov.tr/favicon.ico", featured:true, meb:true },
  { id:"t3",  name:"EBA",                cat:"Sınıf yönetimi araçları",  url:"https://www.eba.gov.tr/",                  desc:"MEB Eğitim Bilişim Ağı. Ders içerikleri, etkinlikler ve öğretmen-öğrenci iletişimi.", badges:[], logo:"https://www.eba.gov.tr/favicon.ico", featured:true, meb:true },
  { id:"t4",  name:"OGM Materyal",       cat:"Sınıf yönetimi araçları",  url:"https://ogmmateryal.eba.gov.tr/",          desc:"MEB onaylı öğretim materyalleri, çalışma kâğıtları ve kaynaklar.", badges:[], logo:"https://ogmmateryal.eba.gov.tr/favicon.ico", featured:true, meb:true },
  { id:"t5",  name:"MEBİ",               cat:"Sınıf yönetimi araçları",  url:"https://mebi.meb.gov.tr/",                 desc:"MEB İnsan Kaynakları Yönetim Sistemi.", badges:[], logo:"https://mebi.meb.gov.tr/favicon.ico", featured:true, meb:true },
  { id:"t6",  name:"MEBBİS",             cat:"Sınıf yönetimi araçları",  url:"https://mebbis.meb.gov.tr/",               desc:"MEB Bilgi İşlem Sistemi. Okul/personel işlemleri.", badges:[], logo:"https://mebbis.meb.gov.tr/favicon.ico", featured:true, meb:true },
  { id:"t3a", name:"Google Classroom",   cat:"Sınıf yönetimi araçları",  url:"https://classroom.google.com/",            desc:"Google'ın ücretsiz öğrenme yönetim sistemi.", badges:[], logo:"https://ssl.gstatic.com/classroom/favicon.png" },
  { id:"t3b", name:"ClassDojo",          cat:"Sınıf yönetimi araçları",  url:"https://www.classdojo.com/",               desc:"Davranış takibi ve aile-öğretmen iletişim aracı.", badges:[], logo:"https://www.classdojo.com/favicon.ico" },

  // ── GENEL AMAÇLI YZ ───────────────────────────────────────────────────
  { id:"yz1", name:"ChatGPT",            cat:"Genel amaçlı yapay zekâ araçları", url:"https://chatgpt.com/",             desc:"OpenAI'nin sohbet tabanlı YZ asistanı. İçerik üretimi, soru-cevap, kod yazma.", badges:["AI"], logo:"https://openai.com/favicon.ico" },
  { id:"yz2", name:"Claude",             cat:"Genel amaçlı yapay zekâ araçları", url:"https://claude.ai/",              desc:"Anthropic'in yaratıcı içerik, kod yazma ve karmaşık problem çözme asistanı.", badges:["AI"], logo:"https://claude.ai/favicon.ico" },
  { id:"yz3", name:"Gemini",             cat:"Genel amaçlı yapay zekâ araçları", url:"https://gemini.google.com/",      desc:"Google'ın çok modlu YZ asistanı.", badges:["AI"], logo:"https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg" },
  { id:"yz4", name:"Perplexity AI",      cat:"Genel amaçlı yapay zekâ araçları", url:"https://www.perplexity.ai/",      desc:"Kaynak göstererek güncel bilgilere ulaşmanızı sağlayan YZ arama motoru.", badges:["AI"], logo:"https://www.perplexity.ai/favicon.ico" },
  { id:"yz5", name:"NotebookLM",         cat:"Genel amaçlı yapay zekâ araçları", url:"https://notebooklm.google/",      desc:"Belge yükleyip soru sormanızı sağlayan Google araştırma aracı.", badges:["AI"], logo:"https://notebooklm.google/favicon.ico" },
  { id:"yz6", name:"Copilot (Microsoft)  ",cat:"Genel amaçlı yapay zekâ araçları",url:"https://copilot.microsoft.com/", desc:"Microsoft'un GPT-4 tabanlı YZ asistanı. Office ile entegre.", badges:["AI"], logo:"https://copilot.microsoft.com/favicon.ico" },

  // ── SUNUM ──────────────────────────────────────────────────────────────
  { id:"s1",  name:"Canva",              cat:"Etkileşimli sunum araçları",url:"https://www.canva.com/",                  desc:"Poster, sunum, infografik ve grafik tasarım için sürükle-bırak aracı.", badges:["AI","Tasarım"], logo:"https://static.canva.com/web/images/12487a1e0770d29351bd4ce4f87ec8fe.svg", featured:true, kimlerIcin:"Tüm branş öğretmenleri", ornekKullanim:"Sınıf posteri, ders sunumu, infografik" },
  { id:"s2",  name:"Genially",           cat:"Etkileşimli sunum araçları",url:"https://app.genially.com/",               desc:"Animasyonlu ve interaktif sunum, infografik ve dijital içerik oluşturma.", badges:[], logo:"https://genially.com/favicon.ico" },
  { id:"s3",  name:"Gamma",              cat:"Etkileşimli sunum araçları",url:"https://gamma.app/",                      desc:"YZ destekli hızlı sunum ve belge oluşturma aracı.", badges:["AI"], logo:"https://gamma.app/favicon.ico" },
  { id:"s4",  name:"Mentimeter",         cat:"Etkileşimli sunum araçları",url:"https://www.mentimeter.com/",             desc:"Anlık anket ve oylamayla sunumları etkileşimli hâle getiren araç.", badges:[], logo:"https://www.mentimeter.com/favicon.ico" },
  { id:"s5",  name:"Nearpod",            cat:"Etkileşimli sunum araçları",url:"https://nearpod.com/",                    desc:"Öğrenci cihazlarına interaktif içerik gönderip anlık geri bildirim alan araç.", badges:[], logo:"https://nearpod.com/favicon.ico" },

  // ── ANKET (Microsoft Forms eklendi) ────────────────────────────────────
  { id:"a1",  name:"Google Forms",       cat:"Anket araçları",            url:"https://forms.google.com/",               desc:"Google'ın ücretsiz anket ve form aracı. Otomatik notlama ve analiz.", badges:[], logo:"https://ssl.gstatic.com/docs/spreadsheets/forms/favicon_qp2.png", kimlerIcin:"Tüm öğretmenler", ornekKullanim:"Yoklama, quiz, anket, veli iletişim formu" },
  { id:"a2",  name:"Microsoft Forms",    cat:"Anket araçları",            url:"https://forms.office.com/",               desc:"Microsoft'un ücretsiz form ve anket aracı. Office 365 ile tam entegre, otomatik notlama ve Teams'e bağlantı desteği.", badges:[], logo:"https://www.microsoft.com/favicon.ico", kimlerIcin:"Microsoft 365 kullanan öğretmenler", ornekKullanim:"Quiz, sınav, anket, Teams ile entegre değerlendirme" },
  { id:"a3",  name:"Kahoot!",            cat:"Anket araçları",            url:"https://kahoot.com/",                     desc:"Oyunlaştırılmış anlık testler ve anketler. Sınıf etkileşimi için popüler.", badges:["Oyun"], logo:"https://kahoot.com/favicon.ico" },

  // ── AR + VR (tek kategori — EBA VR eklendi) ───────────────────────────
  { id:"ar1", name:"EBA VR",             cat:"Artırılmış / Sanal gerçeklik uygulamaları", url:"https://vr.eba.gov.tr",  desc:"MEB'in resmi VR platformu. Sanal gerçeklik ile etkileşimli ders içerikleri ve 360° deneyimler.", badges:["VR"], logo:"https://vr.eba.gov.tr/favicon.ico", meb:true, kimlerIcin:"Tüm branş öğretmenleri", ornekKullanim:"360° sanal gezi, VR deney, etkileşimli ders" },
  { id:"ar2", name:"CoSpaces Edu",       cat:"Artırılmış / Sanal gerçeklik uygulamaları", url:"https://cospaces.io/edu/", desc:"Öğrencilerin 3D sanal dünyalar ve AR deneyimleri oluşturmasını sağlayan platform.", badges:["VR","AR"], logo:"https://cospaces.io/favicon.ico" },
  { id:"ar3", name:"Merge Cube",         cat:"Artırılmış / Sanal gerçeklik uygulamaları", url:"https://mergeedu.com/",  desc:"Fiziksel küp ile AR nesneleri etkileşimli olarak görüntüleme.", badges:["AR"], logo:"https://mergeedu.com/favicon.ico" },
  { id:"ar4", name:"Assemblr EDU",       cat:"Artırılmış / Sanal gerçeklik uygulamaları", url:"https://edu.assemblrworld.com/", desc:"Artırılmış gerçeklik ile etkileşimli ders materyali oluşturma.", badges:["AR"], logo:"https://edu.assemblrworld.com/favicon.ico" },

  // ── 3D ────────────────────────────────────────────────────────────────
  { id:"3d1", name:"Tinkercad",          cat:"3D model oluşturma araçları",url:"https://www.tinkercad.com/dashboard",   desc:"3B baskı için model tasarımı yapabilen, tarayıcı tabanlı basit 3D modelleme aracı.", badges:["3D"], logo:"https://www.tinkercad.com/favicon.ico", featured:true, kimlerIcin:"Teknoloji ve tasarım öğretmenleri", ornekKullanim:"Creality K1C ile basım için model tasarımı" },
  { id:"3d2", name:"SketchUp Free",      cat:"3D model oluşturma araçları",url:"https://www.sketchup.com/plans-and-pricing/sketchup-free", desc:"Mimari ve tasarım odaklı ücretsiz 3D modelleme aracı.", badges:["3D"], logo:"https://www.sketchup.com/favicon.ico" },
  { id:"3d3", name:"Blender",            cat:"3D model oluşturma araçları",url:"https://www.blender.org/",              desc:"Açık kaynaklı güçlü 3D modelleme, animasyon ve render yazılımı.", badges:["3D"], logo:"https://www.blender.org/favicon.ico" },

  // ── KODLAMA / ROBOTİK ─────────────────────────────────────────────────
  { id:"k1",  name:"Scratch",            cat:"Kodlama / programlama araçları", url:"https://scratch.mit.edu/",          desc:"MIT'nin blok tabanlı görsel programlama platformu. İlk kodlama deneyimi için ideal.", badges:["Kodlama"], logo:"https://scratch.mit.edu/favicon.ico", kimlerIcin:"İlkokul ve ortaokul öğretmenleri" },
  { id:"k2",  name:"Code.org",           cat:"Kodlama / programlama araçları", url:"https://code.org/",                 desc:"Ücretsiz kodlama eğitimi. Hour of Code etkinlikleri.", badges:["Kodlama"], logo:"https://code.org/favicon.ico" },
  { id:"k3",  name:"micro:bit",          cat:"Kodlama / programlama araçları", url:"https://microbit.org/",             desc:"Eğitim amaçlı programlanabilir mini bilgisayar. MakeCode editörü ile kolayca kodlanabilir.", badges:["Kodlama"], logo:"https://microbit.org/favicon.ico" },

  // ── BEYAZ TAHTA ───────────────────────────────────────────────────────
  { id:"wh1", name:"Miro",               cat:"Etkileşimli beyaz tahta araçları", url:"https://miro.com/",               desc:"Çevrim içi beyaz tahta ve iş birliği platformu.", badges:[], logo:"https://miro.com/favicon.ico" },
  { id:"wh2", name:"Jamboard",           cat:"Etkileşimli beyaz tahta araçları", url:"https://jamboard.google.com/",    desc:"Google'ın dijital beyaz tahtası. Drive ile entegre.", badges:[], logo:"https://jamboard.google.com/favicon.ico" },
  { id:"wh3", name:"Microsoft Whiteboard",cat:"Etkileşimli beyaz tahta araçları",url:"https://whiteboard.microsoft.com/", desc:"Microsoft'un dijital beyaz tahtası. Teams ile entegre.", badges:[], logo:"https://whiteboard.microsoft.com/favicon.ico" },
  { id:"wh4", name:"Padlet",             cat:"Dijital pano / post-it araçları", url:"https://padlet.com/",              desc:"Dijital pano üzerinde paylaşım, tartışma ve fikir toplama.", badges:[], logo:"https://padlet.com/favicon.ico" },

  // ── VIDEO ─────────────────────────────────────────────────────────────
  { id:"v1",  name:"CapCut",             cat:"Video düzenleme araçları",  url:"https://www.capcut.com/",                desc:"Mobil ve masaüstü için kolay kullanımlı video düzenleme uygulaması.", badges:["Video"], logo:"https://lf16-effectcdn-tos.pstatp.com/obj/effcdn-tos/web/favicon.ico" },
  { id:"v2",  name:"Veed.io",            cat:"Video düzenleme araçları",  url:"https://www.veed.io/",                   desc:"Tarayıcı tabanlı video düzenleme, altyazı ekleme ve çeviri.", badges:["Video","AI"], logo:"https://www.veed.io/favicon.ico" },
  { id:"v3",  name:"Heygen",             cat:"Video düzenleme araçları",  url:"https://www.heygen.com/",                desc:"YZ avatar ve seslendirme ile eğitim videoları üretme.", badges:["AI","Video"], logo:"https://www.heygen.com/favicon.ico" },

  // ── SES ───────────────────────────────────────────────────────────────
  { id:"ses1",name:"ElevenLabs",         cat:"Ses düzenleme araçları",    url:"https://elevenlabs.io/app/home",         desc:"Gerçekçi ses klonlama ve metin-sese dönüştürme.", badges:["AI","Ses"], logo:"https://elevenlabs.io/favicon.ico" },
  { id:"ses2",name:"Suno",               cat:"Ses düzenleme araçları",    url:"https://suno.com/home",                  desc:"YZ ile özgün müzik besteleme ve şarkı oluşturma.", badges:["AI","Ses"], logo:"https://suno.com/favicon.ico" },

  // ── DEPOLAMA ──────────────────────────────────────────────────────────
  { id:"dep1",name:"Google Drive",       cat:"Depolama ve dosyalama araçları", url:"https://drive.google.com/",         desc:"Google bulut depolama. Dosya paylaşımı ve iş birliği.", badges:[], logo:"https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png" },
  { id:"dep2",name:"OneDrive",           cat:"Depolama ve dosyalama araçları", url:"https://onedrive.microsoft.com/",   desc:"Microsoft bulut depolama. Office ile tam entegre.", badges:[], logo:"https://onedrive.live.com/favicon.ico" },

  // ── OYUN / GAMİFİCATION ───────────────────────────────────────────────
  { id:"oyun1",name:"Quizizz",           cat:"Oyun tabanlı web araçları", url:"https://quizizz.com/",                   desc:"Oyunlaştırılmış testler ve canlı dersler. Ödevleme özelliği de mevcut.", badges:["Oyun"], logo:"https://quizizz.com/favicon.ico" },
  { id:"oyun2",name:"Wordwall",          cat:"Oyunlaştırma web araçları", url:"https://wordwall.net/",                  desc:"Kelime oyunları, eşleştirmeler, anagramlar oluşturma.", badges:["Oyun"], logo:"https://wordwall.net/favicon.ico" },

  // ── ZİHİN HARİTASI ────────────────────────────────────────────────────
  { id:"m1",  name:"MindMeister",        cat:"Zihin haritası oluşturma araçları", url:"https://www.mindmeister.com/",  desc:"İş birlikli çevrim içi zihin haritası oluşturma ve paylaşma.", badges:[], logo:"https://www.mindmeister.com/favicon.ico" },
  { id:"m2",  name:"Coggle",             cat:"Kavram haritası oluşturma araçları",url:"https://coggle.it/",             desc:"Renk kodlu kavram haritaları ve akış şemaları.", badges:[], logo:"https://coggle.it/favicon.ico" },

  // ── MATEMATİK ─────────────────────────────────────────────────────────
  { id:"mat1",name:"GeoGebra",           cat:"Dinamik matematik ve geometri araçları", url:"https://www.geogebra.org/", desc:"Geometri, cebir, istatistik ve hesap için interaktif matematik aracı.", badges:[], logo:"https://www.geogebra.org/favicon.ico", kimlerIcin:"Matematik öğretmenleri" },

  // ── SİMÜLASYON ───────────────────────────────────────────────────────
  { id:"sim1",name:"PhET Simülasyonları",cat:"Simülasyon araçları",        url:"https://phet.colorado.edu/tr/",         desc:"Colorado Üniversitesi'nin ücretsiz bilim ve matematik simülasyonları.", badges:[], logo:"https://phet.colorado.edu/favicon.ico", kimlerIcin:"Fen ve matematik öğretmenleri", ornekKullanim:"Fizik, kimya, biyoloji deneyleri" },

  // ── EKRAN KAYDI ───────────────────────────────────────────────────────
  { id:"ek1", name:"Loom",               cat:"Ekran kaydı alma araçları",  url:"https://www.loom.com/",                 desc:"Hızlı ekran kaydı ve video mesajı gönderme aracı.", badges:[], logo:"https://www.loom.com/favicon.ico" },
  { id:"ek2", name:"OBS Studio",         cat:"Ekran kaydı alma araçları",  url:"https://obsproject.com/",               desc:"Açık kaynaklı yayın ve ekran kaydı yazılımı.", badges:[], logo:"https://obsproject.com/favicon.ico" },
];

async function seed() {
  console.log(`🌱 ${TOOLS.length} araç Firestore'a yükleniyor…`);
  const batch = db.batch();
  TOOLS.forEach(t => {
    const { id, ...data } = t;
    const ref = db.collection("tools").doc(id);
    batch.set(ref, { ...data, active: true, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  });
  await batch.commit();
  console.log("✅ Tamamlandı!");

  // Kategorileri de yükle
  const cats = [...new Set(TOOLS.map(t => t.cat))];
  const catBatch = db.batch();
  cats.forEach(c => {
    const ref = db.collection("tool_categories").doc(c.replace(/[^a-zA-Z0-9]/g,"_"));
    catBatch.set(ref, { name: c }, { merge: true });
  });
  await catBatch.commit();
  console.log(`✅ ${cats.length} kategori yüklendi!`);
  process.exit(0);
}

seed().catch(e => { console.error("❌ Seed hatası:", e); process.exit(1); });
