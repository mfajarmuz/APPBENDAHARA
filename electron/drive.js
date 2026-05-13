const { google } = require('googleapis')
const path = require('path')
const fs = require('fs')
const { app } = require('electron')

let driveInstance = null

/**
 * Menginisialisasi modul Google Drive menggunakan Service Account.
 */
function initDrive() {
  try {
    const isDev = !app.isPackaged
    // Mencari berkas service-account.json di root folder
    const credentialsPath = isDev
      ? path.join(__dirname, '../service-account.json')
      : path.join(process.resourcesPath, 'service-account.json')

    if (!fs.existsSync(credentialsPath)) {
      throw new Error(`Berkas kredensial 'service-account.json' tidak ditemukan. Pastikan berkas diletakkan di direktori aplikasi. Path dicari: ${credentialsPath}`)
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.metadata.readonly'],
    })

    driveInstance = google.drive({ version: 'v3', auth })
    return driveInstance
  } catch (error) {
    console.error('Google Drive Init Error:', error.message)
    throw error
  }
}

/**
 * Melakukan tes koneksi ke Google Drive untuk memvalidasi otorisasi.
 */
async function testConnection() {
  try {
    const drive = driveInstance || initDrive()
    
    // Lakukan query daftar file sederhana untuk memastikan token aktif
    const response = await drive.files.list({
      pageSize: 1,
      fields: 'files(id, name)',
    })
    
    return {
      success: true,
      authorized: true,
      message: 'Koneksi Google Drive API Berhasil Terhubung!',
      filesCount: response.data.files ? response.data.files.length : 0
    }
  } catch (error) {
    console.error('Google Drive Connection Test Failed:', error.message)
    return {
      success: false,
      authorized: false,
      error: error.message
    }
  }
}

module.exports = {
  initDrive,
  testConnection
}
