export enum UserRole {
  SUPER_ADMIN = "Super Admin",
  ADMIN = "Admin",
  TECHNICIAN = "Teknisi",
  CUSTOMER = "Customer",
}

export interface User {
  id: string;
  username: string; // Used for login
  fullName: string;
  passwordHash: string; // For security
  role: UserRole;
  phone?: string; // Standard for Technicians
  isDefaultPassword?: boolean; // Forces password change on first login
  // For Customers, we can link them to their specific BNI outlet
  customerOutlet?: string; 
  customerWilayah?: string;
}

export interface Customer {
  id: string;
  wilayah: string;
  outlet: string;
  alamat: string;
}

export interface MachineItem {
  id: string;
  mesin: string; // e.g., Glory, Compuprint, Epson
  type: string; // e.g., Usf 52, Sp40 plus, PLQ20
  serialNumber: string; // e.g., 77998
  keterangan: string; // e.g., Preventive maintenance, Pengantian jarum
  harga?: number; // Filled by Admin
}

export interface Jobcard {
  id: string;
  noJobcard: string; // e.g., "26041610"
  customerName: string; // e.g., "BNI CIOMAS"
  customerAddress: string;
  tglPengerjaan: string; // e.g., "2026-04-16"
  teknisiId: string;
  teknisiName: string;
  teknisiPhone: string;
  
  // Machines included in this PM visit
  machines: MachineItem[];
  
  // Completion details (filled by Technician)
  status: "Pending" | "Completed";
  photos: string[]; // Array of base64 data URLs (max 8)
  signatureBase64?: string; // Digital signature
  signatureName?: string; // Signature name (technician name)
  completedAt?: string;
  
  // Invoice details (filled by Admin)
  invoiceNo?: string;
  invoiceDate?: string; // e.g., "April 2026"
  invoiceTotal?: number;
  invoiceStatus?: "Draft" | "Sent" | "Paid";
  adminSignatureBase64?: string;
  adminSignatureName?: string; // "Agung Setiawan" or similar
}

export interface SecurityLog {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  fullName: string;
  role: UserRole;
  eventType: "login" | "password_update";
  details: string;
}

