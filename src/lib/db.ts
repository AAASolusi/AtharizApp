import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  getDocFromServer 
} from "firebase/firestore";
import { User, Customer, Jobcard, UserRole, SecurityLog } from "../types";
import firebaseConfigJson from "../../firebase-applet-config.json";

// Firebase Configuration via JSON with env fallback
const firebaseConfig = {
  apiKey: firebaseConfigJson?.apiKey || (import.meta as any).env?.VITE_FIREBASE_API_KEY,
  authDomain: firebaseConfigJson?.authDomain || (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: firebaseConfigJson?.projectId || (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID,
  storageBucket: firebaseConfigJson?.storageBucket || (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: firebaseConfigJson?.messagingSenderId || (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: firebaseConfigJson?.appId || (import.meta as any).env?.VITE_FIREBASE_APP_ID,
};

const isFirebaseConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.authDomain
);

let db: any = null;
let auth: any = null;
let isFirebaseActive = false;

if (isFirebaseConfigured) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const dbId = (firebaseConfigJson as any)?.firestoreDatabaseId;
    db = dbId ? getFirestore(app, dbId) : getFirestore(app);
    auth = getAuth(app);
    isFirebaseActive = true;
    console.log("Firebase initialized successfully. Running in Cloud Database mode.");
  } catch (error) {
    console.error("Firebase initialization failed, falling back to LocalStorage:", error);
    isFirebaseActive = false;
  }
} else {
  console.log("Firebase configuration is incomplete. Running in LocalStorage mode.");
}

export { db, auth, isFirebaseActive };

// Generic timeout helper for Firestore operations to avoid hanging on slow network or iframes
const withTimeout = <T>(promise: Promise<T>, ms = 10000): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Timeout: Database server did not respond in time."));
    }, ms);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

// Helper to recursively remove undefined properties before saving to Firestore
const cleanObject = (obj: any): any => {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanObject).filter(item => item !== undefined);
  }
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      result[key] = cleanObject(val);
    }
  }
  return result;
};

// --- Seed Data ---

const defaultUsers: User[] = [
  {
    id: "user-superadmin",
    username: "superadm",
    fullName: "Super Admin",
    passwordHash: "Akmall1627",
    role: UserRole.SUPER_ADMIN,
    isDefaultPassword: false
  },
  {
    id: "user-admin",
    username: "admin",
    fullName: "Agung Setiawan",
    passwordHash: "admin", // Simple for local proto, will match reset behavior
    role: UserRole.ADMIN,
    phone: "+628123456789",
    isDefaultPassword: false
  },
  {
    id: "user-tech-1",
    username: "wahyono",
    fullName: "wahyono",
    passwordHash: "wahyono",
    role: UserRole.TECHNICIAN,
    phone: "+6281574757617",
    isDefaultPassword: true // Forces password change on first login because username = password
  },
  {
    id: "user-cust-1",
    username: "ciomas",
    fullName: "BNI CIOMAS",
    passwordHash: "ciomas",
    role: UserRole.CUSTOMER,
    customerOutlet: "BNI CIOMAS",
    customerWilayah: "BOGOR",
    isDefaultPassword: true
  }
];

