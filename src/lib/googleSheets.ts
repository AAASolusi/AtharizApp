import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut
} from "firebase/auth";
import { auth } from "./db";
import { Jobcard } from "../types";

// Cache access token in-memory only (security guideline)
let cachedAccessToken: string | null = null;
let googleUser: any | null = null;

// Auth listener callback type
type AuthStateCallback = (user: any | null, token: string | null) => void;
const listeners = new Set<AuthStateCallback>();

export const registerSheetsAuthListener = (cb: AuthStateCallback) => {
  listeners.add(cb);
  // Send current state
  cb(googleUser, cachedAccessToken);
  return () => {
    listeners.delete(cb);
  };
};

const notifyListeners = () => {
  listeners.forEach((cb) => cb(googleUser, cachedAccessToken));
};

/**
 * Trigger sign in with Google to obtain Sheets scopes
 */
export const signInWithGoogleSheets = async (): Promise<{ user: any; token: string } | null> => {
  if (!auth) {
    throw new Error("Firebase Auth is not initialized or active.");
  }

  const provider = new GoogleAuthProvider();
  // Request Google Sheets and Drive files scopes
  provider.addScope("https://www.googleapis.com/auth/spreadsheets");
  provider.addScope("https://www.googleapis.com/auth/drive.file");
  
  // Optional hint
  provider.setCustomParameters({
    prompt: "select_account"
  });

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential || !credential.accessToken) {
      throw new Error("Failed to retrieve Google OAuth Access Token.");
    }

    cachedAccessToken = credential.accessToken;
    googleUser = result.user;
    notifyListeners();

    return { user: result.user, token: cachedAccessToken };
  } catch (error) {
    console.error("Error signing in with Google Sheets:", error);
    throw error;
  }
};

/**
 * Logout and clear token cache
 */
export const signOutGoogleSheets = async () => {
  cachedAccessToken = null;
  googleUser = null;
  notifyListeners();
};

/**
 * Check if we have an active token
 */
export const getSheetsAccessToken = (): string | null => {
  return cachedAccessToken;
};

/**
 * Create a new spreadsheet with Jobcard data headers
 */
export const createJobcardSpreadsheet = async (title: string): Promise<string> => {
  const token = getSheetsAccessToken();
  if (!token) {
    throw new Error("Unauthorized: Please sign in with Google Sheets first.");
  }

  const response = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      properties: {
        title: title || "Jobcard PM - CV Athariz Technology"
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to create spreadsheet: ${errText}`);
  }

  const data = await response.json();
  if (!data.spreadsheetId) {
    throw new Error("No spreadsheetId returned from Google Sheets API.");
  }

  return data.spreadsheetId;
};

/**
 * Format Jobcards into 2D array for Google Sheets
 */
const formatJobcardsForSheets = (jobcards: Jobcard[]) => {
  const headers = [
    "No. Jobcard",
    "Tanggal Pengerjaan",
    "Customer / Outlet",
    "Alamat",
    "Teknisi",
    "No. HP Teknisi",
    "Status Jobcard",
    "Selesai Pada",
    "No. Invoice",
    "Tanggal Invoice",
    "Total Invoice (IDR)",
    "Status Invoice",
    "Jumlah Mesin",
    "Daftar Mesin & Keterangan"
  ];

  const rows = jobcards.map((j) => {
    // Format machines list
    const machinesInfo = j.machines && j.machines.length > 0
      ? j.machines.map((m) => `${m.mesin} ${m.type || ""} (S/N: ${m.serialNumber || "-"}): ${m.keterangan || "PM"}`).join(" | ")
      : "Tidak ada mesin";

    return [
      j.noJobcard || "-",
      j.tglPengerjaan || "-",
      j.customerName || "-",
      j.customerAddress || "-",
      j.teknisiName || "-",
      j.teknisiPhone || "-",
      j.status || "Pending",
      j.completedAt ? new Date(j.completedAt).toLocaleString("id-ID") : "-",
      j.invoiceNo || "-",
      j.invoiceDate || "-",
      j.invoiceTotal || 0,
      j.invoiceStatus || "Unpaid",
      j.machines?.length || 0,
      machinesInfo
    ];
  });

  return [headers, ...rows];
};

/**
 * Write Jobcards data into specified spreadsheet
 */
export const updateSpreadsheetData = async (
  spreadsheetId: string,
  jobcards: Jobcard[]
): Promise<void> => {
  const token = getSheetsAccessToken();
  if (!token) {
    throw new Error("Unauthorized: Please sign in with Google Sheets first.");
  }

  const values = formatJobcardsForSheets(jobcards);
  const range = "Sheet1!A1";

  // We write the sheets using the values.update endpoint
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      values: values
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to update sheet values: ${errText}`);
  }
};
