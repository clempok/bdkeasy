const DRAFT_KEY = "clempo_quote_draft_v1";

const fields = {
  sellerName: document.getElementById("seller-name"),
  sellerContact: document.getElementById("seller-contact"),
  sellerLegal: document.getElementById("seller-legal"),
  sellerWebsite: document.getElementById("seller-website"),
  sellerEmail: document.getElementById("seller-email"),
  sellerPhone: document.getElementById("seller-phone"),
  sellerAddress: document.getElementById("seller-address"),
  logoUrl: document.getElementById("logo-url"),
  clientCompany: document.getElementById("client-company"),
  clientContact: document.getElementById("client-contact"),
  clientEmail: document.getElementById("client-email"),
  clientPhone: document.getElementById("client-phone"),
  clientAddress: document.getElementById("client-address"),
  clientVat: document.getElementById("client-vat"),
  quoteNumber: document.getElementById("quote-number"),
  quoteStatus: document.getElementById("quote-status"),
  quoteDate: document.getElementById("quote-date"),
  quoteValidity: document.getElementById("quote-validity"),
  currency: document.getElementById("currency"),
  taxRate: document.getElementById("tax-rate"),
  discountValue: document.getElementById("discount-value"),
  discountType: document.getElementById("discount-type"),
  projectTitle: document.getElementById("project-title"),
  intro: document.getElementById("intro"),
  notes: document.getElementById("notes"),
  terms: document.getElementById("terms"),
  signatureName: document.getElementById("signature-name"),
  signatureTitle: document.getElementById("signature-title"),
};

const form = document.getElementById("quote-form");
const itemsRows = document.getElementById("items-rows");
const itemTemplate = document.getElementById("item-row-template");
const addItemBtn = document.getElementById("add-item");

const preview = document.getElementById("preview");
const copyBtn = document.getElementById("copy-btn");
const resetBtn = document.getElementById("reset-btn");
const printBtn = document.getElementById("print-btn");
const copyStatus = document.getElementById("copy-status");

const totalsUi = {
  subtotal: document.getElementById("subtotal-value"),
  discount: document.getElementById("discount-total"),
  tax: document.getElementById("tax-total"),
  total: document.getElementById("total-value"),
};

init();

function init() {
  bindInputs();
  hydrateDraft();
  ensureItemRow();
  setDefaults();
  updateAll();
}

function bindInputs() {
  form.addEventListener("input", handleChange);
  form.addEventListener("change", handleChange);

  itemsRows.addEventListener("click", (event) => {
    if (!event.target.matches("[data-remove]")) return;
    const row = event.target.closest("[data-item]");
    if (row) {
      row.remove();
      ensureItemRow();
      updateAll();
    }
  });

  addItemBtn.addEventListener("click", () => {
    addItemRow({ qty: 1 });
    updateAll();
  });

  copyBtn.addEventListener("click", handleCopy);
  resetBtn.addEventListener("click", handleReset);
  printBtn.addEventListener("click", () => window.print());
}

function setDefaults() {
  const today = new Date();
  if (fields.quoteDate && !fields.quoteDate.value) {
    fields.quoteDate.value = toIsoDate(today);
  }
  if (fields.quoteValidity && !fields.quoteValidity.value) {
    fields.quoteValidity.value = toIsoDate(addDays(today, 30));
  }
  if (fields.taxRate && !fields.taxRate.value) {
    fields.taxRate.value = "20";
  }
  if (fields.quoteNumber && !fields.quoteNumber.value) {
    fields.quoteNumber.value = `DV-${today.getFullYear()}-001`;
  }
}

function ensureItemRow() {
  if (!itemsRows.querySelector("[data-item]")) {
    addItemRow({ qty: 1 });
  }
}

function addItemRow(data = {}) {
  const node = itemTemplate.content.firstElementChild.cloneNode(true);
  const name = node.querySelector('[data-field="name"]');
  const description = node.querySelector('[data-field="description"]');
  const qty = node.querySelector('[data-field="qty"]');
  const unit = node.querySelector('[data-field="unit"]');
  const price = node.querySelector('[data-field="price"]');

  if (name && data.name) name.value = data.name;
  if (description && data.description) description.value = data.description;
  if (qty && data.qty != null) qty.value = data.qty;
  if (unit && data.unit) unit.value = data.unit;
  if (price && data.price != null) price.value = data.price;

  itemsRows.appendChild(node);
}

function handleChange() {
  updateAll();
}

function updateAll() {
  const data = collectData();
  updateTotalsUi(data);
  preview.innerHTML = buildPreviewHtml(data);
  saveDraft();
}