const defaultCustomers: Customer[] = [
  { id: "c-1", wilayah: "BSD", outlet: "KCP LIPPO", alamat: "PERTOKOAN PINANGSIA BLOK L N0 1 KARAWACI Kota Tangerang, Banten - 15811" },
  { id: "c-2", wilayah: "BSD", outlet: "KCP CIKUPA", alamat: "Jl. Raya Serang Km. 14,5 No. 29-30, Cikupa, Tangerang, Banten, Indonesia" },
  { id: "c-3", wilayah: "BSD", outlet: "BNI KCP SUTERA NIAGA", alamat: "Ruko Jalur Sutera, Jl. Raya Serpong No.KM. 8 Kav. 29D No. 15, Pakulonan, Kec. Serpong Utara, Kota Tangerang Selatan, Banten 15325" },
  { id: "c-4", wilayah: "BSD", outlet: "BNI KCP BALARAJA", alamat: "Jalan Raya Serang KM. 22, Desa Kawidaran, Balaraja, Cibadak, Kec. Cikupa, Kabupaten Tangerang, Banten 15710" },
  { id: "c-5", wilayah: "BSD", outlet: "BNI KCP CILEDUG", alamat: "Jl. HOS Cokroaminoto Blok D No. 31, Pertokoan Anugerah, Ciledug, Sudimara Bar., Tangerang, Kota Tangerang, Banten 15151, Indonesia" },
  { id: "c-6", wilayah: "BSD", outlet: "BNI KCP GADING SERPONG", alamat: "Ruko Jl. Alexandrite Utara No.1, RW.2, Pakulonan Bar., Kec. Klp. Dua, Kabupaten Tangerang, Banten 15810" },
  { id: "c-7", wilayah: "BSD", outlet: "BNI KCP PAHLAWAN SERIBU", alamat: "Ruko BSD Sektor 7, Jl. Pahlawan Seribu No.12 No. 10, Lengkong Wetan, Kec. Serpong, Kota Tangerang Selatan, Banten 15310" },
  { id: "c-8", wilayah: "BSD", outlet: "BNI KCP PASAR MODERN BSD", alamat: "Ruko Madrid I BSD CITY, Jl. Letnan Sutopo Blok C No.1 & 2, Rw. Mekar Jaya, Kec. Serpong, Kota Tangerang Selatan, Banten 15321" },
  { id: "c-9", wilayah: "BSD", outlet: "BNI KCP PALEM SEMI", alamat: "Ruko Madrid, Jl. Palem Raja Raya No.10-11, RT.001/RW.004, Panunggangan Bar., Kec. Cibodas, Kota Tangerang, Banten 15138" },
  { id: "c-10", wilayah: "BSD", outlet: "BNI KCP BINTARO 1", alamat: "Jl. Bintaro Utama 3A No.48 Blok D, Pd. Karya, Kec. Pd. Aren, Kota Tangerang Selatan, Banten 15224" },
  { id: "c-11", wilayah: "BSD", outlet: "BNI KCP MENTENG BINTARO", alamat: "RUKO SENTRA MENTENG BLOK MN NO. 27, Pd. Jaya, KOTA, Kota Tangerang Selatan, Banten 15520" },
  { id: "c-12", wilayah: "BSD", outlet: "BNI KCP LARANGAN", alamat: "RT.002/RW.002, North Larangan, Larangan, Tangerang City, Banten 15154" },
  { id: "c-13", wilayah: "BSD", outlet: "BNI KK RS SILOAM KARAWACI", alamat: "Jl. Siloam No. 6, Lippo Karawaci, Bencongan, Kec. Tangerang, Kabupaten Tangerang, Banten 15811" },
  { id: "c-14", wilayah: "BSD", outlet: "BNI KK GRAHA RAYA", alamat: "Ruko Venice Arcade Blok JE No.15, Graha Raya Bintaro, Jl. Boulevard Graha Raya Blok JE No.15, Paku Jaya, Kec. Serpong Utara, Kota Tangerang Selatan, Banten 15324" },
  { id: "c-15", wilayah: "BSD", outlet: "BNI KK ALAM SUTERA", alamat: "Apartement Brooklyn B/RA07, Jl. Alam Sutera Boulevard, Pakulonan, Kec. Serpong Utara, Kota Tangerang Selatan, Banten 15325" },
  { id: "c-16", wilayah: "BSD", outlet: "BNI KK GOLDEN VIENA", alamat: "Ruko Golden Vienna, Rw. Buntu, Kec. Serpong, Kota Tangerang Selatan, Banten 15318" },
  { id: "c-17", wilayah: "BSD", outlet: "BNI KK AEON MALL", alamat: "AEON MALL, Jl. BSD Raya Utama, Pagedangan, Kec. Pagedangan, Kabupaten Tangerang, Banten 15345" },
  { id: "c-18", wilayah: "BSD", outlet: "BNI KK NORTRIDGE", alamat: "Ruko Northridge Business Center Blok B2/11, Jl. BSD Raya Utama, Kel. Lengkong Kulon, Kec. Pagedangan, Kabupaten Tangerang" },
  { id: "c-19", wilayah: "BSD", outlet: "BNI KC BSD", alamat: "l. Pahlawan Seribu No.5, Lengkong Gudang, Kec. Serpong, Kota Tangerang Selatan, Banten 15310" },
  { id: "c-20", wilayah: "BOGOR", outlet: "BNI CILUAR", alamat: "Jl. Raya Ciluar No.20a, RT.04/RW.01 Ciluar, Kec. Bogor Utara, Kota Bogor, Jawa Barat 16157" },
  { id: "c-21", wilayah: "BOGOR", outlet: "BNI CIOMAS", alamat: "Jl. Raya Laladon Ciomas Rahayu, Kec. Ciomas Kabupaten Bogor, Jawa Barat 16610" },
  { id: "c-22", wilayah: "BOGOR", outlet: "BNI CISARUA", alamat: "Jl. Raya Puncak, RT.004/RW.03, Cisarua, Kec. Cisarua, Kabupaten Bogor, Jawa Barat 16750" },
  { id: "c-23", wilayah: "BOGOR", outlet: "BNI DRAMAGA", alamat: "Kampus Institut Pertanian Bogor, Babakan, Kec. Dramaga, Kabupaten Bogor, Jawa Barat 16810" },
  { id: "c-24", wilayah: "BOGOR", outlet: "BNI KCU BOGOR", alamat: "Jl. Ir. H. Juanda No.52, RT.01/RW.07, Paledang, Kecamatan Bogor Tengah, Kota Bogor, Jawa Barat 16122" },
  { id: "c-25", wilayah: "BOGOR", outlet: "BNI LEUWILIANG", alamat: "Jl. Raya Leuwiliang - Bogor, Leuwimekar, Kec. Leuwiliang, Kabupaten Bogor,Jawa Barat 16640" },
  { id: "c-26", wilayah: "BOGOR", outlet: "BNI MERDEKA", alamat: "Jl. Merdeka No.84 Ciwaringin Bogor Tengah Kebon Kelapa, RT.01/RW.02, Ciwaringin, Kecamatan Bogor Tengah, Kota Bogor, Jawa Barat 16125" },
  { id: "c-27", wilayah: "BOGOR", outlet: "BNI PADJAJARAN", alamat: "Jl. Raya Pajajaran No.20, RT.01/RW.04, Babakan, Kecamatan Bogor Tengah, Kota Bogor, Jawa Barat 16128" },
  { id: "c-28", wilayah: "BOGOR", outlet: "BNI UNIV PAKUAN", alamat: "Jl. Pakuan, RT.02/RW.06, Tegallega, Kecamatan Bogor Tengah, Kota Bogor, Jawa Barat 16129" },
  { id: "c-29", wilayah: "BOGOR", outlet: "BNI PS ANYAR", alamat: "Jl. Sawojajar No.1, RT.02/RW.04, Pabaton, Kecamatan Bogor Tengah, Kota Bogor, Jawa Barat 16124" },
  { id: "c-30", wilayah: "BOGOR", outlet: "BNI SUDIRMAN", alamat: "Jl. Jend. Sudirman No.27i, RT.02/RW.04, Pabaton, Kecamatan Bogor Tengah, Kota Bogor, Jawa Barat 16121" },
  { id: "c-31", wilayah: "BOGOR", outlet: "BNI TAJUR", alamat: "Jl. Raya Bogor - Sukabumi 63-67, RT.01/RW.03, Pakuan, Kec. Bogor Sel., Kota Bogor, Jawa Barat 16134" },
  { id: "c-32", wilayah: "BOGOR", outlet: "BNI WR JAMBU", alamat: "Jl. Padjadjaran No.22, RT.3/RW.1, Cibuluh, Bogor Utara, RT.02/RW.01, Cibuluh, Kec. Bogor Utara, Kota Bogor, Jawa Barat 16151" },
  { id: "c-33", wilayah: "BOGOR", outlet: "BNI CIMANGGU", alamat: "Jl. Sholeh Iskandar, RT.02/RW.11, Kedungbadak, Kec. Tanah Sereal, Kota Bogor, Jawa Barat 16164" },
  { id: "c-34", wilayah: "CIBINONG", outlet: "BNI KCU CIBINONG", alamat: "Jl. Raya Cibinong No.600 A, Pabuaran, Kec.Cibinong, Kabupaten Bogor, Jawa Barat 16913" },
  { id: "c-35", wilayah: "CIBINONG", outlet: "BNI BOJONG GEDE", alamat: "Jl. Raya Bojong Gede No.25, Bojonggede, Kec, Bojonggede, Kabupaten Bogor,Jawa Barat 16923" },
  { id: "c-36", wilayah: "CIBINONG", outlet: "BNI CILEUNGSI", alamat: "Ruko Perum Griya Kenari Mas Blok A1 No. 8-9, Jl. Narogong Raya, Cileungsi, Bogor, Jawa Barat. 16680" },
  { id: "c-37", wilayah: "CIBINONG", outlet: "BNI MAYOR OKING", alamat: "Jl. Raya Mayor Oking Jaya Atmaja, Ciriung, Kec. Cibinong, Kabupaten Bogor, Jawa Barat 16911" },
  { id: "c-38", wilayah: "CIBINONG", outlet: "BNI SENTUL CITY", alamat: "Jl. Raya Sirkuit Sentul, Sentul,Kec. Babakan Madang,Kabupaten Bogor, Jawa Barat 16810" },
  { id: "c-39", wilayah: "CIBINONG", outlet: "BNI CITEUREP", alamat: "Ruko Kharisma Badminton, Jalan Raya Mayor Oking Jayaatmaja No 1A, Kelurahan Karang Asem Barat, Kecamatan Citeureup, Kabupaten Bogor" },
  { id: "c-40", wilayah: "CIBINONG", outlet: "BNI GUNUNG PUTRI", alamat: "Jl. Griya Bukit Jaya No.21 Blok AA 11, Tlajung Udik,Kec. Gn. Putri, Kabupaten Bogor, Jawa Barat 16962" },
  { id: "c-41", wilayah: "DEPOK MARGONDA", outlet: "BNI KCU MARGONDA", alamat: "Jl. Margonda No.48, Kemiri Muka, Kec Beji, Kota Depok, Jawa Barat 16432" },
  { id: "c-42", wilayah: "DEPOK MARGONDA", outlet: "BNI PARUNG", alamat: "Jl. Raya Parung No.15, Duren Mekar, Kec. Bojongsari, Kota Depok,Jawa Barat 16158" },
  { id: "c-43", wilayah: "DEPOK MARGONDA", outlet: "BNI TRANSYOGI", alamat: "Jl. Alternatif Cibubur, RT.004/RW.010, Jatisampurna,Kec. Jatisampurna, Kota Bks, Jawa Barat 17435" },
  { id: "c-44", wilayah: "DEPOK MARGONDA", outlet: "BNI DEPOK 1", alamat: "Jl. Arif Rahman Hakim No.61, Beji, \KecamatanBeji, Kota Depok, Jawa Barat 16431" },
  { id: "c-45", wilayah: "DEPOK MARGONDA", outlet: "BNI POCIN", alamat: "Jl. Margonda Raya No. 47 A Pondok Cina, Kemiri Muka, Kecamatan Beji, Kota Depok, Jawa Barat 16424" },
  { id: "c-46", wilayah: "DEPOK MARGONDA", outlet: "BNI CIBUBUR GANDARIA", alamat: "Jl. Raya Jakarta - Bogor 5 3 Pekayon Kecamatan Pasar Rebo Kota Jakarta Timur Daerah Khusus Ibukota Jakarta, 13710" },
  { id: "c-47", wilayah: "DEPOK MARGONDA", outlet: "BNI GRAND DEPOK CITY", alamat: "Jl. Ps. Segar Jl. Boulevard Grand Depok City,Tirtajaya, Kec. Sukmajaya, Kota Depok, Jawa Barat 16458" },
  { id: "c-48", wilayah: "DEPOK MARGONDA", outlet: "BNI CIBUBUR INDAH ( ARUNDINA )", alamat: "Jl. Lap. Tembak A No.4, RT.2/RW.11, Cibubur, Kec Ciracas, Kota Jakarta Timur, Daerah Khusus Ibukota Jakarta 13720" },
  { id: "c-49", wilayah: "DEPOK MARGONDA", outlet: "BNI DEPOK 2", alamat: "Jl. Tole Iskandar No.21, Tirtajaya, Kec. Sukmajaya, Kota Depok, Jawa Barat 16412" },
  { id: "c-50", wilayah: "DEPOK MARGONDA", outlet: "BNI MAHARAJA", alamat: "Jl. Raya Sawangan No.99, Rangkapan Jaya,Kec. Pancoran Mas, Kota Depok, Jawa Barat 16435" },
  { id: "c-51", wilayah: "UNI DEPOK", outlet: "BNI KCU UI DEPOK", alamat: "Universitas Indonesia, Gedung Perpustakaan Pusat, Lt. Dasar - Lt. 3, Pondok Cina, Kecamatan Beji, Kota Depok, Jabar 16424" },
  { id: "c-52", wilayah: "UNI DEPOK", outlet: "BNI JAGAKARSA", alamat: "Jl. Raya Jagakarsa, RT.9/RW.3, Jagakarsa, Kec. Jagakarsa, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12620" },
  { id: "c-53", wilayah: "UNI DEPOK", outlet: "BNI UNIV PANCASILA", alamat: "Jl. Raya Lenteng Agung No.32 1, RT.7/RW.3, Srengseng Sawah, Kec. Jagakarsa, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12630" },
  { id: "c-54", wilayah: "UNI DEPOK", outlet: "BNI CIGANJUR", alamat: "Jl. Moh. Kahfi 1 No.10, RT.2/RW.6, Ciganjur, Kec. Jagakarsa, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12630" },
  { id: "c-55", wilayah: "UNI DEPOK", outlet: "BNI KLAPA DUA", alamat: "Jl.akses Ui Kelapa Dua Kel. Pasir Gunun Selatan Kec.cimanggis, Kab.bogor, Tugu, Bogor, Kota Depok, Jawa Barat 16451" },
  { id: "c-56", wilayah: "UNI DEPOK", outlet: "BNI TANJUNG BARAT", alamat: "Jl. Tj. Barat Selatan, RT.4/RW.1, Tj. Bar., Kec. Jagakarsa, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12530" },
  { id: "c-57", wilayah: "UNI DEPOK", outlet: "BNI UI SALEMBA", alamat: "Jl. Salemba Raya No.4, RW.5, Kenari, Kec. Senen, Kota Jakarta Pusat, Daerah Khusus Ibukota Jakarta 10440" },
  { id: "c-58", wilayah: "UNI DEPOK", outlet: "BNI UNIV GUNADARMA", alamat: "Jl. Raya margonda raya 100 Pondok Cina Beji, Depok City, jawa Barat 16424" }
];

