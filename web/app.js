
const supabaseLib = window.supabase;
const SUPABASE_URL = "https://nvmcglnkzvipkhsgxbfx.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52bWNnbG5renZpcGtoc2d4YmZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExODI4MjQsImV4cCI6MjA4Njc1ODgyNH0.uTlLc6WH7IcFabmuCOfV_vTUU6mo7HfA136xfw7OXYI";

const supabase = supabaseLib?.createClient
  ? supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const authView = document.getElementById("auth-view");
const appView = document.getElementById("app-view");
const authStatus = document.getElementById("auth-status");
const authActions = document.getElementById("auth-actions");
const savedBilans = document.getElementById("saved-bilans");

const fields = {
  patientLast: document.getElementById("patient-last"),
  patientFirst: document.getElementById("patient-first"),
  patientDob: document.getElementById("patient-dob"),
  pathologie: document.getElementById("pathologie"),
  chambre: document.getElementById("chambre"),
  medecin: document.getElementById("medecin"),
  kine: document.getElementById("kine"),
  dateOrdonnance: document.getElementById("date-ordonnance"),
  nbSeances: document.getElementById("nb-seances"),
  frequence: document.getElementById("frequence"),
  bilanDate: document.getElementById("bilan-date"),
  trophique: document.getElementById("trophique"),
  articulaireLocalisation: document.getElementById("articulaire_localisation"),
  musculaireLocalisation: document.getElementById("musculaire_localisation"),
  neuroLocalisation: document.getElementById("neuro_localisation"),
  respPathologie: document.getElementById("resp_pathologie"),
  appareillage: document.getElementById("appareillage"),
  perimetre: document.getElementById("perimetre"),
  nbMarches: document.getElementById("nb_marches"),
  equilibreRemarques: document.getElementById("equilibre_remarques"),
  douleurTopo: document.getElementById("douleur_topo"),
  eva: document.getElementById("eva"),
  evaNc: document.getElementById("eva_nc"),
  tugTime: document.getElementById("tug_time"),
  objectifsAutres: document.getElementById("objectifs_autres"),
  traitementsAutres: document.getElementById("traitements_autres"),
  propositionDate: document.getElementById("proposition_date"),
};

const preview = document.getElementById("preview");
const saveBtn = document.getElementById("save-btn");
const newBtn = document.getElementById("new-btn");
const printBtn = document.getElementById("print-btn");
const printNativeBtn = document.getElementById("print-native");
const copyStatus = document.getElementById("copy-status");
const googleLogin = document.getElementById("google-login");
const signOutInline = document.getElementById("sign-out-inline");

let currentUser = null;
let currentBilanId = null;

init();

function init() {
  authStatus.textContent = "Initialisation...";
  if (!supabase) {
    authStatus.textContent =
      "Supabase non chargé. Vérifie la connexion internet ou un bloqueur de scripts.";
    return;
  }
  if (fields.bilanDate && !fields.bilanDate.value) {
    fields.bilanDate.value = new Date().toISOString().slice(0, 10);
  }

  document.querySelectorAll("input[type='checkbox'], input[type='radio']").forEach((input) => {
    input.addEventListener("change", handleChange);
  });
  Object.values(fields).forEach((field) => {
    if (!field) return;
    field.addEventListener("input", handleChange);
  });

  if (fields.evaNc) {
    fields.evaNc.addEventListener("change", () => {
      if (!fields.eva) return;
      if (fields.evaNc.checked) {
        fields.eva.value = "";
        fields.eva.disabled = true;
      } else {
        fields.eva.disabled = false;
      }
      handleChange();
    });
  }

  saveBtn.addEventListener("click", handleSaveBilan);
  newBtn.addEventListener("click", handleNewBilan);
  printBtn.addEventListener("click", handlePrint);
  if (printNativeBtn) printNativeBtn.addEventListener("click", handleNativePrint);
  if (googleLogin) googleLogin.addEventListener("click", signInWithGoogle);
  if (signOutInline) {
    signOutInline.addEventListener("click", async () => {
      await supabase.auth.signOut();
    });
  }

  const signInBtn = document.getElementById("sign-in");
  const signUpBtn = document.getElementById("sign-up");
  const magicBtn = document.getElementById("magic-link");
  if (signInBtn) signInBtn.addEventListener("click", signIn);
  if (signUpBtn) signUpBtn.addEventListener("click", signUp);
  if (magicBtn) magicBtn.addEventListener("click", magicLink);

  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    updateAuthUI();
    if (currentUser) {
      loadBilans();
    }
  });

  supabase.auth.getSession().then(({ data }) => {
    currentUser = data.session?.user || null;
    updateAuthUI();
    if (currentUser) {
      loadBilans();
    }
  });

  updatePreview();
  if (authStatus) authStatus.textContent = "Connexion prête.";
}

