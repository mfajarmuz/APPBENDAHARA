const { contextBridge, ipcRenderer } = require('electron');

// Expose API yang bisa dipanggil dari React Frontend lewat `window.api`
contextBridge.exposeInMainWorld('api', {
  // Program & Kegiatan
  updateProgram: (id, payload) => ipcRenderer.invoke('update-program', id, payload),
  updateKegiatan: (id, payload) => ipcRenderer.invoke('update-kegiatan', id, payload),

  // Sub Kegiatan
  getSubKegiatan: () => ipcRenderer.invoke('get-sub-kegiatan'),
  addSubKegiatan: (payload) => ipcRenderer.invoke('add-sub-kegiatan', payload),
  updateSubKegiatan: (payload) => ipcRenderer.invoke('update-sub-kegiatan', payload),
  deleteSubKegiatan: (id) => ipcRenderer.invoke('delete-sub-kegiatan', id),
  
  // Kode Rekening
  getKodeRekening: (subKegiatanId) => ipcRenderer.invoke('get-kode-rekening', subKegiatanId),
  addKodeRekening: (payload) => ipcRenderer.invoke('add-kode-rekening', payload),
  updateKodeRekening: (payload) => ipcRenderer.invoke('update-kode-rekening', payload),
  deleteKodeRekening: (id) => ipcRenderer.invoke('delete-kode-rekening', id),

  // Penerimaan
  getPenerimaan: () => ipcRenderer.invoke('get-penerimaan'),
  addPenerimaan: (payload) => ipcRenderer.invoke('add-penerimaan', payload),
  updatePenerimaan: (payload) => ipcRenderer.invoke('update-penerimaan', payload),
  deletePenerimaan: (id) => ipcRenderer.invoke('delete-penerimaan', id),

  // Pengeluaran
  getPengeluaran: () => ipcRenderer.invoke('get-pengeluaran'),
  addPengeluaran: (payload) => ipcRenderer.invoke('add-pengeluaran', payload),
  updatePengeluaran: (id, payload) => ipcRenderer.invoke('update-pengeluaran', id, payload),
  deletePengeluaran: (id) => ipcRenderer.invoke('delete-pengeluaran', id),

  // Auto-updater
  checkForUpdate: () => ipcRenderer.invoke('check-for-update'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  onUpdateMessage: (callback) => ipcRenderer.on('update-message', (event, ...args) => callback(...args)),
});