// Placeholder image (pure blue gradient / camera mockup) to keep bundle small but look nice in the PDF
const placeholderPhoto = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%231e293b'/><circle cx='200' cy='150' r='60' fill='%23334155'/><circle cx='200' cy='150' r='30' fill='%23C52328'/><text x='200' y='260' fill='%2394a3b8' font-family='sans-serif' font-size='14' text-anchor='middle'>CV ATN - BUKTI PM</text></svg>";

const defaultJobcards: Jobcard[] = [
  {
    id: "job-1",
    noJobcard: "26041610",
    customerName: "BNI CIOMAS",
    customerAddress: "Jl. Raya Laladon Ciomas Rahayu, Kec. Ciomas, Kabupaten Bogor, Jawa Barat 16610",
    tglPengerjaan: "2026-04-16",
    teknisiId: "user-tech-1",
    teknisiName: "wahyono",
    teknisiPhone: "+6281574757617",
    status: "Completed",
    // 8 distinct photos as required
    photos: [
      placeholderPhoto,
      placeholderPhoto,
      placeholderPhoto,
      placeholderPhoto,
      placeholderPhoto,
      placeholderPhoto,
      placeholderPhoto,
      placeholderPhoto,
    ],
    signatureBase64: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='80' viewBox='0 0 200 80'><path d='M10,40 Q50,10 90,40 T170,40' fill='none' stroke='%23C52328' stroke-width='3'/><text x='100' y='70' fill='%231e293b' font-family='sans-serif' font-size='12' text-anchor='middle'>wahyono</text></svg>",
    signatureName: "wahyono",
    completedAt: "2026-04-16T17:30:00",
    
    // Invoicing
    invoiceNo: "INV-26041610",
    invoiceDate: "April 2026",
    invoiceTotal: 1950000,
    invoiceStatus: "Paid",
    adminSignatureBase64: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='80' viewBox='0 0 200 80'><path d='M20,50 Q60,20 100,50 T180,30' fill='none' stroke='%23C52328' stroke-width='3'/><text x='100' y='70' fill='%231e293b' font-family='sans-serif' font-size='12' text-anchor='middle'>Agung Setiawan</text></svg>",
    adminSignatureName: "Agung Setiawan",
    
    machines: [
      { id: "m-1", mesin: "Glory", type: "Usf 52", serialNumber: "77998", keterangan: "Preventive maintenance", harga: 400000 },
      { id: "m-2", mesin: "Glory", type: "Gnh710", serialNumber: "34499", keterangan: "Preventive maintenance", harga: 300000 },
      { id: "m-3", mesin: "Compuprint", type: "Sp40 plus", serialNumber: "141842", keterangan: "Preventive maintenance", harga: 200000 },
      { id: "m-4", mesin: "Compu[rint", type: "Sp40 plus", serialNumber: "105073", keterangan: "Preventive maintenance", harga: 200000 },
      { id: "m-5", mesin: "Epson", type: "Lq2190", serialNumber: "138482", keterangan: "Preventive maintenance", harga: 200000 },
      { id: "m-6", mesin: "Epson", type: "PLQ20", serialNumber: "47011", keterangan: "Preventive maintenance", harga: 200000 },
      { id: "m-7", mesin: "Epson", type: "PLQ20", serialNumber: "25955", keterangan: "Preventive maintenance", harga: 200000 },
      { id: "m-8", mesin: "Epson", type: "PLQ20", serialNumber: "47011", keterangan: "Pengantian jarum dan sensor head", harga: 250000 }
    ]
  },
  {
    id: "job-2",
    noJobcard: "26041611",
    customerName: "BNI KCP SUTERA NIAGA",
    customerAddress: "Ruko Jalur Sutera, Jl. Raya Serpong No.KM. 8 Kav. 29D No. 15, Pakulonan, Kec. Serpong Utara, Kota Tangerang Selatan, Banten 15325",
    tglPengerjaan: "2026-07-20",
    teknisiId: "user-tech-1",
    teknisiName: "wahyono",
    teknisiPhone: "+6281574757617",
    status: "Pending",
    photos: [],
    machines: [
      { id: "m-9", mesin: "Glory", type: "Usf 52", serialNumber: "88219", keterangan: "Preventive maintenance" }
    ]
  }
];