function updateAuthUI() {
  if (!authActions) return;
  if (!currentUser) {
    authView.classList.remove("hidden");
    appView.classList.add("hidden");
    authActions.innerHTML = "";
    return;
  }

  authView.classList.add("hidden");
  appView.classList.remove("hidden");
  authActions.innerHTML = `<div class="note">${escapeHtml(currentUser.email || "")}</div>`;
}

async function signIn() {
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value.trim();
  if (!email || !password) return setAuthStatus("Email et mot de passe requis.");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return setAuthStatus(error.message);
  setAuthStatus("Connexion réussie.");
}

async function signUp() {
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value.trim();
  if (!email || !password) return setAuthStatus("Email et mot de passe requis.");
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return setAuthStatus(error.message);
  setAuthStatus("Compte créé. Vérifie ta boîte mail.");
}

async function magicLink() {
  const email = document.getElementById("auth-email").value.trim();
  if (!email) return setAuthStatus("Email requis.");
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) return setAuthStatus(error.message);
  setAuthStatus("Lien magique envoyé.");
}

async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) return setAuthStatus(error.message);
}

function setAuthStatus(message) {
  authStatus.textContent = message;
}

function handleChange() {
  updatePreview();
}

async function handleSaveBilan() {
  if (!currentUser) {
    copyStatus.textContent = "Connecte-toi pour enregistrer le bilan.";
    setTimeout(() => (copyStatus.textContent = ""), 2500);
    return;
  }
  const data = collectData();
  const title = buildBilanTitle(data);

  const payload = {
    user_id: currentUser.id,
    title,
    data,
  };

  let result;
  if (currentBilanId) {
    result = await supabase.from("bilans").update(payload).eq("id", currentBilanId).select().single();
  } else {
    result = await supabase.from("bilans").insert(payload).select().single();
  }

  if (result.error) {
    copyStatus.textContent = `Erreur: ${result.error.message}`;
    return;
  }

  currentBilanId = result.data.id;
  copyStatus.textContent = "Bilan enregistré en ligne.";
  setTimeout(() => (copyStatus.textContent = ""), 2000);
  loadBilans();
}

function handleNewBilan() {
  currentBilanId = null;
  resetForm();
  updatePreview();
}

function resetForm() {
  Object.values(fields).forEach((field) => {
    if (!field) return;
    if (field.type === "date" && field.id === "bilan-date") {
      field.value = new Date().toISOString().slice(0, 10);
      return;
    }
    field.value = "";
  });
  document.querySelectorAll("input[type='checkbox'], input[type='radio']").forEach((input) => {
    input.checked = false;
  });
}

