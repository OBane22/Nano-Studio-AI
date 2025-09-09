import React, { useState, useCallback, useEffect, useRef } from 'react';
import { EditTool, HistoryState, StylePreset } from '../types';
import { getPromptForTool, editImageWithAI } from '../services/geminiService';
import { resizeImage, getImageDimensions } from '../services/resizeService';
import { 
  RemoveBgIcon, RetouchIcon, InpaintIcon, ReplaceIcon, StyleIcon, CustomIcon, 
  UndoIcon, RedoIcon, CompareIcon, DownloadIcon, ResizeIcon, LockIcon, SaveIcon
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
  { id: EditTool.RemoveBg, name: 'Remove BG', icon: <RemoveBgIcon /> },
  { id: EditTool.Retouch, name: 'Retouch', icon: <RetouchIcon /> },
  { id: EditTool.Inpaint, name: 'Inpaint', icon: <InpaintIcon /> },
  { id: EditTool.Replace, name: 'Replace', icon: <ReplaceIcon /> },
  { id: EditTool.Style, name: 'Style', icon: <StyleIcon /> },
  { id: EditTool.Custom, name: 'Custom', icon: <CustomIcon /> },
];

const stylePresets: StylePreset[] = ['Impressionist Painting', 'Pencil Sketch', 'Anime', 'Cyberpunk', 'Vintage Film'];

