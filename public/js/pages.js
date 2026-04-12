/**
 * YENİLİKÇİ SINIF — Sayfa Modülleri
 */

const Pages = (() => {

  // ─── Paylaşılan sabitler ─────────────────────────────────────────────────
  const ENVANTER_LIST = [
    {id:"masaustu",    icon:"🖥️", name:"Masaüstü Bilgisayar",     adet:8},
    {id:"laptop",      icon:"💻", name:"Laptop",                   adet:12},
    {id:"mebkit-rob",  icon:"🤖", name:"MEBKit Robotik Set",       adet:10},
    {id:"mebkit-mob",  icon:"🚗", name:"MEBKit Mobil Robot",       adet:3},
    {id:"3dyazici",    icon:"🖨️", name:"3D Yazıcı (Creality K1C)", adet:1},
    {id:"zeka-oyun",   icon:"🧩", name:"Akıl/Zeka Oyunları",       adet:0},
    {id:"mobilya",     icon:"🪑", name:"Portatif Mobilya",          adet:0},
    {id:"diger",       icon:"📦", name:"Diğer Ekipman",             adet:0},
  ];

  // ─── ANA SAYFA ───────────────────────────────────────────────────────────
  const home = {
    async load() {
      await Promise.all([
        home.loadTools(),
        home.loadAnnouncements(),
        home.loadStats(),
      ]);
    },
    async loadTools() {
      try {
        const { tools: list } = await API.tools.list();
        // Araçlar modülüyle listeyi paylaş (filtre için)
        tools._list = list;
        home.renderFeaturedChips(list.filter(t => t.meb || t.featured));
        home.renderToolGrid(list);
        home.populateCatFilter(list);
      } catch(e) { console.error("Araçlar yüklenemedi:", e); }
    },
    renderFeaturedChips(featuredTools) {
      const el = document.getElementById("featuredChips");
      if (!el) return;
      el.innerHTML = featuredTools.filter(t => t.meb).map(t => `
        <a href="${UI.esc(t.url||"#")}" target="_blank" rel="noopener"
           class="chip${t.meb ? " meb" : ""}">
          ${t.logo ? `<img src="${UI.esc(t.logo)}" class="tool-logo" alt="${UI.esc(t.name)}" onerror="this.style.display='none'">` : ""}
          ${UI.esc(t.name)}
        </a>`).join("");
    },
    renderToolGrid(list) {
      const cont = document.getElementById("toolsGrid");
      if (!cont) return;
      const { search, cat, linked } = tools._filter;
      const q = (search||"").toLowerCase();
      let filtered = list.filter(t => {
        if (linked && !t.url) return false;
        if (cat && t.cat !== cat) return false;
        if (q && !`${t.name} ${t.desc} ${t.cat}`.toLowerCase().includes(q)) return false;
        return true;
      });
      const cntEl  = document.getElementById("resultsCount");
      const txtEl  = document.getElementById("resultsText");
      if (cntEl) cntEl.textContent = filtered.length;
      if (txtEl) txtEl.textContent = (search||cat) ? "Filtrelenmiş sonuçlar" : "Tüm araçlar gösteriliyor";
      if (!filtered.length) {
        cont.innerHTML = `<div class="empty"><h3>Sonuç bulunamadı</h3><p>Farklı bir arama terimi deneyin.</p></div>`;
        return;
      }
      const byCat = {};
      filtered.forEach(t => { if (!byCat[t.cat]) byCat[t.cat] = []; byCat[t.cat].push(t); });
      cont.innerHTML = Object.entries(byCat)
        .sort((a,b) => b[1].length - a[1].length)
        .map(([c, ts]) => renderCatSection(c, ts))
        .join("");
    },
    populateCatFilter(list) {
      const sel = document.getElementById("catFilter");
      if (!sel) return;
      const cats = [...new Set(list.map(t => t.cat))].sort();
      sel.innerHTML = `<option value="">Tüm Kategoriler</option>` +
        cats.map(c => `<option value="${UI.esc(c)}">${UI.esc(c)}</option>`).join("");
    },
    async loadAnnouncements() {
      try {
        const { announcements } = await API.admin.announcements();
        const el = document.getElementById("heroDuyuruText");
        if (el && announcements.length) el.textContent = announcements[0].title;
      } catch(e) {}
    },
    async loadStats() {
      try {
        const { tools } = await API.tools.list();
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set("stTools", tools.length);
        set("stCats", [...new Set(tools.map(t => t.cat))].length);
        // Üye ve soru sayısı için dashboard'a git (auth gerekebilir, hata olursa sessiz geç)
        try {
          const { stats } = await API.admin.dashboard();
          set("stMembers",   stats.totalUsers      || "—");
          set("stQuestions", stats.activeQuestions || "—");
        } catch(e) {
          set("stMembers",   "—");
          set("stQuestions", "—");
        }
      } catch(e) {}
    },
  };

  const tools = {
    _list:   [],
    _filter: { search: "", cat: "", linked: false },
    async load() {
      // Liste zaten yüklüyse yeniden çekme
      if (tools._list.length === 0) {
        try {
          const { tools: list } = await API.tools.list();
          tools._list = list;
        } catch(e) {
          UI.showToast("Araçlar yüklenemedi", "error");
          return;
        }
      }
      tools.render();
      tools.populateCatFilter();
    },
    render() {
      // Ana sayfadaki araçlar sayfasını yenile (home ile paylaşımlı filtre)
      home.renderToolGrid(tools._list);
      // Araçlar sekmesindeki grid
      const { search, cat, linked } = tools._filter;
      const q = (search||"").toLowerCase();
      let list = tools._list.filter(t => {
        if (linked && !t.url) return false;
        if (cat && t.cat !== cat) return false;
        if (q && !`${t.name} ${t.desc} ${t.cat}`.toLowerCase().includes(q)) return false;
        return true;
      });
      const cont = document.getElementById("toolsGrid2");
      if (!cont) return;
      const cntEl = document.getElementById("resultsCount2");
      if (cntEl) cntEl.textContent = list.length;
      if (!list.length) {
        cont.innerHTML = `<div class="empty"><h3>Sonuç bulunamadı</h3><p>Farklı anahtar kelime deneyin.</p></div>`;
        return;
      }
      const byCat = {};
      list.forEach(t => { if (!byCat[t.cat]) byCat[t.cat]=[]; byCat[t.cat].push(t); });
      cont.innerHTML = Object.entries(byCat)
        .sort((a,b) => b[1].length-a[1].length)
        .map(([c, ts]) => renderCatSection(c, ts))
        .join("");
    },
    populateCatFilter() {
      const sel = document.getElementById("catFilter2");
      if (!sel) return;
      const cats = [...new Set(tools._list.map(t => t.cat))].sort();
      sel.innerHTML = `<option value="">Tüm Kategoriler</option>` +
        cats.map(c => `<option value="${UI.esc(c)}">${UI.esc(c)}</option>`).join("");
    },
  };

  // ─── TOPLULUK ─────────────────────────────────────────────────────────────
  const community = {
    _filter: "all",
    async load() {
      await Promise.all([
        community.loadQuestions(),
        community.loadSidebar(),
      ]);
    },
    async loadSidebar() {
      try {
        const { questions } = await API.community.questions({ limit: 100 });
        // Popüler etiketler
        const tagCount = {};
        questions.forEach(q => (q.tags||[]).forEach(t => { tagCount[t] = (tagCount[t]||0)+1; }));
        const topTags = Object.entries(tagCount).sort((a,b)=>b[1]-a[1]).slice(0,12);
        const tagsEl = document.getElementById("popularTags");
        if (tagsEl) {
          tagsEl.innerHTML = topTags.length
            ? topTags.map(([t,c]) => `
                <span class="sidebar-tag" onclick="Pages.community.filterByTag('${UI.esc(t)}')">
                  ${UI.esc(t)} <span style="opacity:.6;font-size:.7rem;">${c}</span>
                </span>`).join("")
            : `<span style="color:var(--muted);font-size:.82rem;">Henüz etiket yok</span>`;
        }
        // Top kullanıcılar (en çok soru soran)
        const userMap = {};
        questions.forEach(q => {
          if (!q.authorId) return;
          if (!userMap[q.authorId]) userMap[q.authorId] = { name: q.authorName||"Anonim", count: 0 };
          userMap[q.authorId].count++;
        });
        const topUsersArr = Object.values(userMap).sort((a,b)=>b.count-a.count).slice(0,5);
        const usersEl = document.getElementById("topUsers");
        if (usersEl) {
          usersEl.innerHTML = topUsersArr.length
            ? topUsersArr.map(u => `
                <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border);">
                  <div style="width:30px;height:30px;border-radius:50%;background:var(--teal);display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;color:#fff;flex-shrink:0;">
                    ${(u.name||"?")[0].toUpperCase()}
                  </div>
                  <div style="flex:1;min-width:0;">
                    <div style="font-size:.83rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${UI.esc(u.name)}</div>
                    <div style="font-size:.72rem;color:var(--muted);">${u.count} soru</div>
                  </div>
                </div>`).join("")
            : `<span style="color:var(--muted);font-size:.82rem;">Henüz üye yok</span>`;
        }
      } catch(e) {}
    },
    filterByTag(tag) {
      community._filter = "all";
      document.querySelectorAll(".qa-filter-btn").forEach(b => b.classList.remove("active"));
      community.loadQuestions({ tag });
    },
    async loadQuestions(extraParams = {}) {
      const cont = document.getElementById("questionsList");
      if (!cont) return;
      cont.innerHTML = `<div class="loading-overlay"><div class="spinner spinner-lg"></div></div>`;
      try {
        const params = { ...extraParams };
        if (community._filter !== "all") params.filter = community._filter;
        const { questions } = await API.community.questions(params);
        if (!questions.length) {
          cont.innerHTML = `<div class="empty"><h3>Henüz soru yok</h3><p>İlk soruyu sen sor!</p></div>`;
          return;
        }
        cont.innerHTML = questions.map(q => `
          <div class="question-card" onclick="Pages.community.openQuestion('${q.id}')">
            <div class="q-stats">
              <div class="q-stat${q.answerCount>0?" answered":""}">
                <span class="n">${q.answerCount||0}</span><span class="l">Yanıt</span>
              </div>
              <div class="q-divider"></div>
              <div class="q-stat">
                <span class="n">${q.voteCount||0}</span><span class="l">Oy</span>
              </div>
            </div>
            <div class="q-body">
              <div class="q-title">${UI.esc(q.title)}</div>
              <div class="q-excerpt">${UI.esc((q.body||"").substring(0,150))}</div>
              <div class="q-tags">${(q.tags||[]).map(t=>`<span class="q-tag">${UI.esc(t)}</span>`).join("")}</div>
              <div class="q-meta">
                <div class="q-author">
                  <div class="q-author-avatar">${(q.authorName||"?")[0].toUpperCase()}</div>
                  <span>${UI.esc(q.authorName||"Anonim")}</span>
                </div>
                <span>${q.createdAt?.toDate?.().toLocaleDateString("tr-TR")||""}</span>
              </div>
            </div>
          </div>`).join("");
      } catch(e) {
        cont.innerHTML = `<div class="empty"><h3>Yüklenemedi</h3></div>`;
      }
    },
    setFilter(f, btn) {
      community._filter = f;
      document.querySelectorAll(".qa-filter-btn").forEach(b => b.classList.remove("active"));
      btn?.classList.add("active");
      community.loadQuestions();
    },
    async postQuestion() {
      const title = UI.val("qTitle"), body = UI.val("qBody");
      const tags  = UI.val("qTags").split(",").map(t=>t.trim()).filter(Boolean);
      if (!title || !body) { UI.showAlert("qError","error","Başlık ve açıklama zorunlu"); return; }
      try {
        await API.community.postQuestion({ title, body, tags });
        UI.closeModal("askModal");
        // Formu temizle
        ["qTitle","qBody","qTags"].forEach(id => { const el=document.getElementById(id); if(el) el.value=""; });
        UI.showToast("Soru eklendi!", "success");
        await community.loadQuestions();
      } catch(e) {
        UI.showAlert("qError","error", e.message||"Soru gönderilemedi");
      }
    },

    async openQuestion(id) {
      const modal = document.getElementById("questionDetailModal");
      const body  = document.getElementById("questionDetailBody");
      if (!modal || !body) return;
      body.innerHTML = `<div class="loading-overlay"><div class="spinner spinner-lg"></div><span>Yükleniyor…</span></div>`;
      UI.openModal("questionDetailModal");
      try {
        const [{ questions }, { answers }] = await Promise.all([
          API.community.questions({ id }),
          API.community.answers(id),
        ]);
        const q = questions?.[0] || (await API.community.questions()).questions?.find(x=>x.id===id);
        if (!q) throw new Error("Soru bulunamadı");

        const tsStr = t => {
          if (!t) return "";
          if (t._seconds) return new Date(t._seconds*1000).toLocaleDateString("tr-TR");
          if (t.toDate)   return t.toDate().toLocaleDateString("tr-TR");
          return String(t);
        };

        const user    = App.getUser();
        const isAdmin = App.isAdmin();

        body.innerHTML = `
          <div style="margin-bottom:20px;">
            <h2 style="font-size:1.1rem;font-weight:800;color:var(--navy);margin-bottom:10px;">${UI.esc(q.title)}</h2>
            <div style="font-size:.88rem;color:var(--text);line-height:1.7;margin-bottom:12px;">${UI.esc(q.body||"").replace(/\n/g,"<br>")}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
              ${(q.tags||[]).map(t=>`<span class="q-tag">${UI.esc(t)}</span>`).join("")}
            </div>
            <div class="q-meta">
              <div class="q-author">
                <div class="q-author-avatar">${(q.authorName||"?")[0].toUpperCase()}</div>
                <span>${UI.esc(q.authorName||"Anonim")}</span>
              </div>
              <span>${tsStr(q.createdAt)}</span>
              ${user ? `<button class="btn btn-ghost" style="padding:3px 9px;font-size:.75rem;margin-left:auto;"
                onclick="Pages.community.reportQuestion('${q.id}')">🚩 Şikayet</button>` : ""}
              ${isAdmin ? `<button class="btn btn-danger" style="padding:3px 9px;font-size:.75rem;"
                onclick="Pages.community.adminRemoveQuestion('${q.id}')">🗑️ Kaldır</button>` : ""}
            </div>
          </div>

          <div style="border-top:2px solid var(--teal);padding-top:16px;margin-bottom:16px;">
            <div style="font-size:.85rem;font-weight:800;color:var(--navy);margin-bottom:12px;">
              💬 ${answers.length} Yanıt
            </div>
            ${answers.length ? answers.map(a => `
              <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--r-sm);padding:14px;margin-bottom:10px;${a.accepted?"border-left:3px solid var(--success)":""}">
                ${a.accepted ? `<span style="background:var(--success);color:#fff;font-size:.7rem;font-weight:700;padding:2px 8px;border-radius:10px;display:inline-block;margin-bottom:6px;">✅ Kabul Edildi</span>` : ""}
                <div style="font-size:.88rem;color:var(--text);line-height:1.65;">${UI.esc(a.body||"").replace(/\n/g,"<br>")}</div>
                <div class="q-meta" style="margin-top:8px;">
                  <div class="q-author">
                    <div class="q-author-avatar">${(a.authorName||"?")[0].toUpperCase()}</div>
                    <span>${UI.esc(a.authorName||"Anonim")}</span>
                  </div>
                  <span>${tsStr(a.createdAt)}</span>
                  <div style="display:flex;align-items:center;gap:4px;margin-left:auto;">
                    <button onclick="Pages.community.voteAnswer('${q.id}','${a.id}',1)"
                      style="background:none;border:1px solid var(--border);border-radius:4px;padding:2px 7px;cursor:pointer;font-size:.8rem;">▲</button>
                    <span style="font-size:.82rem;font-weight:700;">${a.votes||0}</span>
                    <button onclick="Pages.community.voteAnswer('${q.id}','${a.id}',-1)"
                      style="background:none;border:1px solid var(--border);border-radius:4px;padding:2px 7px;cursor:pointer;font-size:.8rem;">▼</button>
                  </div>
                </div>
              </div>`).join("") :
              `<div style="color:var(--muted);font-size:.85rem;padding:12px 0;">Henüz yanıt yok. İlk yanıtı sen ver!</div>`
            }
          </div>

          ${user ? `
            <div style="border-top:1px solid var(--border);padding-top:16px;">
              <div style="font-size:.85rem;font-weight:700;color:var(--navy);margin-bottom:8px;">✍️ Yanıtla</div>
              <textarea class="form-textarea" id="answerBodyInput" placeholder="Yanıtınızı buraya yazın…" style="min-height:90px;"></textarea>
              <button class="btn btn-teal" style="margin-top:8px;"
                onclick="Pages.community.postAnswer('${q.id}')">📤 Yanıtla</button>
              <div class="alert" id="answerError" style="display:none;margin-top:8px;"></div>
            </div>` :
            `<div class="alert alert-info" style="margin-top:12px;">
              Yanıt vermek için <a href="#" onclick="UI.showAuthModal('login');UI.closeModal('questionDetailModal')"
                style="color:var(--navy);font-weight:700;">giriş yapın</a>.
            </div>`}`;
      } catch(e) {
        body.innerHTML = `<div class="empty"><h3>Yüklenemedi</h3><p>${e.message}</p></div>`;
      }
    },

    async postAnswer(qId) {
      const body = (document.getElementById("answerBodyInput")?.value||"").trim();
      if (!body) { UI.showAlert("answerError","error","Yanıt boş olamaz"); return; }
      try {
        await API.community.postAnswer(qId, body);
        UI.showToast("Yanıt eklendi","success");
        await community.openQuestion(qId);
      } catch(e) { UI.showAlert("answerError","error",e.message||"Gönderilemedi"); }
    },

    async voteAnswer(qId, aId, dir) {
      if (!App.getUser()) { UI.showAuthModal("login"); return; }
      try {
        await API.request?.("PATCH", `/community/questions/${qId}/answers/${aId}/vote`, { dir });
        await community.openQuestion(qId);
      } catch(e) {}
    },

    async reportQuestion(qId) {
      const reason = prompt("Şikayet nedeninizi yazın:");
      if (!reason) return;
      try {
        await API.community.report(qId, reason);
        UI.showToast("Şikayet iletildi","success");
      } catch(e) { UI.showToast("Şikayet gönderilemedi","error"); }
    },

    async adminRemoveQuestion(qId) {
      if (!confirm("Bu soruyu kaldırmak istiyor musunuz?")) return;
      try {
        await API.request?.("DELETE", `/community/questions/${qId}`);
        UI.closeModal("questionDetailModal");
        UI.showToast("Soru kaldırıldı","success");
        await community.loadQuestions();
      } catch(e) { UI.showToast("İşlem başarısız","error"); }
    },

  // ─── SINIFLAR (Tinkercad tarzı) ──────────────────────────────────────────
  const classes = {
    _classes: [],
    _activeClass: null,
    async load() {
      if (!App.getUser()) { App.showPage("home"); return; }
      await classes.loadClasses();
    },
    async loadClasses() {
      const cont = document.getElementById("classesList");
      if (!cont) return;
      cont.innerHTML = `<div class="loading-overlay"><div class="spinner spinner-lg"></div></div>`;
      try {
        const { classes: list } = await API.classes.list();
        classes._classes = list;
        if (!list.length) {
          cont.innerHTML = `
            <div class="empty">
              <h3>Henüz sınıf oluşturmadınız</h3>
              <p>Öğrencilerinizi yönetmek için bir sınıf oluşturun.</p>
              <button class="btn btn-teal" onclick="Pages.classes.openCreateModal()">+ Sınıf Oluştur</button>
            </div>`;
          return;
        }
        cont.innerHTML = list.map(c => `
          <div class="class-card" onclick="Pages.classes.openClass('${c.id}')">
            <div class="class-card-head">
              <div class="class-ico">🏫</div>
              <div>
                <div class="class-name">${UI.esc(c.name)}</div>
                <div class="class-meta">${UI.esc(c.grade||"")} · ${c.studentCount||0} öğrenci</div>
              </div>
              <div class="class-code-badge">${UI.esc(c.classCode||"")}</div>
            </div>
            ${c.description ? `<div class="class-desc">${UI.esc(c.description)}</div>` : ""}
          </div>`).join("");
      } catch(e) {
        UI.showToast("Sınıflar yüklenemedi","error");
      }
    },
    async openClass(id) {
      const cont = document.getElementById("classDetailArea");
      if (!cont) return;
      cont.innerHTML = `<div class="loading-overlay"><div class="spinner spinner-lg"></div></div>`;
      document.getElementById("classesList")?.classList.add("hidden");
      cont.classList.remove("hidden");
      try {
        const { class: cls, students } = await API.classes.get(id);
        classes._activeClass = cls;
        cont.innerHTML = `
          <div class="class-detail-head">
            <button class="btn btn-ghost" onclick="Pages.classes.backToList()">← Geri</button>
            <h2>${UI.esc(cls.name)} <span class="class-code-badge">${UI.esc(cls.classCode)}</span></h2>
            <button class="btn btn-teal" onclick="Pages.classes.openAddStudentModal('${id}')">+ Öğrenci Ekle</button>
            <button class="btn btn-ghost" onclick="Pages.classes.openBulkModal('${id}')">📋 Toplu Ekle</button>
          </div>
          <div class="students-grid" id="studentsGrid">
            ${students.length ? students.map(s => classes.renderStudentCard(s, id)).join("") :
              `<div class="empty"><h3>Henüz öğrenci yok</h3></div>`}
          </div>`;
      } catch(e) { UI.showToast("Sınıf yüklenemedi","error"); }
    },
    renderStudentCard(s, classId) {
      return `
        <div class="student-card" data-student-id="${s.id}">
          <div class="student-avatar">${(s.name||"?")[0].toUpperCase()}</div>
          <div class="student-info">
            <div class="student-name">${UI.esc(s.name)}</div>
            ${s.studentNo ? `<div class="student-no">No: ${UI.esc(s.studentNo)}</div>` : ""}
            ${s.email     ? `<div class="student-email">${UI.esc(s.email)}</div>`       : ""}
            ${s.notes     ? `<div class="student-no" style="color:var(--muted);">${UI.esc(s.notes)}</div>` : ""}
          </div>
          <div class="student-actions">
            <button class="btn btn-ghost" style="padding:4px 10px;font-size:.75rem;"
              onclick="Pages.classes.editStudent('${classId}','${s.id}')">✏️</button>
            <button class="btn btn-danger" style="padding:4px 10px;font-size:.75rem;"
              onclick="Pages.classes.deleteStudent('${classId}','${s.id}')">🗑️</button>
          </div>
        </div>`;
    },
    backToList() {
      document.getElementById("classDetailArea")?.classList.add("hidden");
      document.getElementById("classesList")?.classList.remove("hidden");
    },
    openCreateModal() { UI.openModal("createClassModal"); },
    async createClass() {
      const name = UI.val("newClassName"), desc = UI.val("newClassDesc"), grade = UI.val("newClassGrade");
      if (!name) { UI.showAlert("classAlert","error","Sınıf adı zorunlu"); return; }
      try {
        const { classCode } = await API.classes.create({ name, description: desc, grade });
        UI.closeModal("createClassModal");
        UI.showToast(`Sınıf oluşturuldu! Kod: ${classCode}`, "success", 8000);
        await classes.loadClasses();
      } catch(e) { UI.showAlert("classAlert","error",e.message||"Oluşturulamadı"); }
    },
    openAddStudentModal(classId) {
      document.getElementById("addStudentClassId").value = classId;
      UI.openModal("addStudentModal");
    },
    async addStudent() {
      const classId = UI.val("addStudentClassId");
      const data = {
        name:      UI.val("studentName"),
        studentNo: UI.val("studentNo"),
        email:     UI.val("studentEmail"),
        notes:     UI.val("studentNotes"),
      };
      if (!data.name) { UI.showAlert("studentAlert","error","Ad zorunlu"); return; }
      try {
        await API.classes.addStudent(classId, data);
        UI.closeModal("addStudentModal");
        UI.showToast("Öğrenci eklendi","success");
        await classes.openClass(classId);
      } catch(e) { UI.showAlert("studentAlert","error",e.message||"Eklenemedi"); }
    },
    openBulkModal(classId) {
      document.getElementById("bulkClassId").value = classId;
      UI.openModal("bulkStudentModal");
    },
    async bulkAddStudents() {
      const classId = UI.val("bulkClassId");
      const raw  = UI.val("bulkStudentText");
      // Her satır: "Ad Soyad, NumaraNo, email" formatında
      const students = raw.split("\n")
        .map(line => {
          const parts = line.split(",").map(p => p.trim());
          return { name: parts[0], studentNo: parts[1]||"", email: parts[2]||"" };
        })
        .filter(s => s.name);
      if (!students.length) { UI.showAlert("bulkAlert","error","Geçerli öğrenci yok"); return; }
      try {
        await API.classes.bulkStudents(classId, students);
        UI.closeModal("bulkStudentModal");
        UI.showToast(`${students.length} öğrenci eklendi`, "success");
        await classes.openClass(classId);
      } catch(e) { UI.showAlert("bulkAlert","error",e.message||"Toplu ekleme başarısız"); }
    },
    async deleteStudent(classId, studentId) {
      if (!confirm("Bu öğrenciyi silmek istiyor musunuz?")) return;
      try {
        await API.classes.deleteStudent(classId, studentId);
        UI.showToast("Öğrenci silindi","success");
        await classes.openClass(classId);
      } catch(e) { UI.showToast("Silinemedi","error"); }
    },
    editStudent(classId, studentId) {
      // Mevcut kart içinde düzenleme
      const card = document.querySelector(`[data-student-id="${studentId}"]`);
      if (!card) {
        UI.openModal("editStudentModal");
        document.getElementById("editStudentClassId").value  = classId;
        document.getElementById("editStudentId").value       = studentId;
        return;
      }
      const nameEl = card.querySelector(".student-name");
      const noEl   = card.querySelector(".student-no");
      const orig   = nameEl?.textContent || "";
      nameEl && (nameEl.innerHTML = `<input class="form-input" value="${UI.esc(orig)}" style="font-size:.85rem;padding:4px 8px;" id="inline_name_${studentId}">`);
      card.querySelector(".student-actions").innerHTML = `
        <button class="btn btn-success" style="padding:4px 10px;font-size:.75rem;"
          onclick="Pages.classes.saveStudentEdit('${classId}','${studentId}')">✅</button>
        <button class="btn btn-ghost" style="padding:4px 10px;font-size:.75rem;"
          onclick="Pages.classes.openClass('${classId}')">✕</button>`;
    },
    async saveStudentEdit(classId, studentId) {
      const name = document.getElementById(`inline_name_${studentId}`)?.value?.trim();
      if (!name) { UI.showToast("Ad boş bırakılamaz","warn"); return; }
      try {
        await API.classes.updateStudent(classId, studentId, { name });
        UI.showToast("Güncellendi","success");
        await classes.openClass(classId);
      } catch(e) { UI.showToast(e.message||"Hata","error"); }
    },

  // ─── MEDYA ───────────────────────────────────────────────────────────────
  const media = {
    _filter: { category: "", type: "", search: "" },
    async load() {
      await media.loadMedia();
      await media.loadCategories();
    },
    async loadMedia() {
      const cont = document.getElementById("mediaGrid");
      if (!cont) return;
      cont.innerHTML = `<div class="loading-overlay"><div class="spinner spinner-lg"></div></div>`;
      try {
        const { media: items } = await API.media.list(media._filter);
        if (!items.length) {
          cont.innerHTML = `<div class="empty"><h3>Medya bulunamadı</h3></div>`;
          return;
        }
        cont.innerHTML = items.map(m => `
          <div class="media-card">
            <div class="media-thumb">
              ${m.fileType === "video"
                ? `<video src="${UI.esc(m.url)}" style="width:100%;height:120px;object-fit:cover;border-radius:6px;"></video>`
                : `<img src="${UI.esc(m.url)}" alt="${UI.esc(m.name)}" style="width:100%;height:120px;object-fit:cover;border-radius:6px;" onerror="this.style.display='none'">`}
            </div>
            <div class="media-info">
              <div class="media-name">${UI.esc(m.name)}</div>
              <div class="media-meta">${UI.esc(m.category||"")} · ${formatSize(m.size||0)}</div>
              <div class="media-tags">${(m.tags||[]).map(t=>`<span class="q-tag">${UI.esc(t)}</span>`).join("")}</div>
            </div>
            <div class="media-actions">
              <button class="btn btn-navy" onclick="Pages.media.download('${m.id}','${UI.esc(m.url)}')">⬇️ İndir</button>
              ${(App.isAdmin() || App.getUser()?.uid === m.uploadedBy)
                ? `<button class="btn btn-danger" onclick="Pages.media.remove('${m.id}')">🗑️</button>` : ""}
            </div>
          </div>`).join("");
      } catch(e) { UI.showToast("Medya yüklenemedi","error"); }
    },
    async loadCategories() {
      try {
        const { categories } = await API.media.categories();
        const sel = document.getElementById("mediaCatFilter");
        if (!sel) return;
        sel.innerHTML = `<option value="">Tüm Kategoriler</option>` +
          categories.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
      } catch(e) {}
    },
    async upload() {
      const fileInput = document.getElementById("mediaFileInput");
      if (!fileInput?.files[0]) { UI.showAlert("mediaAlert","error","Dosya seçin"); return; }
      const formData = new FormData();
      formData.append("file",     fileInput.files[0]);
      formData.append("name",     UI.val("mediaName") || fileInput.files[0].name);
      formData.append("category", UI.val("mediaCat"));
      formData.append("tags",     UI.val("mediaTags"));
      formData.append("description", UI.val("mediaDesc"));
      UI.setLoading("mediaUploadBtn", true);
      try {
        await API.media.upload(formData);
        UI.closeModal("mediaUploadModal");
        UI.showToast("Dosya yüklendi!","success");
        await media.loadMedia();
      } catch(e) { UI.showAlert("mediaAlert","error",e.message||"Yükleme başarısız"); }
      finally { UI.setLoading("mediaUploadBtn", false, "⬆️ Yükle"); }
    },
    async download(id, url) {
      try {
        await API.media.download(id);
        window.open(url, "_blank");
      } catch(e) { window.open(url, "_blank"); }
    },
    async remove(id) {
      if (!confirm("Bu dosyayı silmek istiyor musunuz?")) return;
      try {
        await API.media.remove(id);
        UI.showToast("Dosya silindi","success");
        await media.loadMedia();
      } catch(e) { UI.showToast("Silinemedi","error"); }
    }
  };

  // ─── PROFİL ──────────────────────────────────────────────────────────────
  const profile = {
    async load() {
      const user = App.getUser();
      if (!user) { App.showPage("home"); return; }
      const cont = document.getElementById("profileContent");
      if (!cont) return;
      cont.innerHTML = `
        <div class="profile-card">
          <div class="profile-avatar-big">
            ${user.photoURL ? `<img src="${UI.esc(user.photoURL)}">` : (user.name||"?").slice(0,2).toUpperCase()}
          </div>
          <div class="profile-info">
            <h2>${UI.esc(user.name||"")}</h2>
            <p>📧 ${UI.esc(user.email||"")}</p>
            ${user.okul ? `<p>🏫 ${UI.esc(user.okul)} — ${UI.esc(user.il||"")} / ${UI.esc(user.ilce||"")}</p>` : ""}
            ${user.brans ? `<p>📚 ${UI.esc(user.brans)}</p>` : ""}
            ${user.kidem ? `<p>🏅 ${user.kidem} yıl kıdem</p>` : ""}
            <span class="profile-badge">${roleLabel(user.role)}</span>
          </div>
        </div>
        <div class="profile-edit-card">
          <div style="font-size:.88rem;font-weight:800;color:var(--navy);margin-bottom:14px;">✏️ Profili Düzenle</div>
          <div class="form-grid">
            <div class="form-group"><label class="form-label">Ad Soyad</label>
              <input class="form-input" id="profName" value="${UI.esc(user.name||"")}"></div>
            <div class="form-group"><label class="form-label">İl</label>
              <input class="form-input" id="profIl" value="${UI.esc(user.il||"")}"></div>
            <div class="form-group"><label class="form-label">İlçe</label>
              <input class="form-input" id="profIlce" value="${UI.esc(user.ilce||"")}"></div>
            <div class="form-group"><label class="form-label">Okul</label>
              <input class="form-input" id="profOkul" value="${UI.esc(user.okul||"")}"></div>
            <div class="form-group"><label class="form-label">Branş</label>
              <input class="form-input" id="profBrans" value="${UI.esc(user.brans||"")}"></div>
            <div class="form-group"><label class="form-label">Görev Yeri</label>
              <input class="form-input" id="profGorevYeri" value="${UI.esc(user.gorevYeri||"")}"></div>
            <div class="form-group"><label class="form-label">Kıdem (yıl)</label>
              <input class="form-input" type="number" id="profKidem" value="${user.kidem||0}" min="0"></div>
            <div class="form-group form-full"><label class="form-label">Biyografi</label>
              <textarea class="form-textarea" id="profBio">${UI.esc(user.bio||"")}</textarea></div>
          </div>
          <button class="btn btn-teal" onclick="Pages.profile.save()">💾 Kaydet</button>
        </div>`;
    },
    async save() {
      const payload = {
        name: UI.val("profName"), il: UI.val("profIl"), ilce: UI.val("profIlce"),
        okul: UI.val("profOkul"), brans: UI.val("profBrans"),
        gorevYeri: UI.val("profGorevYeri"), kidem: UI.val("profKidem"),
        bio: UI.val("profBio"),
      };
      try {
        await API.auth.updateProfile(payload);
        UI.showToast("Profil güncellendi!","success");
      } catch(e) { UI.showToast("Güncelleme başarısız","error"); }
    }
  };

  // ─── ADMİN ───────────────────────────────────────────────────────────────
  const admin = {
    _panel: "dashboard",
    async load() {
      if (!App.isAdmin()) { App.showPage("home"); return; }
      await admin.switchPanel("dashboard");
    },
    async switchPanel(panel) {
      admin._panel = panel;
      document.querySelectorAll(".admin-panel").forEach(p => p.classList.remove("active"));
      document.querySelectorAll(".admin-nav-link").forEach(l => l.classList.remove("active"));
      document.getElementById(`ap-${panel}`)?.classList.add("active");
      document.querySelector(`.admin-nav-link[data-panel="${panel}"]`)?.classList.add("active");

      const loaders = {
        dashboard:     admin.loadDashboard,
        users:         admin.loadUsers,
        tools:         admin.loadTools,
        community:     admin.loadCommunity,
        media:         admin.loadMediaAdmin,
        arizalar:      admin.loadArizalar,
        logs:          admin.loadLogs,
        announcements: admin.loadAnnouncements,
        guestbook:     admin.loadGuestbook,
        settings:      admin.loadSettings,
      };
      if (loaders[panel]) await loaders[panel]();
    },
    async loadDashboard() {
      try {
        const { stats } = await API.admin.dashboard();
        const el = document.getElementById("dashStats");
        if (!el) return;
        el.innerHTML = [
          ["👥 Toplam Üye",   stats.totalUsers],
          ["👩‍🏫 Öğretmen",    stats.teachers],
          ["🛡️ Admin",        stats.admins],
          ["💬 Soru",         stats.activeQuestions],
          ["🛠️ Araç",         stats.totalTools],
          ["🔧 Açık Arıza",   stats.openArizalar],
          ["🚨 Bekleyen Şikayet", stats.pendingReports],
          ["🎬 Medya",        stats.totalMedia],
        ].map(([l,n]) => `<div class="astat"><span class="n">${n??"-"}</span><span class="l">${l}</span></div>`).join("");

        // Son duyuruları da göster
        const { announcements } = await API.admin.announcements();
        const dashContent = document.getElementById("dashContent");
        if (dashContent) {
          dashContent.innerHTML = `
            <div>
              <div style="font-size:.82rem;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px;">📢 Son Duyurular</div>
              ${announcements.slice(0,5).map(a => `
                <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--r-sm);padding:12px;margin-bottom:8px;border-left:3px solid var(--teal);">
                  <div style="font-weight:700;font-size:.88rem;">${UI.esc(a.title)}</div>
                  <div style="font-size:.75rem;color:var(--muted);margin-top:3px;">${a.createdAt?._seconds ? new Date(a.createdAt._seconds*1000).toLocaleDateString("tr-TR") : ""}</div>
                </div>`).join("") || "<p style='color:var(--muted);font-size:.85rem;'>Henüz duyuru yok</p>"}
              <button class="btn btn-ghost" onclick="Pages.admin.switchPanel('announcements')" style="margin-top:8px;font-size:.8rem;">Tümünü Yönet →</button>
            </div>
            <div>
              <div style="font-size:.82rem;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px;">⚡ Hızlı İşlemler</div>
              <div style="display:flex;flex-direction:column;gap:8px;">
                <button class="btn btn-outline" onclick="Pages.admin.switchPanel('users')">👥 Üyeleri Yönet</button>
                <button class="btn btn-outline" onclick="Pages.admin.switchPanel('tools')">🛠️ Araç Ekle</button>
                <button class="btn btn-outline" onclick="Pages.admin.switchPanel('community')">💬 Şikayetleri İncele</button>
                <button class="btn btn-outline" onclick="Pages.admin.switchPanel('arizalar')">🔧 Arızaları Gör</button>
                <button class="btn btn-outline" onclick="Pages.admin.switchPanel('logs')">📋 Denetim Logları</button>
              </div>
            </div>`;
        }
      } catch(e) { UI.showToast("Dashboard yüklenemedi","error"); }
    },

    async loadTools() {
      // Admin araç listesi için taze veri çek ve tools._list'i güncelle
      try {
        const { tools: list } = await API.tools.list();
        tools._list = list; // Paylaşımlı liste güncelle
        const tbody = document.getElementById("adminToolsTbody");
        if (!tbody) return;
        if (!list.length) {
          tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:24px;">Henüz araç eklenmemiş</td></tr>`;
          return;
        }
        tbody.innerHTML = list.map(t => `
          <tr>
            <td>
              <div style="display:flex;align-items:center;gap:8px;">
                ${t.logo ? `<img src="${UI.esc(t.logo)}" style="width:24px;height:24px;object-fit:contain;border-radius:4px;" onerror="this.style.display='none'">` : `<span style="font-size:1rem;">📦</span>`}
                <div>
                  <div style="font-weight:600;font-size:.88rem;">${UI.esc(t.name)}</div>
                  <div style="font-size:.73rem;color:var(--muted);">${UI.esc((t.desc||"").substring(0,55))}${(t.desc||"").length>55?"…":""}</div>
                </div>
                ${t.meb      ? `<span style="background:#fee2e2;color:#c0392b;font-size:.62rem;font-weight:700;padding:1px 6px;border-radius:10px;white-space:nowrap;">MEB</span>` : ""}
                ${t.featured ? `<span style="background:#d1faf8;color:#0e7a76;font-size:.62rem;font-weight:700;padding:1px 6px;border-radius:10px;white-space:nowrap;">Öne Çıkan</span>` : ""}
              </div>
            </td>
            <td style="font-size:.78rem;color:var(--muted);max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${UI.esc(t.cat||"")}</td>
            <td>${t.url
              ? `<a href="${UI.esc(t.url)}" target="_blank" style="color:var(--teal);font-size:.78rem;font-weight:600;">🔗 Aç</a>`
              : `<span style="color:var(--muted);font-size:.75rem;">—</span>`}</td>
            <td style="white-space:nowrap;">
              <button class="btn btn-ghost" style="padding:4px 10px;font-size:.75rem;" onclick="Pages.admin.editTool('${t.id}')">✏️ Düzenle</button>
              <button class="btn btn-danger" style="padding:4px 10px;font-size:.75rem;margin-left:4px;" onclick="Pages.admin.deleteTool('${t.id}')">🗑️</button>
            </td>
          </tr>`).join("");
      } catch(e) { UI.showToast("Araçlar yüklenemedi","error"); }
    },

    editTool(id) {
      const t = tools._list.find(x => x.id === id);
      UI.openModal("addToolModal");
      if (!t) return;
      UI.setVal("toolEditId",    id);
      UI.setVal("toolName",      t.name||"");
      UI.setVal("toolDesc",      t.desc||"");
      UI.setVal("toolUrl",       t.url||"");
      UI.setVal("toolLogo",      t.logo||"");
      UI.setVal("toolNote",      t.note||"");
      UI.setVal("toolKimler",    t.kimlerIcin||"");
      UI.setVal("toolOrnek",     t.ornekKullanim||"");
      UI.setVal("toolCat",       t.cat||"");
      const featEl = document.getElementById("toolFeatured");
      if (featEl) featEl.checked = !!t.featured;
      const mebEl  = document.getElementById("toolMeb");
      if (mebEl)  mebEl.checked  = !!t.meb;
      // Modal başlığını güncelle
      const titleEl = document.querySelector("#addToolModal .modal-title");
      if (titleEl) titleEl.textContent = "✏️ Araç Düzenle";
    },

    async saveTool() {
      const id   = UI.val("toolEditId");
      const data = {
        name:         UI.val("toolName"),
        desc:         UI.val("toolDesc"),
        url:          UI.val("toolUrl"),
        logo:         UI.val("toolLogo"),
        cat:          UI.val("toolCat"),
        note:         UI.val("toolNote"),
        kimlerIcin:   UI.val("toolKimler"),
        ornekKullanim:UI.val("toolOrnek"),
        featured:     document.getElementById("toolFeatured")?.checked||false,
        meb:          document.getElementById("toolMeb")?.checked||false,
      };
      if (!data.name || !data.cat) { UI.showAlert("toolAlert","error","Ad ve kategori zorunlu"); return; }
      try {
        if (id) {
          await API.tools.update(id, data);
          UI.showToast("Araç güncellendi","success");
        } else {
          await API.tools.add(data);
          UI.showToast("Araç eklendi","success");
        }
        admin.closeToolModal();
        await admin.loadTools();
      } catch(e) { UI.showAlert("toolAlert","error",e.message||"Kaydedilemedi"); }
    },

    async deleteTool(id) {
      if (!confirm("Bu aracı silmek istiyor musunuz?")) return;
      try {
        await API.tools.remove(id);
        UI.showToast("Araç silindi","success");
        await admin.loadTools();
      } catch(e) { UI.showToast("Silinemedi","error"); }
    },

    closeToolModal() {
      UI.closeModal("addToolModal");
      UI.setVal("toolEditId","");
      ["toolName","toolDesc","toolUrl","toolLogo","toolNote","toolKimler","toolOrnek"].forEach(id => UI.setVal(id,""));
      document.getElementById("toolCat") && (document.getElementById("toolCat").value="");
      const featEl = document.getElementById("toolFeatured"); if(featEl) featEl.checked=false;
      const mebEl  = document.getElementById("toolMeb");      if(mebEl)  mebEl.checked=false;
      const titleEl = document.getElementById("addToolModalTitle");
      if (titleEl) titleEl.textContent = "🛠️ Araç Ekle / Düzenle";
    },

    async loadCommunity() {
      const cont = document.getElementById("communityReports");
      if (!cont) return;
      cont.innerHTML = `<div class="loading-overlay"><div class="spinner spinner-lg"></div></div>`;
      try {
        const { reports } = await API.community.reports();
        if (!reports.length) {
          cont.innerHTML = `<div class="empty"><h3>Bekleyen şikayet yok ✅</h3></div>`;
          return;
        }
        cont.innerHTML = reports.map(r => `
          <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--r-sm);padding:14px;margin-bottom:10px;border-left:4px solid var(--danger);">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
              <span style="font-weight:700;font-size:.88rem;">🚨 ${UI.esc(r.contentType||"")} şikayeti</span>
              <span style="font-size:.75rem;color:var(--muted);">${r.createdAt?._seconds ? new Date(r.createdAt._seconds*1000).toLocaleDateString("tr-TR") : ""}</span>
            </div>
            <div style="font-size:.84rem;color:var(--text);margin-bottom:10px;">Neden: ${UI.esc(r.reason||"")}</div>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-danger" style="font-size:.8rem;" onclick="Pages.admin.resolveReport('${r.id}','remove')">🗑️ İçeriği Kaldır</button>
              <button class="btn btn-ghost" style="font-size:.8rem;" onclick="Pages.admin.resolveReport('${r.id}','dismiss')">✅ Görmezden Gel</button>
            </div>
          </div>`).join("");
      } catch(e) { cont.innerHTML = `<div class="empty"><h3>Yüklenemedi</h3></div>`; }
    },

    async resolveReport(id, action) {
      try {
        await API.community.resolveReport(id, action);
        UI.showToast(action==="remove"?"İçerik kaldırıldı":"Şikayet kapatıldı","success");
        await admin.loadCommunity();
      } catch(e) { UI.showToast("İşlem başarısız","error"); }
    },

    async loadMediaAdmin() {
      // Media listesi admin için genişletilmiş
      await Pages.media.load();
    },

    async loadArizalar() {
      const cont = document.getElementById("adminArizaList");
      if (!cont) return;
      cont.innerHTML = `<div class="loading-overlay"><div class="spinner spinner-lg"></div></div>`;
      try {
        const { arizalar: list } = await API.arizalar.list();
        if (!list.length) {
          cont.innerHTML = `<div class="empty"><h3>Arıza kaydı yok</h3></div>`;
          return;
        }
        const envIco = name => (ENVANTER_LIST.find(e => e.name === name)||{icon:"📦"}).icon;
        cont.innerHTML = `<div class="table-wrap"><table class="data-table">
          <thead><tr><th>Ekipman</th><th>Başlık</th><th>Öncelik</th><th>Bildiren</th><th>Tarih</th><th>Durum</th><th>Sil</th></tr></thead>
          <tbody>${list.map(a => `<tr>
            <td>${envIco(a.ekipman)} <span style="font-size:.78rem;">${UI.esc(a.ekipman||"")}${a.cihazNo?`<br><span style="color:var(--muted);font-size:.72rem;">${UI.esc(a.cihazNo)}</span>`:""}</span></td>
            <td style="font-weight:600;max-width:200px;">${UI.esc(a.baslik||"")}<br>
              <span style="font-size:.74rem;color:var(--muted);font-weight:400;">${UI.esc((a.aciklama||"").substring(0,60))}${(a.aciklama||"").length>60?"…":""}</span></td>
            <td><span class="status-badge ${a.oncelik==="acil"?"st-inactive":a.oncelik==="dusuk"?"st-active":"st-pending"}">${a.oncelik==="acil"?"🔴 Acil":a.oncelik==="dusuk"?"🟢 Düşük":"🟡 Normal"}</span></td>
            <td style="font-size:.8rem;">${UI.esc(a.bildiren||a.authorName||"—")}</td>
            <td style="font-size:.77rem;color:var(--muted);">${a.createdAt?._seconds ? new Date(a.createdAt._seconds*1000).toLocaleDateString("tr-TR") : "—"}</td>
            <td><select style="font-size:.75rem;padding:3px 7px;border:1px solid var(--border);border-radius:5px;font-family:var(--font);"
              onchange="Pages.admin.updateArizaDurum('${a.id}',this.value)">
              <option value="acik"${a.durum==="acik"?" selected":""}>🔴 Açık</option>
              <option value="inceleniyor"${a.durum==="inceleniyor"?" selected":""}>🟡 İnceleniyor</option>
              <option value="cozuldu"${a.durum==="cozuldu"?" selected":""}>🟢 Çözüldü</option>
            </select></td>
            <td><button class="btn btn-danger" style="padding:3px 10px;font-size:.74rem;" onclick="Pages.admin.deleteAriza('${a.id}')">🗑️</button></td>
          </tr>`).join("")}
          </tbody></table></div>`;
      } catch(e) { cont.innerHTML = `<div class="empty"><h3>Yüklenemedi</h3></div>`; }
    },

    async updateArizaDurum(id, durum) {
      try {
        await API.arizalar.update(id, durum);
        UI.showToast("Durum güncellendi","success");
        await admin.loadArizalar();
      } catch(e) { UI.showToast("Güncelleme başarısız","error"); }
    },

    async deleteAriza(id) {
      if (!confirm("Bu arıza kaydını silmek istiyor musunuz?")) return;
      try {
        await API.arizalar.remove(id);
        UI.showToast("Silindi","success");
        await admin.loadArizalar();
      } catch(e) { UI.showToast("Silinemedi","error"); }
    },

    filterUsers(search) {
      const q = search.toLowerCase();
      document.querySelectorAll("#adminUsersTbody tr").forEach(tr => {
        tr.style.display = tr.textContent.toLowerCase().includes(q) ? "" : "none";
      });
    },

    filterUserRole(role) {
      document.querySelectorAll("#adminUsersTbody tr").forEach(tr => {
        if (!role) { tr.style.display = ""; return; }
        tr.style.display = tr.innerHTML.includes(`value="${role}" selected`) ? "" : "none";
      });
    },
    async loadUsers() {
      try {
        const { users } = await API.users.list();
        const tbody = document.getElementById("adminUsersTbody");
        if (!tbody) return;
        tbody.innerHTML = users.map(u => `
          <tr>
            <td style="font-weight:600;">${UI.esc(u.name||"")}</td>
            <td>${UI.esc(u.email||"")}</td>
            <td>${UI.esc(u.okul||"")} ${u.il?`(${UI.esc(u.il)})`:""}  </td>
            <td><span class="status-badge ${u.status==="active"?"st-active":u.status==="blocked"?"st-inactive":"st-pending"}">${u.status||"-"}</span></td>
            <td><span class="status-badge st-active">${roleLabel(u.role)}</span></td>
            <td>
              ${App.isSuperAdmin() ? `
                <select onchange="Pages.admin.changeRole('${u.uid}',this.value)" style="font-size:.75rem;padding:3px;border:1px solid var(--border);border-radius:5px;">
                  <option value="teacher"${u.role==="teacher"?" selected":""}>Öğretmen</option>
                  <option value="admin"${u.role==="admin"?" selected":""}>Admin</option>
                </select>
                <select onchange="Pages.admin.changeStatus('${u.uid}',this.value)" style="font-size:.75rem;padding:3px;border:1px solid var(--border);border-radius:5px;margin-left:4px;">
                  <option value="active"${u.status==="active"?" selected":""}>Aktif</option>
                  <option value="blocked"${u.status==="blocked"?" selected":""}>Engelli</option>
                  <option value="passive"${u.status==="passive"?" selected":""}>Pasif</option>
                </select>
                <button class="btn btn-danger" style="padding:3px 8px;font-size:.72rem;margin-left:4px;" onclick="Pages.admin.deleteUser('${u.uid}')">🗑️</button>
              ` : "—"}
            </td>
          </tr>`).join("");
      } catch(e) { UI.showToast("Kullanıcılar yüklenemedi","error"); }
    },
    async changeRole(uid, role) {
      try { await API.users.changeRole(uid, role); UI.showToast("Rol güncellendi","success"); }
      catch(e) { UI.showToast(e.message||"Hata","error"); await admin.loadUsers(); }
    },
    async changeStatus(uid, status) {
      try { await API.users.changeStatus(uid, status); UI.showToast("Durum güncellendi","success"); }
      catch(e) { UI.showToast(e.message||"Hata","error"); await admin.loadUsers(); }
    },
    async deleteUser(uid) {
      if (!confirm("Bu kullanıcıyı kalıcı olarak silmek istiyor musunuz?")) return;
      try { await API.users.delete(uid); UI.showToast("Kullanıcı silindi","success"); await admin.loadUsers(); }
      catch(e) { UI.showToast(e.message||"Silinemedi","error"); }
    },
    async loadArizalar() {
      try {
        const { arizalar: list } = await API.arizalar.list();
        const cont = document.getElementById("adminArizaList");
        if (!cont) return;
        // renderAdminArizaList fonksiyonu mevcut koddan gelir
        if (typeof renderAdminArizaList === "function") renderAdminArizaList(list);
      } catch(e) {}
    },
    async loadLogs() {
      try {
        const { logs } = await API.admin.logs({ limit: 100 });
        const cont = document.getElementById("adminLogsTable");
        if (!cont) return;
        cont.innerHTML = logs.map(l => `
          <tr>
            <td style="font-size:.75rem;">${l.action}</td>
            <td style="font-size:.75rem;">${UI.esc(l.uid||"")}</td>
            <td style="font-size:.73rem;color:var(--muted);">${JSON.stringify(l.details||{}).substring(0,80)}</td>
            <td style="font-size:.73rem;">${l.timestamp?.toDate?.().toLocaleString("tr-TR")||""}</td>
          </tr>`).join("");
      } catch(e) {}
    },
    async loadSettings() {
      try {
        const { settings } = await API.admin.settings();
        UI.setVal("settingSiteName", settings.siteName||"");
        document.getElementById("settingMaintenance") && (document.getElementById("settingMaintenance").checked = !!settings.maintenanceMode);
        document.getElementById("settingAllowReg") && (document.getElementById("settingAllowReg").checked = settings.allowRegistration !== false);
      } catch(e) {}
    },
    async saveSettings() {
      const data = {
        siteName: UI.val("settingSiteName"),
        maintenanceMode: document.getElementById("settingMaintenance")?.checked,
        allowRegistration: document.getElementById("settingAllowReg")?.checked,
      };
      try {
        await API.admin.updateSettings(data);
        UI.showToast("Ayarlar kaydedildi","success");
      } catch(e) { UI.showToast("Kaydedilemedi","error"); }
    },

    async loadAnnouncements() {
      const cont = document.getElementById("adminAnnsList");
      if (!cont) return;
      try {
        const { announcements } = await API.admin.announcements();
        if (!announcements.length) {
          cont.innerHTML = `<div class="empty"><h3>Henüz duyuru yok</h3></div>`;
          return;
        }
        const prioColor = { high:"var(--danger)", med:"var(--warning)", low:"var(--success)" };
        const prioLabel = { high:"🔴 Acil", med:"🟡 Önemli", low:"🟢 Genel" };
        cont.innerHTML = announcements.map(a => `
          <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--r-sm);padding:14px;margin-bottom:10px;border-left:3px solid ${prioColor[a.priority]||"var(--teal)"};">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
              <span style="font-weight:700;font-size:.88rem;">${UI.esc(a.title)}</span>
              <div style="display:flex;gap:6px;align-items:center;">
                <span style="font-size:.7rem;padding:2px 8px;border-radius:10px;background:${prioColor[a.priority]||"var(--teal)"};color:#fff;">${prioLabel[a.priority]||"Genel"}</span>
                <button class="btn btn-danger" style="padding:2px 8px;font-size:.72rem;" onclick="Pages.admin.removeAnnouncement('${a.id}')">🗑️</button>
              </div>
            </div>
            <div style="font-size:.82rem;color:var(--muted);margin-top:5px;">${UI.esc((a.body||"").substring(0,100))}${(a.body||"").length>100?"…":""}</div>
          </div>`).join("");
      } catch(e) { if (cont) cont.innerHTML = `<div class="empty"><h3>Yüklenemedi</h3></div>`; }
    },

    async removeAnnouncement(id) {
      if (!confirm("Duyuruyu kaldırmak istiyor musunuz?")) return;
      try {
        await API.admin.removeAnnouncement(id);
        UI.showToast("Duyuru kaldırıldı","success");
        await admin.loadAnnouncements();
      } catch(e) { UI.showToast("İşlem başarısız","error"); }
    },

    async loadGuestbook() {
      const loadSection = async (status, contId) => {
        const cont = document.getElementById(contId);
        if (!cont) return;
        try {
          const url = status === "pending" ? "/api/guestbook/pending" : "/api/guestbook";
          const token = API.getToken();
          const res   = await fetch(url, token ? { headers:{ Authorization:`Bearer ${token}` } } : {});
          const data  = await res.json();
          const entries = data.entries || [];
          if (!entries.length) { cont.innerHTML = `<p style="color:var(--muted);font-size:.85rem;">Kayıt yok</p>`; return; }
          cont.innerHTML = entries.map(e => `
            <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r-sm);padding:12px;margin-bottom:8px;">
              <div style="font-weight:700;font-size:.88rem;">${UI.esc(e.name||"")}</div>
              <div style="font-size:.78rem;color:var(--muted);">${UI.esc(e.school||"")} ${e.role?`· ${UI.esc(e.role)}`:""}</div>
              <div style="font-size:.83rem;margin:6px 0;font-style:italic;">"${UI.esc((e.message||"").substring(0,100))}"</div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                ${status === "pending" ? `
                  <button class="btn btn-success" style="padding:3px 10px;font-size:.75rem;" onclick="Pages.admin.reviewGuestbook('${e.id}','approved')">✅ Onayla</button>
                  <button class="btn btn-ghost" style="padding:3px 10px;font-size:.75rem;" onclick="Pages.admin.reviewGuestbook('${e.id}','rejected')">❌ Reddet</button>
                ` : `
                  <button class="btn btn-danger" style="padding:3px 10px;font-size:.75rem;" onclick="Pages.admin.deleteGuestbook('${e.id}')">🗑️ Sil</button>
                `}
              </div>
            </div>`).join("");
        } catch(e) { if (cont) cont.innerHTML = `<p style="color:var(--danger);font-size:.82rem;">Yüklenemedi</p>`; }
      };
      await Promise.all([
        loadSection("pending",  "adminGbPending"),
        loadSection("approved", "adminGbApproved"),
      ]);
    },

    async reviewGuestbook(id, status) {
      try {
        const token = API.getToken();
        await fetch(`/api/guestbook/${id}`, {
          method:"PATCH",
          headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` },
          body: JSON.stringify({ status })
        });
        UI.showToast(status==="approved"?"Onaylandı":"Reddedildi","success");
        await admin.loadGuestbook();
      } catch(e) { UI.showToast("İşlem başarısız","error"); }
    },

    async deleteGuestbook(id) {
      if (!confirm("Bu yorumu silmek istiyor musunuz?")) return;
      try {
        const token = API.getToken();
        await fetch(`/api/guestbook/${id}`, {
          method:"DELETE",
          headers:{ Authorization:`Bearer ${token}` }
        });
        UI.showToast("Yorum silindi","success");
        await admin.loadGuestbook();
      } catch(e) { UI.showToast("Silinemedi","error"); }
    },
  };

  // ─── ARİZALAR ────────────────────────────────────────────────────────────
  const arizalar = {
    _list:           [],
    _filter:         "all",
    _ekipmanFilter:  null,

    async load() {
      arizalar.renderEnvanter();
      await arizalar.fetchAndRender();
    },

    async fetchAndRender() {
      const cont = document.getElementById("arizaList");
      if (cont) cont.innerHTML = `<div class="loading-overlay"><div class="spinner spinner-lg"></div></div>`;
      try {
        const params = {};
        if (arizalar._filter !== "all") params.durum = arizalar._filter;
        if (arizalar._ekipmanFilter) {
          const env = ENVANTER_LIST.find(e => e.id === arizalar._ekipmanFilter);
          if (env) params.ekipman = env.name;
        }
        const { arizalar: list } = await API.arizalar.list(params);
        arizalar._list = list;
        arizalar.renderList();
        arizalar.renderCounts();
        arizalar.renderEnvanter();
      } catch(e) {
        if (cont) cont.innerHTML = `<div class="empty"><h3>Yüklenemedi</h3></div>`;
      }
    },

    renderEnvanter() {
      const grid = document.getElementById("envanterGrid");
      if (!grid) return;
      grid.innerHTML = ENVANTER_LIST.map(e => {
        const acik = arizalar._list.filter(a => a.ekipman === e.name && a.durum !== "cozuldu").length;
        const acil = arizalar._list.filter(a => a.ekipman === e.name && a.oncelik === "acil" && a.durum !== "cozuldu").length;
        const sel  = arizalar._ekipmanFilter === e.id ? "selected" : "";
        const cls  = acil > 0 ? "critical" : acik > 0 ? "has-ariz" : "";
        return `
          <div class="env-card ${cls} ${sel}" onclick="Pages.arizalar.toggleEkipman('${e.id}')">
            <div class="env-ico">${e.icon}</div>
            <div class="env-name">${UI.esc(e.name)}</div>
            ${e.adet > 0 ? `<div style="font-size:.7rem;color:var(--muted);">${e.adet} adet</div>` : ""}
            ${acik > 0 ? `<div class="env-ariz-badge ${acil?"critical":""}">${acik} açık arıza</div>` : ""}
          </div>`;
      }).join("");
    },

    renderCounts() {
      const acik = arizalar._list.filter(a => a.durum === "acik").length;
      const inc  = arizalar._list.filter(a => a.durum === "inceleniyor").length;
      const coz  = arizalar._list.filter(a => a.durum === "cozuldu").length;
      const set  = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      set("arizCountAcik", acik);
      set("arizCountInc",  inc);
      set("arizCountCoz",  coz);
    },

    renderList() {
      const cont = document.getElementById("arizaList");
      if (!cont) return;

      let list = [...arizalar._list];
      if (arizalar._ekipmanFilter) {
        const env = ENVANTER_LIST.find(e => e.id === arizalar._ekipmanFilter);
        if (env) list = list.filter(a => a.ekipman === env.name);
      }
      if (arizalar._filter !== "all") {
        list = list.filter(a => a.durum === arizalar._filter);
      }

      if (!list.length) {
        cont.innerHTML = `<div class="empty">
          <h3>Arıza kaydı yok</h3>
          <p>Bu filtreye uygun arıza bildirilmemiş.</p>
        </div>`;
        return;
      }

      const durumBadge = d => ({
        acik:         `<span class="ariz-durum durum-acik-badge">🔴 Açık</span>`,
        inceleniyor:  `<span class="ariz-durum durum-inceleniyor-badge">🟡 İnceleniyor</span>`,
        cozuldu:      `<span class="ariz-durum durum-cozuldu-badge">🟢 Çözüldü</span>`,
      }[d] || `<span class="ariz-durum">—</span>`);

      const oncelikLabel = o => ({acil:"🔴 Acil", dusuk:"🟢 Düşük"}[o] || "🟡 Normal");
      const envIco = name => (ENVANTER_LIST.find(e => e.name === name)||{icon:"📦"}).icon;
      const isAdmin = App.isAdmin();
      const uid     = App.getUser()?.uid;

      cont.innerHTML = list.map(a => `
        <div class="ariz-card durum-${a.durum||"acik"}">
          <div class="ariz-head">
            <div class="ariz-title">${UI.esc(a.baslik||"")}</div>
            ${durumBadge(a.durum||"acik")}
          </div>
          <div class="ariz-device" style="font-size:.78rem;color:var(--navy-mid);font-weight:600;margin-bottom:6px;">
            ${envIco(a.ekipman)} ${UI.esc(a.ekipman||"")}
            ${a.cihazNo ? ` · ${UI.esc(a.cihazNo)}` : ""}
            <span style="color:var(--muted);font-weight:400;margin-left:6px;">${oncelikLabel(a.oncelik)}</span>
          </div>
          <div class="ariz-desc">${UI.esc(a.aciklama||"").replace(/\n/g,"<br>")}</div>
          <div class="ariz-meta">
            <span>👤 ${UI.esc(a.bildiren||a.authorName||"Anonim")}</span>
            <span>🕐 ${a.createdAt?._seconds
              ? new Date(a.createdAt._seconds*1000).toLocaleDateString("tr-TR")
              : (a.createdAt||"—")}</span>
            ${isAdmin ? `
              <select style="font-size:.72rem;padding:2px 6px;border:1px solid var(--border);border-radius:5px;font-family:var(--font);margin-left:auto;"
                onchange="Pages.arizalar.updateDurum('${a.id}',this.value)">
                <option value="acik"${a.durum==="acik"?" selected":""}>🔴 Açık</option>
                <option value="inceleniyor"${a.durum==="inceleniyor"?" selected":""}>🟡 İnceleniyor</option>
                <option value="cozuldu"${a.durum==="cozuldu"?" selected":""}>🟢 Çözüldü</option>
              </select>
              <button class="btn btn-danger" style="padding:2px 8px;font-size:.7rem;"
                onclick="Pages.arizalar.remove('${a.id}')">🗑️</button>` : ""}
          </div>
        </div>`).join("");
    },

    toggleEkipman(id) {
      arizalar._ekipmanFilter = arizalar._ekipmanFilter === id ? null : id;
      arizalar.renderEnvanter();
      arizalar.renderList();
    },

    setFilter(f, btn) {
      arizalar._filter = f;
      document.querySelectorAll(".ariz-filter-btn").forEach(b => b.classList.remove("active"));
      btn?.classList.add("active");
      arizalar.renderList();
    },

    async updateDurum(id, durum) {
      try {
        await API.arizalar.update(id, durum);
        UI.showToast("Durum güncellendi","success");
        await arizalar.fetchAndRender();
      } catch(e) { UI.showToast(e.message||"Hata","error"); }
    },

    async remove(id) {
      if (!confirm("Bu arıza kaydını silmek istiyor musunuz?")) return;
      try {
        await API.arizalar.remove(id);
        UI.showToast("Arıza silindi","success");
        await arizalar.fetchAndRender();
      } catch(e) { UI.showToast("Silinemedi","error"); }
    },
  };

  // ─── Yardımcılar ─────────────────────────────────────────────────────────
  function renderCatSection(cat, tools) {
    const CAT_ICONS = {
      "Genel amaçlı yapay zekâ araçları":"🤖","Sınıf yönetimi araçları":"🏫",
      "Kodlama / programlama araçları":"💻","Etkileşimli sunum araçları":"🎯",
      "Yapay zekâ destekli araçlar":"🎨","Etkileşimli beyaz tahta araçları":"📋",
      "Artırılmış / Sanal gerçeklik uygulamaları":"🥽","Anket araçları":"📊",
      "3D model oluşturma araçları":"🧊","Depolama ve dosyalama araçları":"💾",
      "Video düzenleme araçları":"🎞️","Ses düzenleme araçları":"🎵",
    };
    const icon = CAT_ICONS[cat] || "📌";
    const id   = "cat_" + cat.replace(/[^a-zA-Z0-9]/g,"_");
    return `
      <div class="cat-section" id="${id}">
        <div class="cat-head" onclick="this.parentElement.classList.toggle('collapsed')">
          <div class="cat-head-left">
            <div class="cat-ico">${icon}</div>
            <div><span class="cat-name">${UI.esc(cat)}</span><span class="cat-cnt">${tools.length}</span></div>
          </div>
          <div class="cat-toggle">▾</div>
        </div>
        <div class="cat-body">
          <div class="tools-grid">${tools.map(renderToolCard).join("")}</div>
        </div>
      </div>`;
  }

  function renderToolCard(t) {
    const btn = t.url
      ? `<a href="${UI.esc(t.url)}" target="_blank" rel="noopener" class="btn-open btn-open-active">Aç ↗</a>`
      : `<span class="btn-open btn-open-na">Bağlantı eklenecek</span>`;
    return `
      <div class="tool-card">
        <div class="tool-card-top">
          <div class="tool-logo-wrap">
            ${t.logo ? `<img src="${UI.esc(t.logo)}" alt="${UI.esc(t.name)}" onerror="this.style.display='none'">` : ""}
          </div>
          <div class="tool-info">
            <div class="tool-name">${UI.esc(t.name)}</div>
          </div>
        </div>
        <div class="tool-desc">${UI.esc(t.desc||"")}</div>
        ${t.kimlerIcin ? `<div class="tool-note">👥 ${UI.esc(t.kimlerIcin)}</div>` : ""}
        ${t.ornekKullanim ? `<div class="tool-note">💡 ${UI.esc(t.ornekKullanim)}</div>` : ""}
        <div class="tool-footer"><span class="cat-tag">${UI.esc(t.cat||"")}</span>${btn}</div>
      </div>`;
  }

  function roleLabel(role) {
    return { superadmin:"👑 Süper Admin", admin:"🛡️ Admin", teacher:"👩‍🏫 Öğretmen" }[role] || "Kullanıcı";
  }

  function formatSize(bytes) {
    if (bytes < 1024)       return bytes + " B";
    if (bytes < 1048576)    return (bytes/1024).toFixed(1) + " KB";
    return (bytes/1048576).toFixed(1) + " MB";
  }

  return { home, tools, community, classes, media, profile, admin, arizalar };
})();
