const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  savePdf: (payload) => ipcRenderer.invoke("save-bilan-pdf", payload),
  selectSaveDir: () => ipcRenderer.invoke("select-save-dir"),
});
