import { Model } from 'sequelize';

// Interface untuk Siswa
export interface ISiswa {
    nis: string;
    nama: string;
    kelas: string;
    nomorWA: string;
}

// Interface untuk Pembayaran
export interface IPembayaran {
    id?: number;
    nis: string;
    bulan: string;
    tahun: number;
    jumlah: number;
    status: 'pending' | 'lunas';
    tanggalBayar: Date;
}

// Model class untuk Siswa
export class Siswa extends Model implements ISiswa {
    public nis!: string;
    public nama!: string;
    public kelas!: string;
    public nomorWA!: string;

    // Timestamps
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    // Asosiasi
    public readonly Pembayaran?: IPembayaran[];
}

// Model class untuk Pembayaran
export class Pembayaran extends Model implements IPembayaran {
    public id!: number;
    public nis!: string;
    public bulan!: string;
    public tahun!: number;
    public jumlah!: number;
    public status!: 'pending' | 'lunas';
    public tanggalBayar!: Date;

    // Timestamps
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    // Asosiasi
    public readonly Siswa?: ISiswa;
} 