function collectData() {
  const currency = fields.currency.value || "EUR";
  const items = collectItems(currency);
  const visibleItems = items.filter(
    (item) => item.name || item.description || item.price > 0 || item.total > 0
  );
  const subtotal = visibleItems.reduce((sum, item) => sum + item.total, 0);
  const discountValue = parseNumber(fields.discountValue.value);
  const discountType = fields.discountType.value;
  let discount = 0;
  if (discountType === "percent") {
    discount = subtotal * (discountValue / 100);
  } else {
    discount = discountValue;
  }
  discount = Math.min(discount, subtotal);
  const taxable = Math.max(0, subtotal - discount);
  const taxRate = parseNumber(fields.taxRate.value);
  const tax = taxable * (taxRate / 100);
  const total = taxable + tax;

  return {
    sellerName: fields.sellerName.value.trim(),
    sellerContact: fields.sellerContact.value.trim(),
    sellerLegal: fields.sellerLegal.value.trim(),
    sellerWebsite: fields.sellerWebsite.value.trim(),
    sellerEmail: fields.sellerEmail.value.trim(),
    sellerPhone: fields.sellerPhone.value.trim(),
    sellerAddress: fields.sellerAddress.value.trim(),
    logoUrl: fields.logoUrl.value.trim(),
    clientCompany: fields.clientCompany.value.trim(),
    clientContact: fields.clientContact.value.trim(),
    clientEmail: fields.clientEmail.value.trim(),
    clientPhone: fields.clientPhone.value.trim(),
    clientAddress: fields.clientAddress.value.trim(),
    clientVat: fields.clientVat.value.trim(),
    quoteNumber: fields.quoteNumber.value.trim(),
    quoteStatus: fields.quoteStatus.value.trim(),
    quoteDate: fields.quoteDate.value,
    quoteValidity: fields.quoteValidity.value,
    currency,
    taxRate,
    discountValue,
    discountType,
    projectTitle: fields.projectTitle.value.trim(),
    intro: fields.intro.value.trim(),
    notes: fields.notes.value.trim(),
    terms: fields.terms.value.trim(),
    signatureName: fields.signatureName.value.trim(),
    signatureTitle: fields.signatureTitle.value.trim(),
    items: visibleItems,
    subtotal,
    discount,
    tax,
    total,
  };
}

function collectItems(currency) {
  return Array.from(itemsRows.querySelectorAll("[data-item]")).map((row) => {
    const name = getRowValue(row, "name");
    const description = getRowValue(row, "description");
    const qty = parseNumber(getRowValue(row, "qty"));
    const unit = getRowValue(row, "unit");
    const price = parseNumber(getRowValue(row, "price"));
    const total = qty * price;
    const totalEl = row.querySelector('[data-field="total"]');
    if (totalEl) {
      totalEl.textContent = formatMoney(total, currency);
    }
    return {
      name,
      description,
      qty,
      unit,
      price,
      total,
    };
  });
}

function getRowValue(row, field) {
  const input = row.querySelector(`[data-field="${field}"]`);
  return input ? input.value.trim() : "";
}

function updateTotalsUi(data) {
  totalsUi.subtotal.textContent = formatMoney(data.subtotal, data.currency);
  totalsUi.discount.textContent = formatMoney(data.discount, data.currency);
  totalsUi.tax.textContent = formatMoney(data.tax, data.currency);
  totalsUi.total.textContent = formatMoney(data.total, data.currency);
}

function saveDraft() {
  const payload = {};
  Object.entries(fields).forEach(([key, field]) => {
    if (!field) return;
    payload[key] = field.value;
  });
  payload.items = Array.from(itemsRows.querySelectorAll("[data-item]")).map((row) => ({
    name: getRowValue(row, "name"),
    description: getRowValue(row, "description"),
    qty: getRowValue(row, "qty"),
    unit: getRowValue(row, "unit"),
    price: getRowValue(row, "price"),
  }));
  localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
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

    itemsRows.innerHTML = "";
    if (Array.isArray(draft.items) && draft.items.length) {
      draft.items.forEach((item) => addItemRow(item));
    }
  } catch (error) {
    localStorage.removeItem(DRAFT_KEY);
  }
}

