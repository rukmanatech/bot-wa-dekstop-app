import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { Client, LocalAuth } from 'whatsapp-web.js';
import { Siswa, Pembayaran } from './models/database';
import { WhatsAppClient, SendMessageRequest, SendMessageResponse } from './types/whatsapp';

let mainWindow: BrowserWindow;
let siswaFormWindow: BrowserWindow | null = null;
let pembayaranFormWindow: BrowserWindow | null = null;

const client: WhatsAppClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true
    }
}) as WhatsAppClient;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            devTools: true
        }
    });

    mainWindow.loadFile(path.join(__dirname, '../views/index.html'));
}

function createSiswaForm() {
    if (siswaFormWindow) {
        siswaFormWindow.focus();
        return;
    }

    siswaFormWindow = new BrowserWindow({
        width: 500,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        parent: mainWindow,
        modal: true
    });

    siswaFormWindow.loadFile(path.join(__dirname, '../views/siswa-form.html'));

    siswaFormWindow.on('closed', () => {
        siswaFormWindow = null;
    });
}

function createPembayaranForm() {
    if (pembayaranFormWindow) {
        pembayaranFormWindow.focus();
        return;
    }

    pembayaranFormWindow = new BrowserWindow({
        width: 500,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        parent: mainWindow,
        modal: true
    });

    pembayaranFormWindow.loadFile(path.join(__dirname, '../views/pembayaran-form.html'));

    pembayaranFormWindow.on('closed', () => {
        pembayaranFormWindow = null;
    });
}

