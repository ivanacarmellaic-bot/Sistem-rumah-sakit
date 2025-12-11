import { GoogleGenAI, GenerateContentResponse, Content } from "@google/genai";
import { TOOLS, SYSTEM_INSTRUCTION } from '../constants';
import { GeminiResponse } from '../types';

let chatSession: any = null;

export const initializeChat = async (userApiKey?: string) => {
  try {
    // 1. Try to get key from Environment (Build time)
    let apiKey = '';
    try {
      apiKey = process.env.API_KEY || '';
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
    
    return true; // Success

  } catch (error) {
    console.error("Failed to initialize Gemini:", error);
    return false;
  }
};

export const sendMessageToGemini = async (message: string): Promise<GeminiResponse> => {
  if (!chatSession) {
    return {
      text: "⚠️ Error: Sesi chat belum terinisialisasi. Pastikan API Key valid telah dimasukkan.",
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

  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "Maaf, terjadi kesalahan koneksi ke AI. Silakan coba lagi." };
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

  } catch (error) {
    console.error("Tool Response Error:", error);
    return "Error processing tool result.";
  }
};