// LocalStorage helpers to load/save
const getLocalData = (key: string, defaults: any) => {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaults));
    return defaults;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return defaults;
  }
};

const saveLocalData = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// --- API Layer ---

// 1. Users
export const getUsers = async (): Promise<User[]> => {
  let list: User[] = [];
  if (isFirebaseActive) {
    try {
      const snap = await withTimeout(getDocs(collection(db, "users")));
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as User));
      if (list.length === 0) {
        // Seed Firestore if empty
        for (const u of defaultUsers) {
          await withTimeout(setDoc(doc(db, "users", u.id), cleanObject(u)));
        }
        return defaultUsers;
      }
    } catch (e) {
      console.warn("Firestore error reading users, using localStorage", e);
      list = getLocalData("atn_users", defaultUsers);
    }
  } else {
    list = getLocalData("atn_users", defaultUsers);
  }

  // Ensure superadm always exists
  const hasSuperadm = list.some((u) => u.username === "superadm");
  if (!hasSuperadm) {
    const superadminUser: User = {
      id: "user-superadmin",
      username: "superadm",
      fullName: "Super Admin",
      passwordHash: "Akmall1627",
      role: UserRole.SUPER_ADMIN,
      isDefaultPassword: false
    };
    if (isFirebaseActive) {
      try {
        await setDoc(doc(db, "users", "user-superadmin"), cleanObject(superadminUser));
      } catch (err) {
        console.warn("Failed to auto-seed superadm in firestore:", err);
      }
    }
    list.push(superadminUser);
    
    // Also save in localstorage user list
    const localUsers = getLocalData("atn_users", defaultUsers);
    if (!localUsers.some((u: any) => u.username === "superadm")) {
      localUsers.push(superadminUser);
      saveLocalData("atn_users", localUsers);
    }
  }

  return list;
};

