const { Sequelize } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../database.sqlite'),
    logging: false
});

// Model Siswa
const Siswa = sequelize.define('Siswa', {
    nis: {
        type: Sequelize.STRING,
        primaryKey: true
    },
    nama: {
        type: Sequelize.STRING,
        allowNull: false
    },
    kelas: {
        type: Sequelize.STRING,
        allowNull: false
    },
    nomorWA: {
        type: Sequelize.STRING,
        allowNull: false
    }
});

// Model Pembayaran
const Pembayaran = sequelize.define('Pembayaran', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nis: {
        type: Sequelize.STRING,
        allowNull: false
    },
    bulan: {
        type: Sequelize.STRING,
        allowNull: false
    },
    tahun: {
        type: Sequelize.INTEGER,
        allowNull: false
    },
    jumlah: {
        type: Sequelize.FLOAT,
        allowNull: false
    },
    status: {
        type: Sequelize.ENUM('pending', 'lunas'),
        defaultValue: 'pending'
    },
    tanggalBayar: {
        type: Sequelize.DATE
    }
});

// Relasi
Pembayaran.belongsTo(Siswa, { foreignKey: 'nis' });
Siswa.hasMany(Pembayaran, { foreignKey: 'nis' });

// Sync database
sequelize.sync()
    .then(() => {
        console.log('Database & tables created!');
    })
    .catch(err => {
        console.error('Error creating database:', err);
    });

module.exports = {
    sequelize,
    Siswa,
    Pembayaran
}; 