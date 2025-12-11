import { GoogleGenAI, GenerateContentResponse, Content } from "@google/genai";
import { TOOLS, SYSTEM_INSTRUCTION } from '../constants';
import { GeminiResponse } from '../types';

let chatSession: any = null;
let currentApiKey: string = '';

export const initializeChat = async (userApiKey?: string) => {
  try {
    // 1. Try to get key from Environment (Build time)
    let apiKey = '';
    try {
      apiKey = (window as any).process?.env?.API_KEY || process.env.API_KEY || '';
    } catch (e) {
      // Ignore env error
    }

    // 2. If env key is missing, use the user-provided key from UI
    if (!apiKey && userApiKey) {
      apiKey = userApiKey;
    }

    if (!apiKey) {
      console.warn("API Key is missing.");
      return false; // Return false to indicate initialization failed
    }

    currentApiKey = apiKey;
    const ai = new GoogleGenAI({ apiKey });
    
    // Create a persistent chat session
    chatSession = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: TOOLS }],
        temperature: 0.2, 
      },
    });
    
    console.log("Gemini Chat Session Initialized with model: gemini-2.5-flash");
    return true; // Success

  } catch (error) {
    console.error("Failed to initialize Gemini:", error);
    return false;
  }
};

export const sendMessageToGemini = async (message: string): Promise<GeminiResponse> => {
  if (!chatSession) {
    return {
      text: "⚠️ Error: Sesi chat belum terinisialisasi. Silakan refresh halaman dan masukkan API Key yang valid.",
    };
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
    
    // Extract useful error info
    if (error.message) {
        if (error.message.includes("400")) {
             errorMessage += " (Error 400: Permintaan tidak valid. Kemungkinan format data atau API Key bermasalah.)";
        } else if (error.message.includes("403")) {
             errorMessage += " (Error 403: Akses ditolak. API Key mungkin tidak valid atau tidak memiliki izin untuk model ini.)";
        } else if (error.message.includes("404")) {
             errorMessage += " (Error 404: Model tidak ditemukan. Coba gunakan API Key yang mendukung Gemini 2.5 Flash.)";
        } else {
             errorMessage += ` (${error.message})`;
        }
    } else if (error.status) {
        errorMessage += ` (Status Code: ${error.status})`;
    } else {
        errorMessage += " Silakan periksa koneksi internet atau API Key Anda.";
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
    return `Error processing tool result: ${error.message || 'Unknown error'}`;
  }
};