async function loadBilans() {
  if (!savedBilans) return;
  const { data, error } = await supabase
    .from("bilans")
    .select("id,title,created_at,data")
    .order("created_at", { ascending: false });
  if (error) {
    savedBilans.innerHTML = `<div class="note">Erreur: ${escapeHtml(error.message)}</div>`;
    return;
  }
  if (!data || data.length === 0) {
    savedBilans.innerHTML = '<div class="note">Aucun bilan enregistré.</div>';
    return;
  }

  savedBilans.innerHTML = "";
  data.forEach((entry) => {
    const item = document.createElement("div");
    item.className = "saved-item";
    item.innerHTML = `
      <div class="saved-title">${escapeHtml(entry.title)}</div>
      <div class="saved-meta">Enregistré le ${escapeHtml(formatDate(entry.created_at.slice(0, 10)))}</div>
      <div class="saved-actions">
        <button type="button" class="ghost" data-action="load">Ouvrir</button>
        <button type="button" class="ghost" data-action="duplicate">Dupliquer</button>
        <button type="button" class="ghost" data-action="delete">Supprimer</button>
      </div>
    `;
    item.querySelector("[data-action='load']").addEventListener("click", () => {
      currentBilanId = entry.id;
      loadBilan(entry.data);
    });
    item.querySelector("[data-action='duplicate']").addEventListener("click", () => {
      currentBilanId = null;
      const clone = structuredClone(entry.data);
      clone.bilanDate = new Date().toISOString().slice(0, 10);
      loadBilan(clone);
    });
    item.querySelector("[data-action='delete']").addEventListener("click", async () => {
      await supabase.from("bilans").delete().eq("id", entry.id);
      loadBilans();
    });
    savedBilans.appendChild(item);
  });
}

async function handlePrint() {
  const data = collectData();
  const title = buildBilanTitle(data);
  const html = buildPrintableDocument(data);

  try {
    const response = await fetch("/api/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html, title }),
    });
    if (!response.ok) throw new Error("PDF error");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title}.pdf`.replace(/\s+/g, " ");
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    copyStatus.textContent = "Impossible de générer le PDF (serveur).";
  }
}

function handleNativePrint() {
  const html = buildPrintableDocument(collectData());
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}

function buildPrintableDocument(data) {
  const html = buildPreviewHtml(data);
  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>BDKEAZY - Bilan kiné</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style>
          body { font-family: 'Space Grotesk', sans-serif; background: #fff; color: #1a1a1a; margin: 0; padding: 24px; }
          .preview-header { border: 1px solid #eadfce; border-radius: 18px; padding: 16px 18px; background: linear-gradient(120deg, #fff7ec 0%, #f2fbf8 100%); }
          .preview-title { font-family: 'Fraunces', serif; font-size: 24px; color: #0a6a63; }
          .preview-subtitle { font-size: 12px; color: #6d6a64; }
          .preview-meta { font-size: 12px; color: #6d6a64; display: grid; gap: 6px; margin-top: 10px; }
          .preview-meta span { font-weight: 600; color: #1a1a1a; min-width: 90px; display: inline-block; }
          .preview-section { border: 1px solid #eadfce; border-radius: 14px; background: #fff; padding: 12px 14px; margin-top: 12px; box-shadow: 0 8px 18px rgba(26,20,6,0.06); }
          .preview-section-title { font-weight: 700; color: #1c3d5a; margin-bottom: 8px; }
          .preview-item { font-size: 13px; margin-bottom: 6px; }
          .preview-list { margin: 0; padding-left: 18px; font-size: 13px; }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `;
}