export const saveUser = async (user: User): Promise<void> => {
  if (isFirebaseActive) {
    try {
      await withTimeout(setDoc(doc(db, "users", user.id), cleanObject(user)));
    } catch (e) {
      console.warn("Firestore error saving user:", e);
      throw e;
    }
  }
  const users = await getUsers();
  const idx = users.findIndex((u) => u.id === user.id);
  if (idx >= 0) {
    users[idx] = user;
  } else {
    users.push(user);
  }
  saveLocalData("atn_users", users);
};

export const deleteUser = async (id: string): Promise<void> => {
  if (isFirebaseActive) {
    try {
      await withTimeout(deleteDoc(doc(db, "users", id)));
    } catch (e) {
      console.warn("Firestore error deleting user:", e);
      throw e;
    }
  }
  const users = await getUsers();
  const filtered = users.filter((u) => u.id !== id);
  saveLocalData("atn_users", filtered);
};

// 2. Customers
export const getCustomers = async (): Promise<Customer[]> => {
  if (isFirebaseActive) {
    try {
      const snap = await withTimeout(getDocs(collection(db, "customers")));
      const list: Customer[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Customer));
      if (list.length === 0) {
        for (const c of defaultCustomers) {
          await withTimeout(setDoc(doc(db, "customers", c.id), cleanObject(c)));
        }
        return defaultCustomers;
      }

      // Automatically deduplicate: if OUTLET and NAMA/WILAYAH are identical, keep 1 and delete duplicates
      const uniqueList: Customer[] = [];
      const seenKeys = new Set<string>();
      const duplicatesToDelete: string[] = [];

      for (const c of list) {
        const key = `${(c.wilayah || "").trim().toLowerCase()}|${(c.outlet || "").trim().toLowerCase()}`;
        if (seenKeys.has(key)) {
          duplicatesToDelete.push(c.id);
        } else {
          seenKeys.add(key);
          uniqueList.push(c);
        }
      }

      if (duplicatesToDelete.length > 0) {
        console.log(`Auto-deduplicated: found ${duplicatesToDelete.length} duplicate customers. Deleting...`);
        Promise.all(
          duplicatesToDelete.map(async (dupId) => {
            try {
              await deleteDoc(doc(db, "customers", dupId));
            } catch (err) {
              console.warn(`Failed to delete duplicate customer ${dupId}:`, err);
            }
          })
        ).catch((err) => console.warn("Error deleting duplicate customers:", err));
      }

      saveLocalData("atn_customers", uniqueList);
      return uniqueList;
    } catch (e) {
      console.warn("Firestore error reading customers, using localStorage", e);
    }
  }

  // Fallback / Local Storage mode
  const list = getLocalData("atn_customers", defaultCustomers);
  const uniqueList: Customer[] = [];
  const seenKeys = new Set<string>();
  let hasChanges = false;

  for (const c of list) {
    const key = `${(c.wilayah || "").trim().toLowerCase()}|${(c.outlet || "").trim().toLowerCase()}`;
    if (seenKeys.has(key)) {
      hasChanges = true;
    } else {
      seenKeys.add(key);
      uniqueList.push(c);
    }
  }

  if (hasChanges) {
    saveLocalData("atn_customers", uniqueList);
  }
  return uniqueList;
};

