const DRAFT_KEY = "kine_ehpad_draft";
const BILANS_KEY = "kine_ehpad_saved_bilans";

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
const copyBtn = document.getElementById("copy-btn");
const resetBtn = document.getElementById("reset-btn");
const printBtn = document.getElementById("print-btn");
const saveBtn = document.getElementById("save-btn");
const copyStatus = document.getElementById("copy-status");
const progressFill = document.getElementById("progress-fill");
const progressLabel = document.getElementById("progress-label");
const progressSteps = document.querySelectorAll("[data-step]");
const savedBilans = document.getElementById("saved-bilans");

init();

function init() {
  if (fields.bilanDate && !fields.bilanDate.value) {
    fields.bilanDate.value = new Date().toISOString().slice(0, 10);
  }
  hydrateDraft();
  bindInputs();
  updatePreview();
  renderSavedBilans();
}

function bindInputs() {
  Object.values(fields).forEach((field) => {
    if (!field) return;
    field.addEventListener("input", handleChange);
  });

  document.querySelectorAll("input[type='checkbox'], input[type='radio']").forEach((input) => {
    input.addEventListener("change", handleChange);
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

  if (copyBtn) copyBtn.addEventListener("click", handleCopy);
  if (resetBtn) resetBtn.addEventListener("click", handleReset);
  if (printBtn) printBtn.addEventListener("click", () => window.print());
  if (saveBtn) saveBtn.addEventListener("click", handleSaveBilan);
}

function handleChange() {
  saveDraft();
  updatePreview();
}

function hydrateDraft() {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return;
  try {
    const draft = JSON.parse(raw);
    Object.entries(fields).forEach(([key, field]) => {
      if (!field || draft[key] == null) return;
      field.value = draft[key];
    });

    restoreRadio(draft, "lateralite");
    restoreRadio(draft, "articulaire_deficit");
    restoreRadio(draft, "musculaire_deficit");
    restoreRadio(draft, "neuro_deficit");
    restoreRadio(draft, "resp_deficit");
    restoreRadio(draft, "kine_resp");
    restoreRadio(draft, "transfert_couche_assis");
    restoreRadio(draft, "transfert_assis_debout");
    restoreRadio(draft, "transfert_debout_assis");
    restoreRadio(draft, "transfert_assis_couche");
    restoreRadio(draft, "appui");
    restoreRadio(draft, "bipodal");
    restoreRadio(draft, "unipodal");
    restoreRadio(draft, "boiterie");
    restoreRadio(draft, "demi_tour");
    restoreRadio(draft, "escaliers");
    restoreRadio(draft, "aide_marche");
    restoreRadio(draft, "chute");
    restoreRadio(draft, "releve_sol");
    restoreRadio(draft, "douleur_type");
    restoreRadio(draft, "antalgiques");
    restoreRadio(draft, "efficacite");
    restoreRadio(draft, "tug_lever_sans");
    restoreRadio(draft, "tug_lever_avec");
    restoreRadio(draft, "tug_debout");
    restoreRadio(draft, "tug_marche");
    restoreRadio(draft, "tug_demi_tour");
    restoreRadio(draft, "tug_rassoit");
    restoreRadio(draft, "proposition");
    restoreRadio(draft, "equilibre_nc");
    restoreRadio(draft, "tug_nc");

    restoreCheckboxes(draft, "aide_marche_type");
    restoreCheckboxes(draft, "objectifs");
    restoreCheckboxes(draft, "traitements");

    if (fields.evaNc) {
      fields.evaNc.checked = Boolean(draft.evaNc);
      if (fields.evaNc.checked && fields.eva) {
        fields.eva.value = "";
        fields.eva.disabled = true;
      }
    }
  } catch (error) {
    localStorage.removeItem(DRAFT_KEY);
  }
}

function restoreRadio(draft, name) {
  if (!draft[name]) return;
  const input = document.querySelector(`input[name="${name}"][value="${draft[name]}"]`);
  if (input) input.checked = true;
}

function restoreCheckboxes(draft, name) {
  if (!Array.isArray(draft[name])) return;
  document.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
    input.checked = draft[name].includes(input.value);
  });
}

