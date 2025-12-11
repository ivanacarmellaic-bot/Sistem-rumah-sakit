import { GoogleGenAI, GenerateContentResponse, Content } from "@google/genai";
import { TOOLS, SYSTEM_INSTRUCTION } from '../constants';
import { GeminiResponse } from '../types';

let chatSession: any = null;

export const initializeChat = async () => {
  try {
    // Safely retrieve API Key to prevent "process is not defined" crash in browser
    let apiKey = '';
    try {
      apiKey = process.env.API_KEY || '';
    } catch (e) {
      // Ignore ReferenceError if process is not defined in the environment
      console.warn("Environment variable access failed, running in simulation mode.");
    }

    if (!apiKey) {
      console.warn("API Key is missing. The app will run in simulation mode but network calls will fail.");
      return;
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Create a persistent chat session
    chatSession = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: TOOLS }],
        temperature: 0.2, // Low temperature for strict adherence to protocols
      },
    });

  } catch (error) {
    console.error("Failed to initialize Gemini:", error);
  }
};

export const sendMessageToGemini = async (message: string): Promise<GeminiResponse> => {
  if (!chatSession) {
    // Fallback if API key is missing or init failed - simplistic mock
    return {
      text: "Error: API Key missing or connection failed. Please check your configuration.",
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
    return { text: "System Error: Could not reach the Orchestrator." };
  }
};

export const sendToolResponseToGemini = async (functionName: string, result: string): Promise<string> => {
  if (!chatSession) return "Error: No session.";

  try {
    // Send the result of the tool execution back to the model
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