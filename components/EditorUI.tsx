import React, { useState, useCallback, useEffect, useRef } from 'react';
import { EditTool, HistoryState, StylePreset, TextPosition } from '../types';
import { getPromptForTool, editImageWithAI } from '../services/geminiService';
import { resizeImage, getImageDimensions, drawTextOnImage, applyBrightnessContrast } from '../services/resizeService';
import { 
  RemoveBgIcon, RetouchIcon, InpaintIcon, ReplaceIcon, StyleIcon, CustomIcon, 
  UndoIcon, RedoIcon, CompareIcon, DownloadIcon, ResizeIcon, LockIcon, SaveIcon, TextIcon, BrightnessContrastIcon
} from './icons';
import Loader from './Loader';

interface EditorUIProps {
  originalImage: { data: string; type: string };
  history: HistoryState[];
  setHistory: React.Dispatch<React.SetStateAction<HistoryState[]>>;
  currentHistoryIndex: number;
  setCurrentHistoryIndex: React.Dispatch<React.SetStateAction<number>>;
  resetEditor: () => void;
  onSaveProject: (name: string) => void;
}

const tools = [
  { id: EditTool.Resize, name: 'Resize', icon: <ResizeIcon /> },
  { id: EditTool.BrightnessContrast, name: 'Adjust', icon: <BrightnessContrastIcon /> },
  { id: EditTool.Text, name: 'Text', icon: <TextIcon /> },
  { id: EditTool.RemoveBg, name: 'Remove BG', icon: <RemoveBgIcon /> },
  { id: EditTool.Retouch, name: 'Retouch', icon: <RetouchIcon /> },
  { id: EditTool.Inpaint, name: 'Inpaint', icon: <InpaintIcon /> },
  { id: EditTool.Replace, name: 'Replace', icon: <ReplaceIcon /> },
  { id: EditTool.Style, name: 'Style', icon: <StyleIcon /> },
  { id: EditTool.Custom, name: 'Custom', icon: <CustomIcon /> },
];