function saveDraft() {
  const data = collectData();
  localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
}

function handleCopy() {
  const text = buildPlainText(collectData());
  if (!text.trim()) {
    copyStatus.textContent = "Aucun contenu à copier.";
    return;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        copyStatus.textContent = "Bilan copié dans le presse-papiers.";
        setTimeout(() => (copyStatus.textContent = ""), 2000);
      })
      .catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
  copyStatus.textContent = "Bilan copié dans le presse-papiers.";
  setTimeout(() => (copyStatus.textContent = ""), 2000);
}

function handleReset() {
  const confirmed = window.confirm("Réinitialiser ce bilan ?");
  if (!confirmed) return;
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

  localStorage.removeItem(DRAFT_KEY);
  updatePreview();
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
    equilibreNc: radioValue("equilibre_nc"),
    douleurTopo: fields.douleurTopo.value.trim(),
    douleurType: radioValue("douleur_type"),
    antalgiques: radioValue("antalgiques"),
    efficacite: radioValue("efficacite"),
    eva: fields.eva.value.trim(),
    evaNc: fields.evaNc?.checked || false,
    tugTime: fields.tugTime.value.trim(),
    tugLeverSans: radioValue("tug_lever_sans"),
    tugLeverAvec: radioValue("tug_lever_avec"),
    tugDebout: radioValue("tug_debout"),
    tugMarche: radioValue("tug_marche"),
    tugDemiTour: radioValue("tug_demi_tour"),
    tugRassoit: radioValue("tug_rassoit"),
    tugNc: radioValue("tug_nc"),
    objectifs: checkboxValues("objectifs"),
    objectifsAutres: fields.objectifsAutres.value.trim(),
    traitements: checkboxValues("traitements"),
    traitementsAutres: fields.traitementsAutres.value.trim(),
    proposition: radioValue("proposition"),
    propositionDate: fields.propositionDate.value,
  };
}

function updatePreview() {
  const data = collectData();
  preview.innerHTML = buildPreviewHtml(data);
  updateProgress(data);
}

function updateProgress(data) {
  const steps = [
    { id: "identite", done: Boolean(data.patientLast || data.patientFirst) },
    {
      id: "evaluation",
      done: Boolean(
        data.articulaireDeficit ||
          data.musculaireDeficit ||
          data.neuroDeficit ||
          data.respDeficit ||
          data.appui ||
          data.tugTime ||
          data.eva
      ),
    },
    { id: "plan", done: Boolean(data.objectifs.length || data.traitements.length) },
  ];

  const doneCount = steps.filter((step) => step.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);
  progressFill.style.width = `${pct}%`;
  progressLabel.textContent = `${doneCount}/${steps.length} étapes validées`;

  progressSteps.forEach((stepEl) => {
    const stepId = stepEl.dataset.step;
    const step = steps.find((item) => item.id === stepId);
    stepEl.classList.toggle("done", step?.done);
  });
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
      renderItem("Latéralité", data.lateralite),
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
      renderList("Get Up and Go", formatPairs([
        { label: "Se lever sans aide des bras", value: data.tugLeverSans },
        { label: "Se lever avec accoudoirs", value: data.tugLeverAvec },
        { label: "Se tenir debout sans aide", value: data.tugDebout },
        { label: "Monter / descendre 1 marche", value: data.tugMarche },
        { label: "Demi-tour sans toucher le mur", value: data.tugDemiTour },
        { label: "Se rassoit sans aide", value: data.tugRassoit },
      ])),
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

function radioValue(name) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value || "";
}

function checkboxValues(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((input) => input.value);
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
  return items
    .filter((item) => item.value)
    .map((item) => `${item.label}: ${item.value}`);
}

function formatAide(main, types) {
  if (!main && (!types || types.length === 0)) return "";
  if (!types || types.length === 0) return main;
  return `${main} (${types.join(", ")})`;
}

