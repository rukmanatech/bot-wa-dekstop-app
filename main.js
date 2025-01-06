const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { Client, LocalAuth } = require('whatsapp-web.js')

let mainWindow
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true
    }
})

function createWindow () {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            devTools: false,
            enableRemoteModule: false
        },
        autoHideMenuBar: true,
        resizable: false
    })

    mainWindow.loadFile('index.html')
    
    mainWindow.webContents.setWindowOpenHandler(() => {
        return { action: 'deny' }
    })
}

app.whenReady().then(async () => {
    createWindow()

    // Initialize WhatsApp client after window is created
    try {
        await client.initialize()
        console.log('WhatsApp client initialized successfully')
    } catch (err) {
        console.error('Failed to initialize WhatsApp client:', err)
        if (mainWindow) {
            mainWindow.webContents.send('initialization-error', err.message)
        }
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

// WhatsApp Events
client.on('qr', (qr) => {
    console.log('QR Code received')
    if (mainWindow) {
        mainWindow.webContents.send('qr', qr)
    }
})

client.on('ready', () => {
    console.log('Client is ready!')
    if (mainWindow) {
        mainWindow.webContents.send('ready')
    }
})

client.on('message', async msg => {
    console.log('Message received:', msg.body)
    if (mainWindow) {
        mainWindow.webContents.send('message', {
            from: msg.from,
            body: msg.body
        })
    }
})

client.on('disconnected', (reason) => {
    console.log('Client was disconnected:', reason)
    if (mainWindow) {
        mainWindow.webContents.send('disconnected', reason)
    }
})

// IPC Events
ipcMain.on('send-message', async (event, { number, message }) => {
    try {
        const chatId = number.includes('@c.us') ? number : `${number}@c.us`
        await client.sendMessage(chatId, message)
        event.reply('message-sent', { success: true })
    } catch (error) {
        console.error('Failed to send message:', error)
        event.reply('message-sent', { success: false, error: error.message })
    }
}) 