export const saveCustomer = async (cust: Customer): Promise<void> => {
  if (isFirebaseActive) {
    try {
      await withTimeout(setDoc(doc(db, "customers", cust.id), cleanObject(cust)));
    } catch (e) {
      console.warn("Firestore error saving customer:", e);
      throw e;
    }
  }
  const list = await getCustomers();
  const idx = list.findIndex((c) => c.id === cust.id);
  if (idx >= 0) {
    list[idx] = cust;
  } else {
    list.push(cust);
  }
  saveLocalData("atn_customers", list);
};

export const deleteCustomer = async (id: string): Promise<void> => {
  if (isFirebaseActive) {
    try {
      await withTimeout(deleteDoc(doc(db, "customers", id)));
    } catch (e) {
      console.warn("Firestore error deleting customer:", e);
      throw e;
    }
  }
  const list = await getCustomers();
  const filtered = list.filter((c) => c.id !== id);
  saveLocalData("atn_customers", filtered);
};

export const deleteCustomers = async (ids: string[]): Promise<void> => {
  if (isFirebaseActive) {
    try {
      for (const id of ids) {
        await withTimeout(deleteDoc(doc(db, "customers", id)));
      }
    } catch (e) {
      console.warn("Firestore error deleting bulk customers:", e);
      throw e;
    }
  }
  const list = await getCustomers();
  const filtered = list.filter((c) => !ids.includes(c.id));
  saveLocalData("atn_customers", filtered);
};