function buildPlainText(data) {
  const lines = [];
  lines.push(`Bilan kiné EHPAD - ${formatDate(data.bilanDate)}`);
  lines.push(`Patient: ${data.patientLast} ${data.patientFirst}`.trim());
  if (data.patientDob) lines.push(`Date de naissance: ${formatDate(data.patientDob)}`);
  const age = calculateAge(data.patientDob);
  if (age) lines.push(`Âge: ${age} ans`);
  if (data.chambre) lines.push(`Chambre: ${data.chambre}`);
  if (data.pathologie) lines.push(`Pathologie: ${data.pathologie}`);
  lines.push("");

  pushBlock(lines, "Latéralité", data.lateralite);
  pushBlock(lines, "Médecin prescripteur", data.medecin);
  pushBlock(lines, "Kinésithérapeute", data.kine);
  pushBlock(lines, "Date ordonnance", formatDate(data.dateOrdonnance));
  pushBlock(lines, "Nombre de séances", data.nbSeances);
  pushBlock(lines, "Fréquence", data.frequence);
  lines.push("");

  pushBlock(lines, "Bilan trophique", data.trophique);
  pushBlock(lines, "Bilan articulaire", formatDeficit(data.articulaireDeficit, data.articulaireLocalisation));
  pushBlock(lines, "Bilan musculaire", formatDeficit(data.musculaireDeficit, data.musculaireLocalisation));
  pushBlock(lines, "Bilan neurologique", formatDeficit(data.neuroDeficit, data.neuroLocalisation));
  pushBlock(lines, "Bilan respiratoire", formatResp(data.respDeficit, data.respPathologie, data.kineResp));
  pushBlock(lines, "Équilibre & marche", data.equilibreNc);
  pushList(lines, "Transferts", formatPairs(data.transferts));
  pushBlock(lines, "Appui", data.appui);
  pushBlock(lines, "Appareillage", data.appareillage);
  pushBlock(lines, "Appui bipodal", data.bipodal);
  pushBlock(lines, "Appui unipodal", data.unipodal);
  pushBlock(lines, "Périmètre de marche", data.perimetre);
  pushBlock(lines, "Boiterie", data.boiterie);
  pushBlock(lines, "Demi-tour", data.demiTour);
  pushBlock(lines, "Escaliers", data.escaliers);
  pushBlock(lines, "Nombre de marches", data.nbMarches);
  pushBlock(lines, "Aide à la marche", formatAide(data.aideMarche, data.aideMarcheType));
  pushBlock(lines, "Chute", data.chute);
  pushBlock(lines, "Relevé du sol", data.releveSol);
  pushBlock(lines, "Remarques", data.equilibreRemarques);
  lines.push("");

  pushBlock(lines, "Topographie", data.douleurTopo);
  pushBlock(lines, "Type", data.douleurType);
  pushBlock(lines, "Antalgiques", data.antalgiques);
  pushBlock(lines, "Efficacité", data.efficacite);
  pushBlock(lines, "EVA", data.evaNc ? "Pas en capacité de répondre" : data.eva);
  pushBlock(lines, "Get Up and Go", data.tugNc);
  pushBlock(lines, "Get Up and Go - Temps", data.tugTime);
  pushList(lines, "Get Up and Go", formatPairs([
    { label: "Se lever sans aide des bras", value: data.tugLeverSans },
    { label: "Se lever avec accoudoirs", value: data.tugLeverAvec },
    { label: "Se tenir debout sans aide", value: data.tugDebout },
    { label: "Monter / descendre 1 marche", value: data.tugMarche },
    { label: "Demi-tour sans toucher le mur", value: data.tugDemiTour },
    { label: "Se rassoit sans aide", value: data.tugRassoit },
  ]));
  lines.push("");

  pushList(lines, "Objectifs", data.objectifs);
  pushBlock(lines, "Autres objectifs", data.objectifsAutres);
  lines.push("");

  pushList(lines, "Traitements", data.traitements);
  pushBlock(lines, "Autres traitements", data.traitementsAutres);
  lines.push("");

  pushBlock(lines, "Proposition", data.proposition);
  pushBlock(lines, "Date", formatDate(data.propositionDate));

  return lines.join("\n").trim();
}

function pushBlock(lines, title, value) {
  if (!value) return;
  lines.push(`${title}: ${value}`);
}