function handleCopy() {
  const data = collectData();
  const text = buildPlainText(data);
  if (!text.trim()) {
    copyStatus.textContent = "Aucun contenu à copier.";
    return;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        copyStatus.textContent = "Devis copié dans le presse-papiers.";
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
  copyStatus.textContent = "Devis copié dans le presse-papiers.";
  setTimeout(() => (copyStatus.textContent = ""), 2000);
}

function handleReset() {
  const confirmed = window.confirm("Réinitialiser ce devis ?");
  if (!confirmed) return;
  Object.values(fields).forEach((field) => {
    if (!field) return;
    if (field.tagName === "SELECT") {
      field.selectedIndex = 0;
    } else {
      field.value = "";
    }
  });
  itemsRows.innerHTML = "";
  localStorage.removeItem(DRAFT_KEY);
  ensureItemRow();
  setDefaults();
  updateAll();
}

function buildPreviewHtml(data) {
  const logoHtml = renderLogo(data.logoUrl, data.sellerName);
  const introBlock = data.intro ? renderBlock("Résumé", data.intro) : "";
  const notesBlock = data.notes ? renderBlock("Notes", data.notes) : "";
  const termsBlock = data.terms ? renderBlock("Conditions", data.terms) : "";
  const signatureBlock = renderSignature(data.signatureName, data.signatureTitle);
  const itemsHtml = renderItemsTable(data);
  const footerLine = [data.sellerEmail, data.sellerWebsite, data.sellerPhone]
    .filter(Boolean)
    .join(" · ");

  return `
    <div class="preview-doc">
      <div class="preview-top">
        <div class="preview-brand">
          ${logoHtml}
          <div>
            <strong>${escapeHtml(data.sellerName || "Votre société")}</strong>
            <div class="preview-meta">
              ${renderMetaLine("Contact", data.sellerContact)}
              ${renderMetaLine("Email", data.sellerEmail)}
              ${renderMetaLine("Téléphone", data.sellerPhone)}
            </div>
          </div>
        </div>
        <div class="preview-title">
          <h1>Devis</h1>
          <p>${escapeHtml(data.projectTitle || "Proposition commerciale")}</p>
          <div class="preview-meta">
            ${renderMetaLine("Numéro", data.quoteNumber || "-")}
            ${renderMetaLine("Statut", data.quoteStatus || "-")}
            ${renderMetaLine("Date", formatDate(data.quoteDate) || "-")}
            ${renderMetaLine("Validité", formatDate(data.quoteValidity) || "-")}
          </div>
        </div>
      </div>

      <div class="preview-parties">
        <div class="party-card">
          <div class="party-title">Émetteur</div>
          ${renderPartyLine(data.sellerName)}
          ${renderPartyLine(data.sellerAddress)}
          ${renderPartyLine(data.sellerLegal ? `SIRET/TVA: ${data.sellerLegal}` : "")}
          ${renderPartyLine(data.sellerWebsite ? `Site: ${data.sellerWebsite}` : "")}
        </div>
        <div class="party-card">
          <div class="party-title">Client</div>
          ${renderPartyLine(data.clientCompany)}
          ${renderPartyLine(data.clientContact)}
          ${renderPartyLine(data.clientAddress)}
          ${renderPartyLine(data.clientVat ? `TVA: ${data.clientVat}` : "")}
        </div>
      </div>

      ${introBlock}

      ${itemsHtml}

      <div class="preview-totals">
        <div class="totals-box">
          <div class="totals-line"><span>Sous-total HT</span><strong>${formatMoney(data.subtotal, data.currency)}</strong></div>
          <div class="totals-line"><span>Remise</span><strong>${formatMoney(data.discount, data.currency)}</strong></div>
          <div class="totals-line"><span>TVA (${data.taxRate || 0}%)</span><strong>${formatMoney(data.tax, data.currency)}</strong></div>
          <div class="totals-line total"><span>Total TTC</span><strong>${formatMoney(data.total, data.currency)}</strong></div>
        </div>
      </div>

      ${notesBlock}
      ${termsBlock}
      ${signatureBlock}

      <div class="preview-footer">${escapeHtml(footerLine || "Merci pour votre confiance")}</div>
    </div>
  `;
}

function renderLogo(url, name) {
  const safeUrl = isValidUrl(url) ? escapeAttribute(url) : "";
  const initials = (name || "C").trim().slice(0, 2).toUpperCase();
  if (!safeUrl) {
    return `<div class="preview-logo">${escapeHtml(initials)}</div>`;
  }
  return `<div class="preview-logo"><img src="${safeUrl}" alt="Logo" /></div>`;
}

function renderMetaLine(label, value) {
  if (!value) return "";
  return `<div><span>${escapeHtml(label)}</span>${escapeHtml(value)}</div>`;
}

function renderPartyLine(value) {
  if (!value) return "";
  return `<p>${escapeHtml(value).replace(/\n/g, "<br />")}</p>`;
}

function renderBlock(title, content) {
  return `
    <div class="preview-block">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(content).replace(/\n/g, "<br />")}</p>
    </div>
  `;
}

function renderSignature(name, title) {
  if (!name && !title) return "";
  return `
    <div class="preview-block">
      <h3>Signature</h3>
      <p>${escapeHtml(name || "")}${title ? ` · ${escapeHtml(title)}` : ""}</p>
      <div class="signature-line"></div>
    </div>
  `;
}

function renderItemsTable(data) {
  const rows = data.items
    .map(
      (item) => `
        <tr>
          <td>
            <strong>${escapeHtml(item.name || "Prestation")}</strong>
            ${item.description ? `<div class="note">${escapeHtml(item.description)}</div>` : ""}
          </td>
          <td>${escapeHtml(String(item.qty || 0))}</td>
          <td>${escapeHtml(item.unit || "-")}</td>
          <td>${formatMoney(item.price, data.currency)}</td>
          <td>${formatMoney(item.total, data.currency)}</td>
        </tr>
      `
    )
    .join("");

  const emptyRow = `
    <tr>
      <td colspan="5" class="note">Ajoutez des lignes pour calculer le devis.</td>
    </tr>
  `;

  return `
    <table class="preview-table">
      <thead>
        <tr>
          <th>Désignation</th>
          <th>Qté</th>
          <th>Unité</th>
          <th>Prix unitaire</th>
          <th>Total HT</th>
        </tr>
      </thead>
      <tbody>
        ${rows || emptyRow}
      </tbody>
    </table>
  `;
}

function buildPlainText(data) {
  const lines = [];
  lines.push(`DEVIS ${data.quoteNumber || ""}`.trim());
  lines.push(`Date: ${formatDate(data.quoteDate) || "-"}`);
  lines.push(`Validité: ${formatDate(data.quoteValidity) || "-"}`);
  if (data.projectTitle) lines.push(`Objet: ${data.projectTitle}`);
  lines.push("");
  lines.push(`Émetteur: ${data.sellerName || "-"}`);
  if (data.sellerContact) lines.push(`Contact: ${data.sellerContact}`);
  if (data.sellerEmail) lines.push(`Email: ${data.sellerEmail}`);
  if (data.sellerPhone) lines.push(`Téléphone: ${data.sellerPhone}`);
  if (data.sellerAddress) lines.push(`Adresse: ${data.sellerAddress}`);
  lines.push("");
  lines.push(`Client: ${data.clientCompany || "-"}`);
  if (data.clientContact) lines.push(`Contact: ${data.clientContact}`);
  if (data.clientEmail) lines.push(`Email: ${data.clientEmail}`);
  if (data.clientPhone) lines.push(`Téléphone: ${data.clientPhone}`);
  if (data.clientAddress) lines.push(`Adresse: ${data.clientAddress}`);
  lines.push("");
  lines.push("Lignes:");
  data.items.forEach((item) => {
    const label = item.name || "Prestation";
    const qty = item.qty || 0;
    const unit = item.unit ? ` ${item.unit}` : "";
    lines.push(`- ${label} (${qty}${unit}) : ${formatMoney(item.total, data.currency)}`);
  });
  lines.push("");
  lines.push(`Sous-total HT: ${formatMoney(data.subtotal, data.currency)}`);
  lines.push(`Remise: ${formatMoney(data.discount, data.currency)}`);
  lines.push(`TVA (${data.taxRate || 0}%): ${formatMoney(data.tax, data.currency)}`);
  lines.push(`Total TTC: ${formatMoney(data.total, data.currency)}`);
  if (data.notes) {
    lines.push("");
    lines.push(`Notes: ${data.notes}`);
  }
  if (data.terms) {
    lines.push("");
    lines.push(`Conditions: ${data.terms}`);
  }
  return lines.join("\n").trim();
}

function parseNumber(value) {
  const cleaned = String(value || "").replace(/\s/g, "").replace(",", ".");
  const parsed = Number.parseFloat(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatMoney(value, currency) {
  const safeCurrency = currency || "EUR";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: safeCurrency,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatDate(value) {
  if (!value) return "";
  const parts = value.split("-");
  if (parts.length !== 3) return value;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isValidUrl(value) {
  if (!value) return false;
  if (value.startsWith("data:image")) return true;
  try {
    new URL(value);
    return true;
  } catch (error) {
    return false;
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}
