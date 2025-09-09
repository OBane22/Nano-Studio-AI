export enum EditTool {
  None = 'none',
  Resize = 'resize',
  BrightnessContrast = 'brightness-contrast',
  RemoveBg = 'remove-bg',
  AddBg = 'add-bg',
  Retouch = 'retouch',
  Inpaint = 'inpaint',
  Replace = 'replace',
  Style = 'style',
  Custom = 'custom',
  Text = 'text',
}

export interface HistoryState {
  imageData: string;
  imageType: string;
  prompt: string;
  tool: EditTool;
}

export type StylePreset = 'Impressionist Painting' | 'Pencil Sketch' | 'Anime' | 'Cyberpunk' | 'Vintage Film';

export type TextPosition = 'top-left' | 'top-center' | 'top-right' | 'middle-left' | 'middle-center' | 'middle-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';


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
    // For Text tool
    text?: string;
    fontSize?: number;
    color?: string;
    position?: TextPosition;
    fontFamily?: string;
    strokeColor?: string;
    strokeWidth?: number;
    shadowColor?: string;
    shadowBlur?: number;
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