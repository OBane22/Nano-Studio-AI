export enum EditTool {
  None = 'none',
  Resize = 'resize',
  RemoveBg = 'remove-bg',
  Retouch = 'retouch',
  Inpaint = 'inpaint',
  Replace = 'replace',
  Style = 'style',
  Custom = 'custom',
}

export interface HistoryState {
  imageData: string;
  imageType: string;
  prompt: string;
  tool: EditTool;
}

export type StylePreset = 'Impressionist Painting' | 'Pencil Sketch' | 'Anime' | 'Cyberpunk' | 'Vintage Film';

// New types for batch editing
export interface BatchStep {
  id: string;
  tool: EditTool;
  params: {
    // For tools like Inpaint, Replace, Custom
    prompt?: string;
    // For Style tool
    style?: StylePreset;
    // For Resize tool
    width?: number;
    height?: number;
  };
}

export type OutputFormat = 'image/jpeg' | 'image/png' | 'image/webp';

export interface BatchImage {
  id: string;
  originalData: string;
  originalType: string;
  processedData?: string;
  processedType?: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  error?: string;
}

// Type for saved projects
export interface Project {
  id: string;
  name: string;
  originalImage: { data: string; type: string };
  history: HistoryState[];
  currentHistoryIndex: number;
  savedAt: string; // ISO Date String
}