const stylePresets: StylePreset[] = ['Impressionist Painting', 'Pencil Sketch', 'Anime', 'Cyberpunk', 'Vintage Film'];
const textPositions: TextPosition[] = ['top-left', 'top-center', 'top-right', 'middle-left', 'middle-center', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right'];
const fontFamilies: string[] = ['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana'];


const EditorUI: React.FC<EditorUIProps> = ({ 
  originalImage, history, setHistory, currentHistoryIndex, setCurrentHistoryIndex, resetEditor, onSaveProject
}) => {
  const [activeTool, setActiveTool] = useState<EditTool>(EditTool.None);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [resizeConfig, setResizeConfig] = useState({ width: 0, height: 0, aspectRatio: 1, locked: true });
  const [brightnessContrastConfig, setBrightnessContrastConfig] = useState({ brightness: 0, contrast: 0 });
  const [textConfig, setTextConfig] = useState({
    text: 'Hello World',
    fontSize: 48,
    color: '#FFFFFF',
    position: 'middle-center' as TextPosition,
    fontFamily: 'Arial',
  });
  
  const [compareSlider, setCompareSlider] = useState(50);
  const [isComparing, setIsComparing] = useState(false);
  const comparisonContainerRef = useRef<HTMLDivElement>(null);

  const currentImageState = history[currentHistoryIndex];
  const currentImage = currentImageState?.imageData;
  const currentImageType = currentImageState?.imageType;

  const executeAIEdit = useCallback(async (finalPrompt: string, tool: EditTool) => {
    if (!finalPrompt.trim()) {
      setError("Prompt cannot be empty for this tool.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { data: newImageData, mimeType: newMimeType } = await editImageWithAI(currentImage, currentImageType, finalPrompt);
      const newHistory: HistoryState = { imageData: newImageData, imageType: newMimeType, prompt: finalPrompt, tool: tool };
      const updatedHistory = history.slice(0, currentHistoryIndex + 1);
      setHistory([...updatedHistory, newHistory]);
      setCurrentHistoryIndex(updatedHistory.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [currentImage, currentImageType, history, currentHistoryIndex, setHistory, setCurrentHistoryIndex]);
  
  const handleLocalEdit = useCallback(async (newImageData: string, newImageType: string, description: string, tool: EditTool) => {
    const newHistory: HistoryState = { imageData: newImageData, imageType: newImageType, prompt: description, tool: tool };
    const updatedHistory = history.slice(0, currentHistoryIndex + 1);
    setHistory([...updatedHistory, newHistory]);
    setCurrentHistoryIndex(updatedHistory.length);
  }, [history, currentHistoryIndex, setHistory, setCurrentHistoryIndex]);


  const handleApply = useCallback(async () => {
     if ([EditTool.Inpaint, EditTool.Replace, EditTool.Custom].includes(activeTool) && !prompt.trim()) {
        setError("Prompt cannot be empty for this tool.");
        return;
    }
    const finalPrompt = getPromptForTool(activeTool, { prompt });
    if (finalPrompt) {
        executeAIEdit(finalPrompt, activeTool);
    }
  }, [activeTool, prompt, executeAIEdit]);
  
  useEffect(() => {
    if (activeTool === EditTool.Resize && currentImage) {
        getImageDimensions(currentImage, currentImageType).then(({width, height}) => {
            setResizeConfig({ width, height, aspectRatio: width / height, locked: true });
        });
    }
  }, [activeTool, currentImage, currentImageType]);


  const handleUndo = () => {
    if (currentHistoryIndex > 0) {
      setCurrentHistoryIndex(currentHistoryIndex - 1);
    }
  };

  const handleRedo = () => {
    if (currentHistoryIndex < history.length - 1) {
      setCurrentHistoryIndex(currentHistoryIndex + 1);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = `data:${currentImageType};base64,${currentImage}`;
    const extension = currentImageType.split('/')[1] || 'png';
    link.download = `edited-image-${Date.now()}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSave = () => {
    const defaultName = `Project ${new Date().toLocaleDateString()}`;
    const name = window.prompt("Enter a name for your project:", defaultName);
    if (name) {
        onSaveProject(name);
    }
  };
  
  const handleToolSelect = (toolId: EditTool) => {
    setActiveTool(toolId);
    setPrompt(''); 
    setError(null);
    if (toolId !== EditTool.BrightnessContrast) {
        setBrightnessContrastConfig({ brightness: 0, contrast: 0 });
    }
  }

  const handleStyleSelect = (selectedStyle: string) => {
    if (!selectedStyle) return;
    const finalPrompt = getPromptForTool(EditTool.Style, { style: selectedStyle as StylePreset });
    executeAIEdit(finalPrompt, EditTool.Style);
  };

  const handleResizeApply = async () => {
    setIsLoading(true);
    try {
        const newImageData = await resizeImage(currentImage, currentImageType, {width: resizeConfig.width, height: resizeConfig.height});
        handleLocalEdit(newImageData, currentImageType, `Resized to ${resizeConfig.width}x${resizeConfig.height}`, EditTool.Resize);
    } catch(err) {
        setError(err instanceof Error ? err.message : 'Failed to resize image');
    } finally {
        setIsLoading(false);
    }
  };

  const handleBrightnessContrastApply = async () => {
    setIsLoading(true);
    setError(null);
    try {
        const newImageData = await applyBrightnessContrast(currentImage, currentImageType, brightnessContrastConfig);
        handleLocalEdit(newImageData, currentImageType, `Adjust Brightness: ${brightnessContrastConfig.brightness}, Contrast: ${brightnessContrastConfig.contrast}`, EditTool.BrightnessContrast);
        setBrightnessContrastConfig({ brightness: 0, contrast: 0 });
    } catch(err) {
        setError(err instanceof Error ? err.message : 'Failed to apply adjustments');
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleTextApply = async () => {
    if (!textConfig.text.trim()) {
        setError("Text content cannot be empty.");
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
        const newImageData = await drawTextOnImage(currentImage, currentImageType, textConfig);
        handleLocalEdit(newImageData, currentImageType, `Added text: "${textConfig.text}"`, EditTool.Text);
    } catch(err) {
        setError(err instanceof Error ? err.message : 'Failed to add text');
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleComparisonStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsComparing(true);
  }, []);

  useEffect(() => {
    if (!isComparing) return;

    const container = comparisonContainerRef.current;
    if (!container) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const rect = container.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      let x = ((clientX - rect.left) / rect.width) * 100;
      x = Math.max(0, Math.min(100, x));
      setCompareSlider(x);
    };

    const handleEnd = () => {
      setIsComparing(false);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isComparing]);
  
  const getPreviewContainerStyle = (position: TextPosition): React.CSSProperties => {
    const styles: React.CSSProperties = {
        display: 'flex',
        padding: '20px'
    };
    const [y, x] = position.split('-');
    
    switch(y) {
        case 'top': styles.alignItems = 'flex-start'; break;
        case 'middle': styles.alignItems = 'center'; break;
        case 'bottom': styles.alignItems = 'flex-end'; break;
    }

    switch(x) {
        case 'left': styles.justifyContent = 'flex-start'; break;
        case 'center': styles.justifyContent = 'center'; break;
        case 'right': styles.justifyContent = 'flex-end'; break;
    }

    return styles;
  }

  const renderControlPanel = () => {
    switch (activeTool) {
      case EditTool.Resize:
          const handleDimChange = (dim: 'width' | 'height', valueStr: string) => {
              const value = parseInt(valueStr, 10);
              const numericValue = isNaN(value) ? 0 : value;

              if (resizeConfig.locked) {
                  if (dim === 'width') {
                      const newHeight = numericValue > 0 ? Math.round(numericValue / resizeConfig.aspectRatio) : 0;
                      setResizeConfig(c => ({...c, width: numericValue, height: newHeight }));
                  } else {
                      const newWidth = numericValue > 0 ? Math.round(numericValue * resizeConfig.aspectRatio) : 0;
                      setResizeConfig(c => ({...c, height: numericValue, width: newWidth }));
                  }
              } else {
                 setResizeConfig(c => ({...c, [dim]: numericValue }));
              }
          };
        return (
            <div className="flex items-center gap-4 w-full">
                <input type="number" value={resizeConfig.width} onChange={e => handleDimChange('width', e.target.value)} className="w-24 p-2 bg-[#112240] border border-[#233554] rounded-md" />
                <span className="text-[#8892b0]">x</span>
                <input type="number" value={resizeConfig.height} onChange={e => handleDimChange('height', e.target.value)} className="w-24 p-2 bg-[#112240] border border-[#233554] rounded-md" />
                <button onClick={() => setResizeConfig(c => ({...c, locked: !c.locked}))} title={resizeConfig.locked ? "Unlock Aspect Ratio" : "Lock Aspect Ratio"} className={`p-2 rounded-md ${resizeConfig.locked ? 'text-[#64FFDA] bg-[#233554]' : 'text-[#8892b0] hover:bg-[#495670]'}`}>
                    <LockIcon locked={resizeConfig.locked} />
                </button>
                <div className="flex-1"></div>
                <button onClick={handleResizeApply} title="Apply new dimensions" className="w-full md:w-auto bg-[#64FFDA] hover:bg-[#64ffda]/90 text-[#0A192F] font-semibold py-2 px-6 rounded-lg shadow-md transition-colors duration-200">
                    Apply Resize
                </button>
            </div>
        )
      case EditTool.BrightnessContrast:
        const canApplyAdjustments = brightnessContrastConfig.brightness !== 0 || brightnessContrastConfig.contrast !== 0;
        return (
            <div className="flex items-center gap-4 w-full max-w-xl">
                <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                        <label htmlFor="brightness" className="text-sm w-20 text-[#ccd6f6]">Brightness</label>
                        <input id="brightness" type="range" min="-100" max="100" value={brightnessContrastConfig.brightness} onChange={e => setBrightnessContrastConfig(c => ({ ...c, brightness: parseInt(e.target.value, 10) }))} className="w-full h-2 bg-[#233554] rounded-lg appearance-none cursor-pointer" />
                        <span className="w-12 text-center text-sm font-mono p-1 bg-[#112240] rounded text-[#ccd6f6]">{brightnessContrastConfig.brightness}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <label htmlFor="contrast" className="text-sm w-20 text-[#ccd6f6]">Contrast</label>
                        <input id="contrast" type="range" min="-100" max="100" value={brightnessContrastConfig.contrast} onChange={e => setBrightnessContrastConfig(c => ({ ...c, contrast: parseInt(e.target.value, 10) }))} className="w-full h-2 bg-[#233554] rounded-lg appearance-none cursor-pointer" />
                        <span className="w-12 text-center text-sm font-mono p-1 bg-[#112240] rounded text-[#ccd6f6]">{brightnessContrastConfig.contrast}</span>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row gap-2">
                    <button onClick={() => setBrightnessContrastConfig({ brightness: 0, contrast: 0 })} title="Reset adjustments" className="py-2 px-4 bg-[#233554] hover:bg-[#495670] rounded-md text-sm transition-colors">Reset</button>
                    <button onClick={handleBrightnessContrastApply} disabled={!canApplyAdjustments} title="Apply adjustments" className="py-2 px-6 bg-[#64FFDA] hover:bg-[#64ffda]/90 text-[#0A192F] font-semibold rounded-lg disabled:bg-[#233554] disabled:text-[#8892b0] disabled:cursor-not-allowed transition-colors">
                        Apply
                    </button>
                </div>
            </div>
        )
      case EditTool.Text:
        return (
            <div className="flex flex-col md:flex-row items-center gap-4 w-full flex-wrap">
                <textarea 
                    value={textConfig.text} 
                    onChange={e => setTextConfig(c => ({ ...c, text: e.target.value }))}
                    placeholder="Enter text..."
                    className="w-full md:flex-1 p-2 bg-[#112240] border border-[#233554] rounded-md resize-none"
                    rows={2}
                />
                <div className="flex items-center gap-2">
                    <label htmlFor="font-family" className="text-sm">Font:</label>
                    <select
                        id="font-family"
                        value={textConfig.fontFamily}
                        onChange={e => setTextConfig(c => ({ ...c, fontFamily: e.target.value }))}
                        className="p-2 bg-[#112240] border border-[#233554] rounded-md"
                    >
                        {fontFamilies.map(font => <option key={font} value={font}>{font}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <label htmlFor="font-size" className="text-sm">Size:</label>
                    <input 
                        id="font-size"
                        type="number" 
                        value={textConfig.fontSize} 
                        onChange={e => setTextConfig(c => ({ ...c, fontSize: parseInt(e.target.value, 10) || 0 }))} 
                        className="w-20 p-2 bg-[#112240] border border-[#233554] rounded-md"
                    />
                </div>
                <div className="flex items-center gap-2">
                     <label htmlFor="text-color" className="text-sm">Color:</label>
                    <input 
                        id="text-color"
                        type="color" 
                        value={textConfig.color} 
                        onChange={e => setTextConfig(c => ({ ...c, color: e.target.value }))}
                        className="w-10 h-10 p-1 bg-[#112240] border border-[#233554] rounded-md cursor-pointer"
                    />
                </div>
                 <div className="flex items-center gap-2">
                    <label htmlFor="text-pos" className="text-sm">Position:</label>
                    <select
                        id="text-pos"
                        value={textConfig.position}
                        onChange={e => setTextConfig(c => ({ ...c, position: e.target.value as TextPosition }))}
                        className="p-2 bg-[#112240] border border-[#233554] rounded-md"
                    >
                        {textPositions.map(pos => <option key={pos} value={pos}>{pos.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                    </select>
                </div>
                <button onClick={handleTextApply} title="Apply text overlay" className="w-full md:w-auto bg-[#64FFDA] hover:bg-[#64ffda]/90 text-[#0A192F] font-semibold py-2 px-6 rounded-lg shadow-md transition-colors duration-200">
                    Apply Text
                </button>
            </div>
        );
      case EditTool.RemoveBg:
      case EditTool.Retouch:
        return <button onClick={() => executeAIEdit(getPromptForTool(activeTool, {}), activeTool)} title={`Apply ${activeTool}`} className="w-full md:w-auto bg-[#64FFDA] hover:bg-[#64ffda]/90 text-[#0A192F] font-semibold py-2 px-6 rounded-lg shadow-md transition-colors duration-200">Apply {tools.find(t=>t.id===activeTool)?.name}</button>
      
      case EditTool.Style:
        return (
             <select onChange={e => handleStyleSelect(e.target.value)} value="" className="w-full md:w-64 p-2 bg-[#112240] border border-[#233554] rounded-md focus:outline-none focus:ring-2 focus:ring-[#64FFDA]">
                <option value="" disabled>Select a style...</option>
                {stylePresets.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
        )

      case EditTool.Inpaint:
      case EditTool.Replace:
      case EditTool.Custom:
        return (
          <div className="flex items-center gap-4 w-full">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your edit..."
              className="flex-1 p-2 bg-[#112240] border border-[#233554] rounded-md focus:outline-none focus:ring-2 focus:ring-[#64FFDA]"
            />
            <button onClick={handleApply} title="Apply custom edit" className="w-full md:w-auto bg-[#64FFDA] hover:bg-[#64ffda]/90 text-[#0A192F] font-semibold py-2 px-6 rounded-lg shadow-md transition-colors duration-200">
              Apply
            </button>
          </div>
        );
      default:
        return <p className="text-[#8892b0]">Select a tool to begin editing.</p>;
    }
  };

  if (!currentImage) {
      return (
          <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0A192F]">
              <p className="text-xl text-[#ccd6f6]">No image loaded.</p>
              <button onClick={resetEditor} className="mt-4 bg-[#64FFDA] hover:bg-[#64ffda]/90 text-[#0A192F] font-semibold py-2 px-4 rounded-lg">Go Home</button>
          </div>
      )
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0A192F] text-white font-sans">
      {isLoading && <Loader />}
      {/* Header */}
      <header className="flex-shrink-0 bg-[#112240]/50 backdrop-blur-sm p-3 flex items-center justify-between border-b border-[#233554]">
          <h1 className="text-xl font-bold">Nano Studio AI</h1>
          <div className="flex items-center gap-2">
            <button onClick={handleSave} title="Save Project" className="p-2 rounded-md hover:bg-[#233554] text-[#ccd6f6] hover:text-[#64FFDA] transition-colors"><SaveIcon /></button>
            <button onClick={handleDownload} title="Download Image" className="p-2 rounded-md hover:bg-[#233554] text-[#ccd6f6] hover:text-[#64FFDA] transition-colors"><DownloadIcon /></button>
            <button onClick={resetEditor} title="Return to home screen" className="bg-gray-700 hover:bg-red-500/30 hover:text-red-400 font-semibold py-2 px-4 rounded-lg transition-colors duration-200">
                Finish
            </button>
          </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar */}
        <aside className="w-20 bg-[#112240]/50 p-2 flex flex-col items-center gap-2 border-r border-[#233554]">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => handleToolSelect(tool.id)}
              title={tool.name}
              className={`w-16 h-16 flex flex-col items-center justify-center p-2 rounded-lg transition-colors duration-200 ${activeTool === tool.id ? 'bg-[#233554] text-[#64FFDA]' : 'hover:bg-[#233554] text-[#8892b0]'}`}
              aria-pressed={activeTool === tool.id}
            >
              {tool.icon}
              <span className="text-xs mt-1">{tool.name}</span>
            </button>
          ))}
          <div className="flex-grow"></div>
           <button onClick={handleUndo} disabled={currentHistoryIndex <= 0} title="Undo" className="p-2 rounded-md hover:bg-[#233554] disabled:text-gray-600 disabled:cursor-not-allowed"><UndoIcon /></button>
           <button onClick={handleRedo} disabled={currentHistoryIndex >= history.length - 1} title="Redo" className="p-2 rounded-md hover:bg-[#233554] disabled:text-gray-600 disabled:cursor-not-allowed"><RedoIcon /></button>
           <button onMouseDown={() => setShowComparison(true)} onMouseUp={() => setShowComparison(false)} onMouseLeave={() => setShowComparison(false)} title="Hold to Compare with Original" className="p-2 rounded-md hover:bg-[#233554]"><CompareIcon /></button>
        </aside>

        {/* Editor View */}
        <main className="flex-1 flex flex-col bg-black/20">
          <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
             <div ref={comparisonContainerRef} className="relative w-full h-full flex items-center justify-center" onMouseDown={handleComparisonStart} onTouchStart={handleComparisonStart}>
                <img 
                    src={`data:${currentImageType};base64,${currentImage}`} 
                    alt="Editable content" 
                    className="max-w-full max-h-full object-contain select-none" 
                    style={{
                        pointerEvents: 'none',
                        filter: activeTool === EditTool.BrightnessContrast 
                            ? `brightness(${100 + brightnessContrastConfig.brightness}%) contrast(${100 + brightnessContrastConfig.contrast}%)` 
                            : 'none',
                        transition: 'filter 0.1s linear'
                    }} 
                />
                
                {activeTool === EditTool.Text && textConfig.text && (
                    <div className="absolute inset-0 pointer-events-none" style={getPreviewContainerStyle(textConfig.position)}>
                        <span style={{ 
                            fontSize: `${textConfig.fontSize}px`, 
                            color: textConfig.color, 
                            fontFamily: textConfig.fontFamily,
                            textShadow: '1px 1px 3px rgba(0,0,0,0.6)',
                            whiteSpace: 'pre-wrap',
                            textAlign: textConfig.position.endsWith('left') ? 'left' : textConfig.position.endsWith('right') ? 'right' : 'center',
                        }}>
                            {textConfig.text}
                        </span>
                    </div>
                )}

                {showComparison && (
                    <div className="absolute top-0 left-0 right-0 bottom-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - compareSlider}% 0 0)` }}>
                        <img src={`data:${originalImage.type};base64,${originalImage.data}`} alt="Original content" className="max-w-full max-h-full object-contain absolute top-0 left-0" />
                    </div>
                )}
                {showComparison && (
                    <div className="absolute top-0 bottom-0 bg-white/80 w-1 cursor-ew-resize" style={{ left: `${compareSlider}%`, transform: 'translateX(-50%)' }}>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full p-1 border-2 border-gray-500">
                        <svg className="w-6 h-6 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
                        </div>
                    </div>
                )}
            </div>
          </div>
          <footer className="flex-shrink-0 bg-[#112240]/50 p-4 border-t border-[#233554] min-h-[80px] flex items-center justify-center">
            {renderControlPanel()}
          </footer>
        </main>
      </div>
    </div>
  );
};

export default EditorUI;