const EditorUI: React.FC<EditorUIProps> = ({ 
  originalImage, history, setHistory, currentHistoryIndex, setCurrentHistoryIndex, resetEditor, onSaveProject
}) => {
  const [activeTool, setActiveTool] = useState<EditTool>(EditTool.None);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [resizeConfig, setResizeConfig] = useState({ width: 0, height: 0, aspectRatio: 1, locked: true });
  
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
      case EditTool.Inpaint:
      case EditTool.Replace:
        return <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={
          activeTool === EditTool.Inpaint ? "e.g., 'the person on the left'" : 
          "e.g., 'the hat with a crown'"
        } className="w-full h-24 p-2 bg-[#112240] border border-[#233554] rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-[#64FFDA]" />;
      case EditTool.Custom:
        return <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe your desired edit..." 
          className="w-full h-24 p-2 bg-[#112240] border border-[#233554] rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-[#64FFDA]" />;
      case EditTool.Style:
        return (
          <select defaultValue="" onChange={(e) => handleStyleSelect(e.target.value)} className="w-full p-2 bg-[#112240] border border-[#233554] rounded-md focus:outline-none focus:ring-2 focus:ring-[#64FFDA]">
            <option value="" disabled>Select a style to apply...</option>
            {stylePresets.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        );
      case EditTool.None:
        return <p className="text-[#8892b0]">Select a tool to begin editing.</p>;
      default:
        return <p className="text-[#8892b0]">Ready to apply changes.</p>;
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row bg-[#0A192F]">
      {isLoading && <Loader />}
      
      <aside className="w-full md:w-20 bg-[#112240]/50 backdrop-blur-sm p-2 flex md:flex-col items-center justify-start gap-2 border-b md:border-r border-[#233554]">
        <button onClick={resetEditor} className="p-2.5 rounded-lg hover:bg-red-500/20 text-red-400 mb-4" title="Upload New Image">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 9V5a3 3 0 0 0-3-3l-4 4" /><path d="M10.5 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3.5" /></svg>
        </button>
        {tools.map(tool => (
          <button key={tool.id} onClick={() => handleToolSelect(tool.id)} 
                  className={`p-2.5 rounded-lg transition-colors duration-200 ${activeTool === tool.id ? 'bg-[#64FFDA] text-[#0A192F]' : 'hover:bg-[#233554] text-[#8892b0]'}`}
                  title={tool.name}>
            {tool.icon}
          </button>
        ))}
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-[#112240]/50 backdrop-blur-sm p-2 flex items-center justify-between border-b border-[#233554]">
          <div className="flex items-center gap-2">
            <button onClick={handleUndo} disabled={currentHistoryIndex === 0} title="Undo (Ctrl+Z)" className="p-2 rounded-md hover:bg-[#233554] disabled:opacity-50 disabled:cursor-not-allowed"><UndoIcon /></button>
            <button onClick={handleRedo} disabled={currentHistoryIndex === history.length - 1} title="Redo (Ctrl+Y)" className="p-2 rounded-md hover:bg-[#233554] disabled:opacity-50 disabled:cursor-not-allowed"><RedoIcon /></button>
            <button onClick={() => setShowComparison(!showComparison)} title="Compare with Original" className={`p-2 rounded-md ${showComparison ? 'bg-[#64FFDA] text-[#0A192F]' : 'hover:bg-[#233554]'}`}><CompareIcon /></button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSave} title="Save Project" className="flex items-center gap-2 bg-[#233554] hover:bg-[#495670] text-[#ccd6f6] font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-200">
              <SaveIcon />
              <span>Save</span>
            </button>
            <button onClick={handleDownload} title="Download Image" className="flex items-center gap-2 bg-[#64FFDA] hover:bg-[#64ffda]/90 text-[#0A192F] font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-200">
              <DownloadIcon />
              <span>Download</span>
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 md:p-8 flex justify-center items-center bg-[#0A192F]/50 overflow-auto">
          <div 
            ref={comparisonContainerRef}
            className="relative max-w-full max-h-full select-none"
            style={{ cursor: isComparing ? 'ew-resize' : 'default' }}
          >
            <img src={`data:${currentImageType};base64,${currentImage}`} alt="Editable" className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl block" />
            {showComparison && (
              <div className="absolute inset-0 overflow-hidden rounded-lg">
                <img 
                    src={`data:${originalImage.type};base64,${originalImage.data}`} 
                    alt="Original" 
                    className="max-w-full max-h-[80vh] object-contain absolute inset-0 w-full h-full rounded-lg" 
                    style={{ clipPath: `polygon(0 0, ${compareSlider}% 0, ${compareSlider}% 100%, 0 100%)` }} 
                />
                <div 
                    className="absolute top-4 left-4 text-white font-bold text-xs bg-black/60 px-2 py-1 rounded-md pointer-events-none transition-opacity"
                    style={{ opacity: compareSlider > 10 ? 1 : 0 }}
                >
                    Original
                </div>
                 <div 
                    className="absolute top-4 right-4 text-white font-bold text-xs bg-black/60 px-2 py-1 rounded-md pointer-events-none transition-opacity"
                    style={{ opacity: compareSlider < 90 ? 1 : 0 }}
                >
                    Edited
                </div>
                
                <div 
                    className="absolute top-0 bottom-0 w-1 bg-white/50 cursor-ew-resize group" 
                    style={{ left: `${compareSlider}%`, transform: 'translateX(-50%)' }}
                    onMouseDown={handleComparisonStart}
                    onTouchStart={handleComparisonStart}
                >
                    <div className="absolute top-1/2 left-1/2 w-10 h-10 -translate-x-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm rounded-full border-2 border-white flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110">
                        <svg className="w-6 h-6 text-[#0A192F] transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                        </svg>
                    </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {activeTool !== EditTool.None && (
          <div className="bg-[#112240]/50 backdrop-blur-sm p-4 border-t border-[#233554] flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 w-full">
              {renderControlPanel()}
              {error && <p className="text-red-400 mt-2 text-sm">{error}</p>}
            </div>
            {![EditTool.Style, EditTool.RemoveBg, EditTool.Retouch, EditTool.Resize].includes(activeTool) && (
                <button onClick={handleApply} title="Apply this edit" className="w-full md:w-auto bg-[#64FFDA] hover:bg-[#64ffda]/90 text-[#0A192F] font-semibold py-2 px-6 rounded-lg shadow-md transition-colors duration-200">
                Apply
                </button>
            )}
            {[EditTool.RemoveBg, EditTool.Retouch].includes(activeTool) && (
                <button onClick={handleApply} title="Apply this action" className="w-full md:w-auto bg-[#64FFDA] hover:bg-[#64ffda]/90 text-[#0A192F] font-semibold py-2 px-6 rounded-lg shadow-md transition-colors duration-200">
                Apply Action
                </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default EditorUI;