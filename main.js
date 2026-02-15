const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

const SETTINGS_FILE = () => path.join(app.getPath("userData"), "settings.json");

function readSettings() {
  try {
    const raw = fs.readFileSync(SETTINGS_FILE(), "utf8");
    return JSON.parse(raw);
  } catch (error) {
    return {};
  }
}

function writeSettings(settings) {
  fs.writeFileSync(SETTINGS_FILE(), JSON.stringify(settings, null, 2));
}

async function ensureSaveDir(win) {
  const settings = readSettings();
  if (settings.saveDir && fs.existsSync(settings.saveDir)) return settings.saveDir;

  const result = await dialog.showOpenDialog(win, {
    title: "Choisir un dossier pour enregistrer les bilans",
    properties: ["openDirectory"],
  });

  if (!result.canceled && result.filePaths[0]) {
    settings.saveDir = result.filePaths[0];
    writeSettings(settings);
    return settings.saveDir;
  }

  const fallback = path.join(app.getPath("documents"), "Bilans Kine");
  fs.mkdirSync(fallback, { recursive: true });
  settings.saveDir = fallback;
  writeSettings(settings);
  return settings.saveDir;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    backgroundColor: "#f8f5ef",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });

  win.loadFile(path.join(__dirname, "index.html"));
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("save-bilan-pdf", async (event, payload) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const saveDir = await ensureSaveDir(win);
  const title = payload?.title || "bilan";
  const safeTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
  const filename = `${safeTitle || "bilan"}-${Date.now()}.pdf`;
  const filePath = path.join(saveDir, filename);

  const pdfData = await win.webContents.printToPDF({
    printBackground: true,
    pageSize: "A4",
    margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
  });

  fs.writeFileSync(filePath, pdfData);
  return { ok: true, path: filePath };
});

ipcMain.handle("select-save-dir", async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win, {
    title: "Choisir un dossier pour enregistrer les bilans",
    properties: ["openDirectory"],
  });
  if (result.canceled || !result.filePaths[0]) return { ok: false };
  const settings = readSettings();
  settings.saveDir = result.filePaths[0];
  writeSettings(settings);
  return { ok: true, path: settings.saveDir };
});
