import { Sequelize, DataTypes } from 'sequelize';
import path from 'path';
import { Siswa, Pembayaran } from './types';

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../../database.sqlite'),
    logging: false
});

// Inisialisasi Model Siswa
Siswa.init({
    nis: {
        type: DataTypes.STRING,
        primaryKey: true
    },
    nama: {
        type: DataTypes.STRING,
        allowNull: false
    },
    kelas: {
        type: DataTypes.STRING,
        allowNull: false
    },
    nomorWA: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    sequelize,
    modelName: 'Siswa'
});

// Inisialisasi Model Pembayaran
Pembayaran.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nis: {
        type: DataTypes.STRING,
        allowNull: false
    },
    bulan: {
        type: DataTypes.STRING,
        allowNull: false
    },
    tahun: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    jumlah: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('pending', 'lunas'),
        defaultValue: 'pending'
    },
    tanggalBayar: {
        type: DataTypes.DATE
    }
}, {
    sequelize,
    modelName: 'Pembayaran'
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

export {
    sequelize,
    Siswa,
    Pembayaran
}; 