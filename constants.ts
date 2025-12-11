import { AgentType, AgentConfig } from './types';
import { FunctionDeclaration, Type } from "@google/genai";

export const SYSTEM_INSTRUCTION = `
Anda adalah Agen Orkestrasi Cerdas **Sistem Rumah Sakit** dan Pusat Analisis Sentral. Misi Anda adalah menganalisis setiap permintaan pengguna terkait operasional rumah sakit dan **mengarahkan (dispatch)** tugas tersebut secara akurat ke Agen Spesialis yang paling sesuai. Prinsip operasional utama Anda adalah **Pemisahan Tugas (Segregation of Duties - SOD)**: Anda dilarang memproses atau memberikan hasil akhir secara langsung untuk Rekam Medis, Penagihan, Pendaftaran, atau Janji Temu. Anda harus beroperasi dengan presisi tinggi untuk mendukung sistem AIS yang terintegrasi.

Pedoman Operasional:
1. Prioritas Utama: Tentukan inti tujuan kueri pengguna.
2. Klarifikasi: Jika ambigu, minta klarifikasi.
3. Dispatching Wajib: Panggil HANYA SATU dari alat (sub-agen) yang tersedia.
4. Transfer Kontekstual: Teruskan detail relevan ke alat.
5. Kepatuhan PHI: Pastikan keamanan data.

Definisi Custom Tools (Sub-Agen):
1. Agen_Rekam_Medis: Akses PHI, riwayat medis, diagnosis.
2. Agen_Penagihan_Asuransi: Penagihan, klaim, biaya.
3. Agen_Pendaftaran_Pasien: Pendaftaran baru, update demografis.
4. Agen_Manajemen_Janji_Temu: Penjadwalan, pembatalan.

Etika: Sertakan disclaimer bahwa ini bukan pengganti saran medis profesional.
`;

export const AGENTS: Record<AgentType, AgentConfig> = {
  [AgentType.ORCHESTRATOR]: {
    id: AgentType.ORCHESTRATOR,
    name: "Sistem Rumah Sakit (Orchestrator)",
    description: "Central Analysis & Dispatch",
    color: "bg-slate-800",
    iconName: "BrainCircuit"
  },
  [AgentType.MEDICAL_RECORDS]: {
    id: AgentType.MEDICAL_RECORDS,
    name: "Agen Rekam Medis",
    description: "PHI & Clinical Data",
    color: "bg-red-600",
    iconName: "FileHeart"
  },
  [AgentType.BILLING]: {
    id: AgentType.BILLING,
    name: "Agen Penagihan",
    description: "RCM & Insurance",
    color: "bg-green-600",
    iconName: "BadgeDollarSign"
  },
  [AgentType.REGISTRATION]: {
    id: AgentType.REGISTRATION,
    name: "Agen Pendaftaran",
    description: "Patient Demographics",
    color: "bg-purple-600",
    iconName: "UserPlus"
  },
  [AgentType.APPOINTMENTS]: {
    id: AgentType.APPOINTMENTS,
    name: "Agen Janji Temu",
    description: "Scheduling & Resources",
    color: "bg-orange-500",
    iconName: "CalendarClock"
  }
};

// Function Declarations for Gemini
export const TOOLS: FunctionDeclaration[] = [
  {
    name: "call_medical_records_agent",
    description: "Dispatch request to Medical Records Agent for PHI, history, or lab results.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "The specific medical query or patient ID." }
      },
      required: ["query"]
    }
  },
  {
    name: "call_billing_insurance_agent",
    description: "Dispatch request to Billing Agent for invoices, insurance claims, or costs.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "The billing inquiry details." }
      },
      required: ["query"]
    }
  },
  {
    name: "call_patient_registration_agent",
    description: "Dispatch request to Registration Agent for new patients or demographic updates.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "Patient details for registration." }
      },
      required: ["query"]
    }
  },
  {
    name: "call_appointment_management_agent",
    description: "Dispatch request to Appointment Agent for scheduling or rescheduling.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "Date, time, and doctor preference." }
      },
      required: ["query"]
    }
  }
];

// Mock Database Responses
export const MOCK_DB = {
  MEDICAL: "Sistem: [Internal Access] Mengambil data Pasien ID: P-9982. Diagnosis: Hipertensi Tingkat 1. Alergi: Penicillin. Hasil Lab Terakhir (12/01/2024): Kolesterol 210 mg/dL (Sedikit Tinggi).",
  BILLING: "Sistem: [RCM Core] Faktur #INV-2024-001. Total: Rp 1.500.000. Status: Pending Asuransi (BPJS). Estimasi Tanggungan Pribadi: Rp 0.",
  REGISTRATION: "Sistem: [Master Patient Index] Data demografis ditemukan. Nama: Budi Santoso. Tgl Lahir: 12-05-1980. Alamat diperbarui per permintaan.",
  APPOINTMENTS: "Sistem: [Scheduler] Dokter dr. Siti tersedia pada Selasa, 10:00 AM. Slot dikunci sementara menunggu konfirmasi."
};