function collectData() {
  return {
    patientLast: fields.patientLast.value.trim(),
    patientFirst: fields.patientFirst.value.trim(),
    patientDob: fields.patientDob.value,
    pathologie: fields.pathologie.value.trim(),
    chambre: fields.chambre.value.trim(),
    medecin: fields.medecin.value.trim(),
    kine: fields.kine.value.trim(),
    dateOrdonnance: fields.dateOrdonnance.value,
    nbSeances: fields.nbSeances.value.trim(),
    frequence: fields.frequence.value.trim(),
    bilanDate: fields.bilanDate.value,
    trophique: fields.trophique.value.trim(),
    articulaireDeficit: radioValue("articulaire_deficit"),
    articulaireLocalisation: fields.articulaireLocalisation.value.trim(),
    musculaireDeficit: radioValue("musculaire_deficit"),
    musculaireLocalisation: fields.musculaireLocalisation.value.trim(),
    neuroDeficit: radioValue("neuro_deficit"),
    neuroLocalisation: fields.neuroLocalisation.value.trim(),
    respDeficit: radioValue("resp_deficit"),
    respPathologie: fields.respPathologie.value.trim(),
    kineResp: radioValue("kine_resp"),
    transferts: [
      { label: "Couché → Assis", value: radioValue("transfert_couche_assis") },
      { label: "Assis → Debout", value: radioValue("transfert_assis_debout") },
      { label: "Debout → Assis", value: radioValue("transfert_debout_assis") },
      { label: "Assis → Couché", value: radioValue("transfert_assis_couche") },
    ],
    equilibreNc: radioValue("equilibre_nc"),
    appui: radioValue("appui"),
    appareillage: fields.appareillage.value.trim(),
    perimetre: fields.perimetre.value.trim(),
    bipodal: radioValue("bipodal"),
    unipodal: radioValue("unipodal"),
    boiterie: radioValue("boiterie"),
    demiTour: radioValue("demi_tour"),
    escaliers: radioValue("escaliers"),
    nbMarches: fields.nbMarches.value.trim(),
    aideMarche: radioValue("aide_marche"),
    aideMarcheType: checkboxValues("aide_marche_type"),
    chute: radioValue("chute"),
    releveSol: radioValue("releve_sol"),
    equilibreRemarques: fields.equilibreRemarques.value.trim(),
    douleurTopo: fields.douleurTopo.value.trim(),
    douleurType: radioValue("douleur_type"),
    antalgiques: radioValue("antalgiques"),
    efficacite: radioValue("efficacite"),
    eva: fields.eva.value.trim(),
    evaNc: fields.evaNc?.checked || false,
    tugNc: radioValue("tug_nc"),
    tugTime: fields.tugTime.value.trim(),
    tugLeverSans: radioValue("tug_lever_sans"),
    tugLeverAvec: radioValue("tug_lever_avec"),
    tugDebout: radioValue("tug_debout"),
    tugMarche: radioValue("tug_marche"),
    tugDemiTour: radioValue("tug_demi_tour"),
    tugRassoit: radioValue("tug_rassoit"),
    objectifs: checkboxValues("objectifs"),
    objectifsAutres: fields.objectifsAutres.value.trim(),
    traitements: checkboxValues("traitements"),
    traitementsAutres: fields.traitementsAutres.value.trim(),
    proposition: radioValue("proposition"),
    propositionDate: fields.propositionDate.value,
  };
}