function pushList(lines, title, items) {
  if (!items || items.length === 0) return;
  lines.push(`${title}:`);
  items.forEach((item) => lines.push(`- ${item}`));
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function handleSaveBilan() {
  const data = collectData();
  const title = buildBilanTitle(data);
  const entry = {
    id: `b-${Date.now()}`,
    title,
    createdAt: new Date().toISOString(),
    data,
  };

  const list = getSavedBilans();
  list.unshift(entry);
  saveBilans(list);
  renderSavedBilans();

  if (window.electronAPI?.savePdf) {
    copyStatus.textContent = "Génération du PDF en cours...";
    window.electronAPI
      .savePdf({ title })
      .then((result) => {
        if (result?.ok) {
          copyStatus.textContent = `PDF enregistré: ${result.path}`;
        } else {
          copyStatus.textContent = "PDF non enregistré.";
        }
        setTimeout(() => (copyStatus.textContent = ""), 3000);
      })
      .catch(() => {
        copyStatus.textContent = "Erreur lors de l'enregistrement PDF.";
        setTimeout(() => (copyStatus.textContent = ""), 3000);
      });
    return;
  }

  copyStatus.textContent = "Bilan enregistré.";
  setTimeout(() => (copyStatus.textContent = ""), 2000);
}

function getSavedBilans() {
  const raw = localStorage.getItem(BILANS_KEY);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (error) {
    return [];
  }
}

function saveBilans(list) {
  localStorage.setItem(BILANS_KEY, JSON.stringify(list));
}

function renderSavedBilans() {
  if (!savedBilans) return;
  const list = getSavedBilans();
  if (!list.length) {
    savedBilans.innerHTML = '<div class="note">Aucun bilan enregistré.</div>';
    return;
  }
  savedBilans.innerHTML = "";
  list.forEach((entry) => {
    const item = document.createElement("div");
    item.className = "saved-item";
    item.innerHTML = `
      <div class="saved-title">${escapeHtml(entry.title)}</div>
      <div class="saved-meta">Enregistré le ${escapeHtml(formatDate(entry.createdAt.slice(0, 10)))}</div>
      <div class="saved-actions">
        <button type="button" class="ghost" data-action="load">Ouvrir</button>
        <button type="button" class="ghost" data-action="duplicate">Dupliquer</button>
        <button type="button" class="ghost" data-action="delete">Supprimer</button>
      </div>
    `;
    item.querySelector("[data-action='load']").addEventListener("click", () => {
      loadBilan(entry.data);
    });
    item.querySelector("[data-action='duplicate']").addEventListener("click", () => {
      const clone = structuredClone(entry.data);
      clone.bilanDate = new Date().toISOString().slice(0, 10);
      loadBilan(clone);
    });
    item.querySelector("[data-action='delete']").addEventListener("click", () => {
      const updated = getSavedBilans().filter((b) => b.id !== entry.id);
      saveBilans(updated);
      renderSavedBilans();
    });
    savedBilans.appendChild(item);
  });
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
  setRadio("tug_lever_sans", data.tugLeverSans);
  setRadio("tug_lever_avec", data.tugLeverAvec);
  setRadio("tug_debout", data.tugDebout);
  setRadio("tug_marche", data.tugMarche);
  setRadio("tug_demi_tour", data.tugDemiTour);
  setRadio("tug_rassoit", data.tugRassoit);
  setRadio("proposition", data.proposition);
  setRadio("equilibre_nc", data.equilibreNc);
  setRadio("tug_nc", data.tugNc);

  setCheckboxes("aide_marche_type", data.aideMarcheType || []);
  setCheckboxes("objectifs", data.objectifs || []);
  setCheckboxes("traitements", data.traitements || []);

  saveDraft();
  updatePreview();
}

function setRadio(name, value) {
  document.querySelectorAll(`input[name=\"${name}\"]`).forEach((input) => {
    input.checked = input.value === value;
  });
}

function setCheckboxes(name, values) {
  document.querySelectorAll(`input[name=\"${name}\"]`).forEach((input) => {
    input.checked = values.includes(input.value);
  });
}