// 3. Jobcards
export const getJobcards = async (): Promise<Jobcard[]> => {
  if (isFirebaseActive) {
    try {
      const snap = await withTimeout(getDocs(collection(db, "jobcards")));
      const list: Jobcard[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Jobcard));
      if (list.length === 0) {
        for (const j of defaultJobcards) {
          await withTimeout(setDoc(doc(db, "jobcards", j.id), cleanObject(j)));
        }
        return defaultJobcards;
      }
      return list;
    } catch (e) {
      console.warn("Firestore error reading jobcards, using localStorage", e);
    }
  }
  return getLocalData("atn_jobcards", defaultJobcards);
};

export const saveJobcard = async (job: Jobcard): Promise<void> => {
  if (isFirebaseActive) {
    try {
      await withTimeout(setDoc(doc(db, "jobcards", job.id), cleanObject(job)));
    } catch (e) {
      console.warn("Firestore error saving jobcard:", e);
      throw e;
    }
  }
  const list = await getJobcards();
  const idx = list.findIndex((j) => j.id === job.id);
  if (idx >= 0) {
    list[idx] = job;
  } else {
    list.push(job);
  }
  saveLocalData("atn_jobcards", list);
};

export const deleteJobcard = async (id: string): Promise<void> => {
  if (isFirebaseActive) {
    try {
      await withTimeout(deleteDoc(doc(db, "jobcards", id)));
    } catch (e) {
      console.warn("Firestore error deleting jobcard:", e);
      throw e;
    }
  }
  const list = await getJobcards();
  const filtered = list.filter((j) => j.id !== id);
  saveLocalData("atn_jobcards", filtered);
};

// --- Active Session Management & Boot Seeds ---
export const getActiveSession = (): User | null => {
  const sess = localStorage.getItem("atn_active_session");
  if (!sess) return null;
  try {
    return JSON.parse(sess) as User;
  } catch (e) {
    return null;
  }
};

export const clearActiveSession = (): void => {
  localStorage.removeItem("atn_active_session");
};

export const initSeedData = (): void => {
  // Pull initial reads to seed tables instantly on startup
  getUsers();
  getCustomers();
  getJobcards();
};

// --- Security / Activity Logs (localStorage) ---
export const getSecurityLogs = async (): Promise<SecurityLog[]> => {
  const data = getLocalData("atn_security_logs", []);
  return (data as SecurityLog[]).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const addSecurityLog = async (
  userId: string,
  username: string,
  fullName: string,
  role: UserRole,
  eventType: "login" | "password_update",
  details: string
): Promise<void> => {
  const logs = await getSecurityLogs();
  const newLog: SecurityLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    timestamp: new Date().toISOString(),
    userId,
    username,
    fullName,
    role,
    eventType,
    details,
  };
  logs.unshift(newLog);
  saveLocalData("atn_security_logs", logs);
};