function buildPreviewHtml(data) {
  const age = calculateAge(data.patientDob);
  const patientName = `${data.patientLast} ${data.patientFirst}`.trim() || "-";
  return `
    <div class="preview-header">
      <div>
        <div class="preview-title">Bilan kiné EHPAD</div>
        <div class="preview-subtitle">Synthèse du ${escapeHtml(formatDate(data.bilanDate) || "-")}</div>
      </div>
      <div class="preview-meta">
        <div><span>Patient</span>${escapeHtml(patientName)}</div>
        <div><span>Naissance</span>${escapeHtml(formatDate(data.patientDob) || "-")}</div>
        <div><span>Âge</span>${escapeHtml(age ? `${age} ans` : "-")}</div>
        <div><span>Chambre</span>${escapeHtml(data.chambre || "-")}</div>
        <div><span>Pathologie</span>${escapeHtml(data.pathologie || "-")}</div>
      </div>
    </div>
    ${renderSection("Identité & prescription", [
      renderItem("Médecin prescripteur", data.medecin),
      renderItem("Kinésithérapeute", data.kine),
      renderItem("Date ordonnance", formatDate(data.dateOrdonnance)),
      renderItem("Nombre de séances", data.nbSeances),
      renderItem("Fréquence", data.frequence),
    ])}
    ${renderSection("Évaluation", [
      renderItem("Bilan trophique", data.trophique),
      renderItem("Bilan articulaire", formatDeficit(data.articulaireDeficit, data.articulaireLocalisation)),
      renderItem("Bilan musculaire", formatDeficit(data.musculaireDeficit, data.musculaireLocalisation)),
      renderItem("Bilan neurologique", formatDeficit(data.neuroDeficit, data.neuroLocalisation)),
      renderItem("Bilan respiratoire", formatResp(data.respDeficit, data.respPathologie, data.kineResp)),
      renderItem("Équilibre & marche", data.equilibreNc),
      renderList("Transferts", formatPairs(data.transferts)),
      renderItem("Appui", data.appui),
      renderItem("Appareillage", data.appareillage),
      renderItem("Appui bipodal", data.bipodal),
      renderItem("Appui unipodal", data.unipodal),
      renderItem("Périmètre de marche", data.perimetre),
      renderItem("Boiterie", data.boiterie),
      renderItem("Demi-tour", data.demiTour),
      renderItem("Escaliers", data.escaliers),
      renderItem("Nombre de marches", data.nbMarches),
      renderItem("Aide à la marche", formatAide(data.aideMarche, data.aideMarcheType)),
      renderItem("Chute", data.chute),
      renderItem("Relevé du sol", data.releveSol),
      renderItem("Remarques", data.equilibreRemarques),
    ])}
    ${renderSection("Douleur & test", [
      renderItem("Topographie", data.douleurTopo),
      renderItem("Type", data.douleurType),
      renderItem("Antalgiques", data.antalgiques),
      renderItem("Efficacité", data.efficacite),
      renderItem("EVA", data.evaNc ? "Pas en capacité de répondre" : data.eva),
      renderItem("Get Up and Go", data.tugNc),
      renderItem("Get Up and Go - Temps", data.tugTime),
      renderList(
        "Get Up and Go",
        formatPairs([
          { label: "Se lever sans aide des bras", value: data.tugLeverSans },
          { label: "Se lever avec accoudoirs", value: data.tugLeverAvec },
          { label: "Se tenir debout sans aide", value: data.tugDebout },
          { label: "Monter / descendre 1 marche", value: data.tugMarche },
          { label: "Demi-tour sans toucher le mur", value: data.tugDemiTour },
          { label: "Se rassoit sans aide", value: data.tugRassoit },
        ])
      ),
    ])}
    ${renderSection("Objectifs", [
      renderList("Objectifs principaux", data.objectifs),
      renderItem("Autres objectifs", data.objectifsAutres),
    ])}
    ${renderSection("Traitement", [
      renderList("Traitements", data.traitements),
      renderItem("Autres traitements", data.traitementsAutres),
    ])}
    ${renderSection("Propositions", [
      renderItem("Proposition", data.proposition),
      renderItem("Date", formatDate(data.propositionDate)),
    ])}
  `;
}

function updatePreview() {
  preview.innerHTML = buildPreviewHtml(collectData());
}

function renderSection(title, items) {
  const content = items.filter(Boolean).join("");
  return `
    <div class="preview-section">
      <div class="preview-section-title">${escapeHtml(title)}</div>
      ${content || '<div class="preview-item muted">Aucun détail renseigné</div>'}
    </div>
  `;
}

function renderItem(label, value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return `<div class="preview-item"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(text)}</div>`;
}

function renderList(label, items) {
  if (!items || items.length === 0) return "";
  return `
    <div class="preview-item">
      <strong>${escapeHtml(label)}:</strong>
      <ul class="preview-list">
        ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </div>
  `;
}

function buildBilanTitle(data) {
  const patient = `${data.patientLast} ${data.patientFirst}`.trim();
  const date = formatDate(data.bilanDate) || "Date inconnue";
  return patient ? `${patient} — ${date}` : `Bilan du ${date}`;
}

