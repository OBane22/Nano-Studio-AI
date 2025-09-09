import React, { useState, useCallback } from 'react';
import { BatchImage, BatchStep, EditTool, StylePreset, OutputFormat } from '../types';
import { getPromptForTool, editImageWithAI } from '../services/geminiService';
import { resizeImage } from '../services/resizeService';
import { AddIcon, TrashIcon, DownloadIcon } from './icons';
import Loader from './Loader';

interface BatchEditorUIProps {
    initialImages: BatchImage[];
    onCancel: () => void;
}

const stylePresets: StylePreset[] = ['Impressionist Painting', 'Pencil Sketch', 'Anime', 'Cyberpunk', 'Vintage Film'];
const toolOptions = [
  { id: EditTool.Resize, name: 'Resize' },
  { id: EditTool.RemoveBg, name: 'Remove BG' },
  { id: EditTool.Retouch, name: 'Retouch' },
  { id: EditTool.Inpaint, name: 'Inpaint' },
  { id: EditTool.Replace, name: 'Replace' },
  { id: EditTool.Style, name: 'Style' },
  { id: EditTool.Custom, name: 'Custom' },
];


const AddStepForm: React.FC<{onAddStep: (step: BatchStep) => void}> = ({ onAddStep }) => {
    const [tool, setTool] = useState<EditTool>(EditTool.Resize);
    const [prompt, setPrompt] = useState('');
    const [style, setStyle] = useState<StylePreset>(stylePresets[0]);
    const [resizeWidth, setResizeWidth] = useState(1024);
    const [resizeHeight, setResizeHeight] = useState(1024);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const params: BatchStep['params'] = {};
        if ([EditTool.Inpaint, EditTool.Replace, EditTool.Custom].includes(tool)) {
            params.prompt = prompt;
        }
        if (tool === EditTool.Style) {
            params.style = style;
        }
        if (tool === EditTool.Resize) {
            params.width = resizeWidth;
            params.height = resizeHeight;
        }

        onAddStep({
            id: `step-${Date.now()}`,
            tool,
            params
        });
    }

    return (
        <form onSubmit={handleSubmit} className="p-4 bg-[#112240]/50 rounded-lg space-y-3">
            <select value={tool} onChange={e => setTool(e.target.value as EditTool)} className="w-full p-2 bg-[#233554] border border-[#112240] rounded-md focus:outline-none focus:ring-2 focus:ring-[#64FFDA]">
                {toolOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            
            {tool === EditTool.Resize && (
                 <div className="flex items-center gap-2">
                    <input type="number" value={resizeWidth} onChange={e => setResizeWidth(parseInt(e.target.value, 10) || 0)} placeholder="Width" required className="w-full p-2 bg-[#233554] border border-[#112240] rounded-md" />
                    <span className="text-[#8892b0]">x</span>
                    <input type="number" value={resizeHeight} onChange={e => setResizeHeight(parseInt(e.target.value, 10) || 0)} placeholder="Height" required className="w-full p-2 bg-[#233554] border border-[#112240] rounded-md" />
                 </div>
            )}
            {[EditTool.Inpaint, EditTool.Replace, EditTool.Custom].includes(tool) && (
                 <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Enter prompt..." required className="w-full h-20 p-2 bg-[#233554] border border-[#112240] rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-[#64FFDA]" />
            )}
            {tool === EditTool.Style && (
                 <select value={style} onChange={e => setStyle(e.target.value as StylePreset)} className="w-full p-2 bg-[#233554] border border-[#112240] rounded-md focus:outline-none focus:ring-2 focus:ring-[#64FFDA]">
                    {stylePresets.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
            )}
            <button type="submit" className="w-full flex items-center justify-center gap-2 bg-[#64FFDA] hover:bg-[#64ffda]/90 text-[#0A192F] font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-200">
                <AddIcon/> Add Step
            </button>
        </form>
    )
}


const BatchEditorUI: React.FC<BatchEditorUIProps> = ({ initialImages, onCancel }) => {
    const [images, setImages] = useState<BatchImage[]>(initialImages);
    const [recipe, setRecipe] = useState<BatchStep[]>([]);
    const [outputFormat, setOutputFormat] = useState<OutputFormat>('image/png');
    const [customName, setCustomName] = useState<string>('edited-image');
    const [startNumber, setStartNumber] = useState<number>(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isAddingStep, setIsAddingStep] = useState(false);

    const handleAddStep = (step: BatchStep) => {
        setRecipe(prev => [...prev, step]);
        setIsAddingStep(false);
    }
    
    const handleRemoveStep = (stepId: string) => {
        setRecipe(prev => prev.filter(step => step.id !== stepId));
    }
    
    const handleStartProcessing = useCallback(async () => {
        setIsProcessing(true);
        
        const processingQueue = [...images];
        for (const image of processingQueue) {
            setImages(prev => prev.map(img => img.id === image.id ? { ...img, status: 'processing' } : img));
            
            let currentImageData = image.originalData;
            let currentMimeType = image.originalType;
            let success = true;
            let finalError = 'An unknown error occurred';
            
            for (const step of recipe) {
                try {
                    if (step.tool === EditTool.Resize) {
                        if (step.params.width && step.params.height) {
                           currentImageData = await resizeImage(currentImageData, currentMimeType, { width: step.params.width, height: step.params.height });
                        }
                    } else {
                        const prompt = getPromptForTool(step.tool, step.params);
                        const result = await editImageWithAI(currentImageData, currentMimeType, prompt);
                        currentImageData = result.data;
                        currentMimeType = result.mimeType;
                    }
                } catch(err) {
                    success = false;
                    finalError = err instanceof Error ? err.message : String(err);
                    break;
                }
            }
            
            setImages(prev => prev.map(img => img.id === image.id ? { 
                ...img, 
                status: success ? 'done' : 'error',
                processedData: success ? currentImageData : undefined,
                processedType: success ? currentMimeType : undefined,
                error: success ? undefined : finalError,
            } : img));
        }
        setIsProcessing(false);
    }, [images, recipe]);

    const handleDownload = (image: BatchImage, index: number) => {
        if (!image.processedData) return;
        const link = document.createElement('a');
        const mimeType = image.processedType || outputFormat;
        link.href = `data:${mimeType};base64,${image.processedData}`;
        const extension = mimeType.split('/')[1] || 'png';
        const sanitizedName = customName.replace(/[^a-zA-Z0-9_-]/g, '') || 'image';
        const finalStartNumber = Math.max(1, startNumber);
        link.download = `${sanitizedName}-${finalStartNumber + index}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadAll = () => {
        const doneImages = images.filter(img => img.status === 'done');
        doneImages.forEach((image, i) => {
            const originalIndex = images.findIndex(img => img.id === image.id);
            // Add a small delay between downloads to prevent browser blocking
            setTimeout(() => {
                handleDownload(image, originalIndex);
            }, i * 300);
        });
    };

    const progress = images.filter(img => img.status === 'done' || img.status === 'error').length / images.length * 100;

    const getStepDescription = (step: BatchStep) => {
        if (step.tool === EditTool.Resize) return `${step.params.width}x${step.params.height}`;
        return step.params.style || step.params.prompt || 'No params';
    }

    return (
        <div className="h-screen w-screen flex flex-col bg-[#0A192F] text-white">
            {isProcessing && <Loader message={`Processing images... ${Math.round(progress)}% complete`} />}
            {/* Header */}
            <header className="flex-shrink-0 bg-[#112240]/50 backdrop-blur-sm p-3 flex items-center justify-between border-b border-[#233554]">
                <h1 className="text-xl font-bold">Batch Editor</h1>
                <button onClick={onCancel} title="Return to home screen" className="bg-gray-700 hover:bg-red-500/30 hover:text-red-400 font-semibold py-2 px-4 rounded-lg transition-colors duration-200">
                    Cancel Batch
                </button>
            </header>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Left Panel: Recipe */}
                <aside className="w-full md:w-80 lg:w-96 flex flex-col p-4 bg-[#112240]/50 border-r border-[#233554] overflow-y-auto">
                    <h2 className="text-lg font-semibold mb-4">Editing Recipe</h2>
                    <div className="space-y-2 flex-1">
                        {recipe.map((step, index) => (
                            <div key={step.id} className="p-3 bg-[#112240] rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="font-bold">Step {index + 1}: {toolOptions.find(t=>t.id === step.tool)?.name}</p>
                                    <p className="text-sm text-[#8892b0] truncate">{getStepDescription(step)}</p>
                                </div>
                                <button onClick={() => handleRemoveStep(step.id)} title="Remove this step" className="text-red-400 hover:text-red-300 p-1"><TrashIcon /></button>
                            </div>
                        ))}
                    </div>
                    {isAddingStep && <AddStepForm onAddStep={handleAddStep} />}
                    <button onClick={() => setIsAddingStep(p => !p)} title={isAddingStep ? 'Hide form' : 'Add a new step to the recipe'} className="w-full mt-4 bg-[#233554] hover:bg-[#495670] text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-200">
                        {isAddingStep ? 'Cancel' : 'Add New Step'}
                    </button>
                </aside>

                {/* Center Panel: Image Grid */}
                <main className="flex-1 p-4 overflow-y-auto">
                     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {images.map((image, index) => (
                            <div key={image.id} className="relative aspect-square bg-[#112240] rounded-lg overflow-hidden group">
                                <img src={`data:${image.processedType || image.originalType};base64,${image.processedData || image.originalData}`} alt={`Image ${image.id}`} className="w-full h-full object-cover"/>
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    {image.status === 'done' && <button onClick={() => handleDownload(image, index)} title="Download processed image" className="p-3 bg-[#64FFDA] text-[#0A192F] rounded-full hover:bg-[#64ffda]/90"><DownloadIcon /></button>}
                                </div>
                                <div className={`absolute bottom-0 left-0 right-0 p-1.5 text-xs text-center font-semibold ${
                                    image.status === 'pending' ? 'bg-[#495670]/80 text-white' : 
                                    image.status === 'processing' ? 'bg-[#64FFDA]/80 animate-pulse text-[#0A192F]' : 
                                    image.status === 'done' ? 'bg-[#64FFDA]/80 text-[#0A192F]' : 'bg-red-500/80 text-white'
                                }`}>
                                    {image.status === 'error' ? 'Error' : image.status.charAt(0).toUpperCase() + image.status.slice(1)}
                                </div>
                            </div>
                        ))}
                     </div>
                </main>

                {/* Right Panel: Controls */}
                <aside className="w-full md:w-64 p-4 bg-[#112240]/50 border-l border-[#233554] flex flex-col gap-4">
                    <h2 className="text-lg font-semibold">Output</h2>
                     <div>
                        <label htmlFor="format" className="block text-sm font-medium text-[#ccd6f6] mb-1">Format</label>
                        <select id="format" value={outputFormat} onChange={e => setOutputFormat(e.target.value as OutputFormat)} className="w-full p-2 bg-[#233554] border border-[#112240] rounded-md focus:outline-none focus:ring-2 focus:ring-[#64FFDA]">
                            <option value="image/png">PNG</option>
                            <option value="image/jpeg">JPEG</option>
                            <option value="image/webp">WebP</option>
                        </select>
                    </div>

                    <div className="mt-2">
                        <label htmlFor="customName" className="block text-sm font-medium text-[#ccd6f6] mb-1">File Name</label>
                        <input
                            id="customName"
                            type="text"
                            value={customName}
                            onChange={e => setCustomName(e.target.value)}
                            placeholder="e.g., edited-image"
                            title="Set a base name for downloaded files"
                            className="w-full p-2 bg-[#233554] border border-[#112240] rounded-md"
                        />
                        <label htmlFor="startNumber" className="block text-sm font-medium text-[#ccd6f6] mb-1 mt-2">Start Number</label>
                         <input
                            id="startNumber"
                            type="number"
                            min="1"
                            value={startNumber}
                            onChange={e => setStartNumber(parseInt(e.target.value, 10) || 1)}
                            title="Set the starting number for the sequence"
                            className="w-full p-2 bg-[#233554] border border-[#112240] rounded-md"
                        />
                         <p className="text-xs text-[#8892b0] mt-1">Example: {customName || 'image'}-{startNumber}.{outputFormat.split('/')[1]}</p>
                    </div>

                    <div className="flex-1"></div>
                    <div>
                        <div className="w-full bg-[#233554] rounded-full h-2.5 mb-2">
                           <div className="bg-[#64FFDA] h-2.5 rounded-full" style={{width: `${progress}%`}}></div>
                        </div>
                        <p className="text-sm text-center text-[#8892b0]">{Math.round(progress)}% Complete</p>
                    </div>
                    <button onClick={handleDownloadAll} disabled={images.every(img => img.status !== 'done')} title="Download all successfully processed images" className="w-full bg-[#233554] hover:bg-[#495670] text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-200 disabled:bg-[#112240] disabled:text-[#495670] disabled:cursor-not-allowed">
                        Download All
                    </button>
                    <button onClick={handleStartProcessing} disabled={isProcessing || recipe.length === 0} title="Start processing all images with the current recipe" className="w-full bg-[#64FFDA] hover:bg-[#64ffda]/90 text-[#0A192F] font-bold py-3 px-4 rounded-lg shadow-lg disabled:bg-[#495670] disabled:cursor-not-allowed transition-colors duration-200">
                        {isProcessing ? 'Processing...' : `Process ${images.length} Images`}
                    </button>
                </aside>
            </div>
        </div>
    );
};

export default BatchEditorUI;