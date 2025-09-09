import { GoogleGenAI, Modality } from "@google/genai";
import { EditTool, StylePreset } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToGenerativePart = (base64Data: string, mimeType: string) => {
  return {
    inlineData: {
      data: base64Data,
      mimeType,
    },
  };
};

export const editImageWithAI = async (
  base64ImageData: string,
  mimeType: string,
  prompt: string
): Promise<{ data: string; mimeType: string }> => {
  try {
    const imagePart = fileToGenerativePart(base64ImageData, mimeType);
    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });
    
    // Find the first image part in the response
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData && part.inlineData.data) {
        return { data: part.inlineData.data, mimeType: part.inlineData.mimeType };
      }
    }

    throw new Error("No image was generated in the response.");
  } catch (error) {
    console.error("Error editing image with AI:", error);
    if (error instanceof Error) {
        throw new Error(`AI processing failed: ${error.message}`);
    }
    throw new Error("Failed to process the image with AI. Please check the console for details.");
  }
};

export const getPromptForTool = (tool: EditTool, params: { prompt?: string; style?: StylePreset }): string => {
  switch (tool) {
    case EditTool.RemoveBg:
      return 'Remove the background and make it transparent.';
    case EditTool.AddBg:
        return `Add a new background to this image based on the following description: "${params.prompt}". The background should be realistic and blend seamlessly with the existing foreground subject(s) in terms of lighting, perspective, and style. Do not alter the foreground.`;
    case EditTool.Retouch:
      return 'Perform a professional photographic retouch. Smooth skin, remove blemishes, and balance the lighting to be more flattering.';
    case EditTool.Inpaint:
      return `Seamlessly remove the ${params.prompt || 'designated object'} from the image and fill in the background realistically.`;
    case EditTool.Replace:
      return `Replace ${params.prompt || 'designated object'}. Be specific in what you are replacing and what you are replacing it with. For example: 'the red car with a blue bicycle'.`;
    case EditTool.Style:
      return `Transform this image into the style of a ${params.style}.`;
    case EditTool.Custom:
      return params.prompt || '';
    default:
      return '';
  }
};