function loadBilan(data) {
  fields.patientLast.value = data.patientLast || "";
  fields.patientFirst.value = data.patientFirst || "";
  fields.patientDob.value = data.patientDob || "";
  fields.pathologie.value = data.pathologie || "";
  fields.chambre.value = data.chambre || "";
  fields.medecin.value = data.medecin || "";
  fields.kine.value = data.kine || "";
  fields.dateOrdonnance.value = data.dateOrdonnance || "";
  fields.nbSeances.value = data.nbSeances || "";
  fields.frequence.value = data.frequence || "";
  fields.bilanDate.value = data.bilanDate || "";
  fields.trophique.value = data.trophique || "";
  fields.articulaireLocalisation.value = data.articulaireLocalisation || "";
  fields.musculaireLocalisation.value = data.musculaireLocalisation || "";
  fields.neuroLocalisation.value = data.neuroLocalisation || "";
  fields.respPathologie.value = data.respPathologie || "";
  fields.appareillage.value = data.appareillage || "";
  fields.perimetre.value = data.perimetre || "";
  fields.nbMarches.value = data.nbMarches || "";
  fields.equilibreRemarques.value = data.equilibreRemarques || "";
  fields.douleurTopo.value = data.douleurTopo || "";
  fields.eva.value = data.eva || "";
  if (fields.evaNc) {
    fields.evaNc.checked = Boolean(data.evaNc);
    fields.eva.disabled = fields.evaNc.checked;
    if (fields.evaNc.checked) fields.eva.value = "";
  }
  fields.tugTime.value = data.tugTime || "";
  fields.objectifsAutres.value = data.objectifsAutres || "";
  fields.traitementsAutres.value = data.traitementsAutres || "";
  fields.propositionDate.value = data.propositionDate || "";

  setRadio("articulaire_deficit", data.articulaireDeficit);
  setRadio("musculaire_deficit", data.musculaireDeficit);
  setRadio("neuro_deficit", data.neuroDeficit);
  setRadio("resp_deficit", data.respDeficit);
  setRadio("kine_resp", data.kineResp);
  setRadio("transfert_couche_assis", data.transferts?.[0]?.value);
  setRadio("transfert_assis_debout", data.transferts?.[1]?.value);
  setRadio("transfert_debout_assis", data.transferts?.[2]?.value);
  setRadio("transfert_assis_couche", data.transferts?.[3]?.value);
  setRadio("equilibre_nc", data.equilibreNc);
  setRadio("appui", data.appui);
  setRadio("bipodal", data.bipodal);
  setRadio("unipodal", data.unipodal);
  setRadio("boiterie", data.boiterie);
  setRadio("demi_tour", data.demiTour);
  setRadio("escaliers", data.escaliers);
  setRadio("aide_marche", data.aideMarche);
  setRadio("chute", data.chute);
  setRadio("releve_sol", data.releveSol);
  setRadio("douleur_type", data.douleurType);
  setRadio("antalgiques", data.antalgiques);
  setRadio("efficacite", data.efficacite);
  setRadio("tug_nc", data.tugNc);
  setRadio("tug_lever_sans", data.tugLeverSans);
  setRadio("tug_lever_avec", data.tugLeverAvec);
  setRadio("tug_debout", data.tugDebout);
  setRadio("tug_marche", data.tugMarche);
  setRadio("tug_demi_tour", data.tugDemiTour);
  setRadio("tug_rassoit", data.tugRassoit);
  setRadio("proposition", data.proposition);

  setCheckboxes("aide_marche_type", data.aideMarcheType || []);
  setCheckboxes("objectifs", data.objectifs || []);
  setCheckboxes("traitements", data.traitements || []);

  updatePreview();
}

function setRadio(name, value) {
  document.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
    input.checked = input.value === value;
  });
}

function setCheckboxes(name, values) {
  document.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
    input.checked = values.includes(input.value);
  });
}

function radioValue(name) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value || "";
}

function checkboxValues(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((input) => input.value);
}

function formatDate(value) {
  if (!value) return "";
  const parts = value.split("-");
  if (parts.length !== 3) return value;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function calculateAge(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

function formatDeficit(deficit, localisation) {
  if (!deficit && !localisation) return "";
  if (!localisation) return deficit;
  if (!deficit) return localisation;
  return `${deficit} - ${localisation}`;
}

function formatResp(deficit, pathologie, kineResp) {
  const parts = [];
  if (deficit) parts.push(`Déficit: ${deficit}`);
  if (pathologie) parts.push(`Pathologie: ${pathologie}`);
  if (kineResp) parts.push(`Kiné resp.: ${kineResp}`);
  return parts.join(" | ");
}

function formatPairs(items) {
  return items.filter((item) => item.value).map((item) => `${item.label}: ${item.value}`);
}

function formatAide(main, types) {
  if (!main && (!types || types.length === 0)) return "";
  if (!types || types.length === 0) return main;
  return `${main} (${types.join(", ")})`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
