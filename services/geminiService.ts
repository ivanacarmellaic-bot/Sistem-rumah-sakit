import { GoogleGenAI, GenerateContentResponse, Content } from "@google/genai";
import { TOOLS, SYSTEM_INSTRUCTION } from '../constants';
import { GeminiResponse } from '../types';

let chatSession: any = null;
let currentApiKey: string = '';

// Helper to safely get API Key from various sources
const getEnvironmentApiKey = (): string => {
  try {
    // 1. Check window.process (polyfill from index.html)
    if ((window as any).process?.env?.API_KEY) return (window as any).process.env.API_KEY;
    // 2. Check bundler injected process
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env?.API_KEY) return process.env.API_KEY;
  } catch (e) {
    return '';
  }
  return '';
};

export const initializeChat = async (userApiKey?: string) => {
  try {
    let apiKey = '';
    
    // 1. Prioritize User Input (passed arg)
    if (userApiKey) {
      apiKey = userApiKey;
    } 
    // 2. Fallback to Environment Variable
    else {
      apiKey = getEnvironmentApiKey();
    }

    if (!apiKey) {
      console.warn("API Key is missing.");
      return false; 
    }

    // Initialize Client
    const ai = new GoogleGenAI({ apiKey });
    
    // Create Chat Session
    chatSession = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: TOOLS }],
        temperature: 0.2, 
      },
    });
    
    currentApiKey = apiKey;
    console.log("Gemini Chat Session Initialized successfully.");
    return true; 

  } catch (error) {
    console.error("Failed to initialize Gemini:", error);
    return false;
  }
};

export const sendMessageToGemini = async (message: string): Promise<GeminiResponse> => {
  if (!chatSession) {
    // Try to recover session if apiKey is available in memory
    if (currentApiKey) {
       await initializeChat(currentApiKey);
    }
    
    if (!chatSession) {
        return {
          text: "⚠️ Sesi terputus. Mohon refresh halaman atau masukkan ulang API Key.",
        };
    }
  }

  try {
    const response: GenerateContentResponse = await chatSession.sendMessage({ message });
    
    // Check for function calls
    const functionCalls = response.candidates?.[0]?.content?.parts
      ?.filter(part => part.functionCall)
      .map(part => ({
        name: part.functionCall!.name,
        args: part.functionCall!.args as Record<string, any>
      }));

    return {
      text: response.text || "",
      functionCalls: functionCalls && functionCalls.length > 0 ? functionCalls : undefined
    };

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    let errorMessage = "Maaf, terjadi kesalahan koneksi ke AI.";
    
    // Friendly Error Messages
    if (error.message) {
        if (error.message.includes("400")) errorMessage = "⚠️ Permintaan tidak valid (Error 400). Cek API Key Anda.";
        else if (error.message.includes("403")) errorMessage = "⛔ Akses ditolak (Error 403). API Key tidak valid atau lokasi diblokir.";
        else if (error.message.includes("404")) errorMessage = "❌ Model tidak ditemukan (Error 404).";
        else if (error.message.includes("Failed to fetch")) errorMessage = "🌐 Gagal terhubung. Periksa koneksi internet Anda.";
        else errorMessage = `⚠️ Error: ${error.message}`;
    }

    return { text: errorMessage };
  }
};

export const sendToolResponseToGemini = async (functionName: string, result: string): Promise<string> => {
  if (!chatSession) return "Error: No session.";

  try {
    const response: GenerateContentResponse = await chatSession.sendMessage({
      message: [
        {
          functionResponse: {
            name: functionName,
            response: { result: result }
          }
        }
      ]
    });
    
    return response.text || "No response text generated.";

  } catch (error: any) {
    console.error("Tool Response Error:", error);
    return `Error processing tool result: ${error.message}`;
  }
};