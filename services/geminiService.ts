
import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from "../types";

/**
 * Gets plant wisdom from Gemini AI using the chat history and the current user message.
 */
export async function getPlantWisdom(history: ChatMessage[], message: string): Promise<string> {
  try {
    // Always instantiate GoogleGenAI inside the function with the API key from environment
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
    
    // Map history to the format expected by Gemini API (user/model roles with parts)
    const geminiHistory = history.map(msg => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const chat = ai.chats.create({
      model: 'gemini-2.0-flash',
      history: geminiHistory,
      config: {
        systemInstruction: `Tu es l'expert herboriste de "Diarra Plante de Vie", une boutique prestigieuse à Paris spécialisée dans les racines et plantes médicinales traditionnelles. 
        Ton ton est sage, professionnel, bienveillant et sophistiqué. Tu connais les vertus du Ginseng, du Moringa, de l'Hibiscus, du Curcuma et de bien d'autres plantes. 
        Réponds de manière concise mais expressive et courte. Utilise parfois des termes botaniques. Ne donne pas de conseils médicaux graves, suggère toujours de consulter un médecin en cas de doute, mais partage la sagesse ancestrale des plantes.`,
      },
    });

    const response = await chat.sendMessage({ message });
    // response.text is a property, not a method
    return response.text || "La nature garde le silence pour l'instant. Réessayez bientôt.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Une perturbation dans les racines empêche ma sagesse de vous atteindre. Veuillez nous excuser.";
  }
}