app.whenReady().then(async () => {
    createWindow();

    try {
        await client.initialize();
        console.log('WhatsApp client initialized successfully');
    } catch (err: any) {
        console.error('Failed to initialize WhatsApp client:', err);
        if (mainWindow) {
            mainWindow.webContents.send('initialization-error', err.message || 'Unknown error');
        }
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// WhatsApp Events
client.on('qr', (qr: string) => {
    console.log('QR Code received');
    if (mainWindow) {
        mainWindow.webContents.send('qr', qr);
    }
});

client.on('ready', () => {
    console.log('Client is ready!');
    if (mainWindow) {
        mainWindow.webContents.send('ready');
    }
});

client.on('message', async msg => {
    console.log('Message received:', msg.body);
    if (mainWindow) {
        mainWindow.webContents.send('message', {
            from: msg.from,
            body: msg.body
        });
    }
});

// Database Events
ipcMain.on('load-siswa', async (event) => {
    try {
        const siswaList = await Siswa.findAll({
            raw: true
        });
        console.log('Loaded siswa:', siswaList);
        event.reply('siswa-data', siswaList);
    } catch (error: any) {
        console.error('Error loading siswa:', error);
    }
});

ipcMain.on('load-pembayaran', async (event) => {
    try {
        const pembayaranList = await Pembayaran.findAll({
            include: [{
                model: Siswa,
                attributes: ['nis', 'nama', 'kelas', 'nomorWA']
            }],
            raw: true,
            nest: true
        });
        console.log('Loaded pembayaran:', pembayaranList);
        event.reply('pembayaran-data', pembayaranList);
    } catch (error: any) {
        console.error('Error loading pembayaran:', error);
    }
});

ipcMain.on('add-siswa', async (event, siswaData) => {
    try {
        console.log('Adding siswa data:', siswaData);
        const newSiswa = await Siswa.create(siswaData);
        console.log('Created siswa:', newSiswa);
        event.reply('siswa-saved');
        if (mainWindow) {
            mainWindow.webContents.send('reload-siswa');
        }
    } catch (error: any) {
        console.error('Error adding siswa:', error);
        event.reply('error', error.message);
    }
});

ipcMain.on('add-pembayaran', async (event, pembayaranData) => {
    try {
        const paymentData = {
            nis: pembayaranData.nis,
            bulan: pembayaranData.bulan,
            tahun: parseInt(pembayaranData.tahun),
            jumlah: parseInt(pembayaranData.jumlah),
            tanggalBayar: new Date()
        };

        console.log('Adding payment:', paymentData);
        await Pembayaran.create(paymentData);
        
        // Kirim event ke form untuk menutup
        event.reply('pembayaran-saved');
        
        // Reload data pembayaran di window utama
        const updatedPembayaranList = await Pembayaran.findAll({
            include: [{
                model: Siswa,
                attributes: ['nis', 'nama', 'kelas', 'nomorWA']
            }],
            raw: true,
            nest: true
        });
        
        if (mainWindow) {
            mainWindow.webContents.send('pembayaran-data', updatedPembayaranList);
        }

        // Kirim notifikasi WhatsApp
        const siswa = await Siswa.findByPk(paymentData.nis, { raw: true });
        if (siswa && siswa.nomorWA) {
            try {
                const tanggal = new Date().toLocaleDateString('id-ID', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                const message = `*KONFIRMASI PEMBAYARAN SPP*\n\n` +
                    `Terima kasih telah melakukan pembayaran SPP.\n\n` +
                    `Detail Pembayaran:\n` +
                    `----------------------------\n` +
                    `📝 NIS: ${siswa.nis}\n` +
                    `👤 Nama: ${siswa.nama}\n` +
                    `📚 Kelas: ${siswa.kelas}\n` +
                    `📅 Bulan: ${paymentData.bulan}\n` +
                    `📆 Tahun: ${paymentData.tahun}\n` +
                    `💰 Jumlah: Rp ${paymentData.jumlah.toLocaleString('id-ID')}\n` +
                    `⏰ Tanggal: ${tanggal}\n` +
                    `----------------------------\n\n` +
                    `Pembayaran telah dicatat dalam sistem.\n` +
                    `Simpan pesan ini sebagai bukti pembayaran.`;

                console.log('Sending WhatsApp message to:', siswa.nomorWA);
                await client.sendMessage(`${siswa.nomorWA}@c.us`, message);
                console.log('WhatsApp message sent successfully');
            } catch (whatsappError) {
                console.error('Error sending WhatsApp message:', whatsappError);
            }
        } else {
            console.log('No WhatsApp number found for student:', paymentData.nis);
        }
    } catch (error: any) {
        console.error('Error adding pembayaran:', error);
        event.reply('error', error.message);
    }
});

// Message Events
ipcMain.on('send-message', async (event, { number, message }: SendMessageRequest) => {
    try {
        const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
        await client.sendMessage(chatId, message);
        event.reply('message-sent', { success: true } as SendMessageResponse);
    } catch (error: any) {
        console.error('Failed to send message:', error);
        event.reply('message-sent', { 
            success: false, 
            error: error.message || 'Unknown error'
        } as SendMessageResponse);
    }
});

// Form Events
ipcMain.on('show-add-siswa-form', () => {
    createSiswaForm();
});

ipcMain.on('show-add-pembayaran-form', () => {
    createPembayaranForm();
});

ipcMain.on('get-siswa-list', async (event) => {
    try {
        const siswaList = await Siswa.findAll({
            raw: true,
            attributes: ['nis', 'nama', 'kelas']
        });
        console.log('Sending siswa list:', siswaList);
        event.reply('siswa-list', siswaList);
    } catch (error: any) {
        console.error('Error getting siswa list:', error);
        event.reply('error', error.message);
    }
});

ipcMain.on('delete-siswa', async (event, nis) => {
    try {
        console.log('Deleting siswa with NIS:', nis);
        const result = await Siswa.destroy({
            where: { nis: nis }
        });
        console.log('Delete result:', result);
        
        if (result === 0) {
            throw new Error('Siswa tidak ditemukan');
        }
        
        event.reply('siswa-deleted');
        if (mainWindow) {
            mainWindow.webContents.send('reload-siswa');
        }
    } catch (error: any) {
        console.error('Error deleting siswa:', error);
        event.reply('error', error.message);
    }
});

// Edit Siswa Events
ipcMain.on('edit-siswa', async (event, nis) => {
    try {
        const siswa = await Siswa.findOne({
            where: { nis: nis },
            raw: true
        });
        
        if (!siswa) {
            throw new Error('Siswa tidak ditemukan');
        }

        createSiswaForm();
        if (siswaFormWindow) {
            siswaFormWindow.webContents.on('did-finish-load', () => {
                siswaFormWindow?.webContents.send('edit-siswa-data', siswa);
            });
        }
    } catch (error: any) {
        console.error('Error editing siswa:', error);
        event.reply('error', error.message);
    }
});

ipcMain.on('update-siswa', async (event, siswaData) => {
    try {
        const result = await Siswa.update(
            {
                nis: siswaData.nis,
                nama: siswaData.nama,
                kelas: siswaData.kelas,
                nomorWA: siswaData.nomorWA
            },
            {
                where: { nis: siswaData.originalNIS }
            }
        );

        if (result[0] === 0) {
            throw new Error('Siswa tidak ditemukan');
        }

        event.reply('siswa-saved');
        if (mainWindow) {
            mainWindow.webContents.send('reload-siswa');
        }
    } catch (error: any) {
        console.error('Error updating siswa:', error);
        event.reply('error', error.message);
    }
});

// Pembayaran Events
ipcMain.on('delete-pembayaran', async (event, id) => {
    try {
        console.log('Deleting pembayaran with ID:', id);
        const result = await Pembayaran.destroy({
            where: { id: id }
        });
        console.log('Delete result:', result);
        
        if (result === 0) {
            throw new Error('Data pembayaran tidak ditemukan');
        }

        // Ambil data pembayaran terbaru
        const updatedPembayaranList = await Pembayaran.findAll({
            include: [{
                model: Siswa,
                attributes: ['nis', 'nama', 'kelas', 'nomorWA']
            }],
            raw: true,
            nest: true
        });
        
        // Kirim data terbaru ke window utama
        if (mainWindow) {
            mainWindow.webContents.send('pembayaran-data', updatedPembayaranList);
        }
        
        event.reply('pembayaran-deleted');
    } catch (error: any) {
        console.error('Error deleting pembayaran:', error);
        event.reply('error', error.message);
    }
}); 