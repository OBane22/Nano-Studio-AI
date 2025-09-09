import React, { useState, useCallback, useEffect } from 'react';
import UploadScreen from './components/UploadScreen';
import EditorUI from './components/EditorUI';
import BatchEditorUI from './components/BatchEditorUI';
import { HistoryState, EditTool, BatchImage, Project } from './types';
import { CloseIcon } from './components/icons';
import { getProjects, saveProject, deleteProject } from './services/projectService';

const App: React.FC = () => {
  const [images, setImages] = useState<BatchImage[]>([]);
  const [mode, setMode] = useState<'upload' | 'single' | 'batch'>('upload');
  
  // State specifically for single-image editing mode
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    setProjects(getProjects());
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleImagesSelected = useCallback((imageDataArray: { data: string, type: string }[], selectedMode: 'single' | 'batch') => {
    const newImages: BatchImage[] = imageDataArray.map((img, index) => ({
      id: `${Date.now()}-${index}`,
      originalData: img.data,
      originalType: img.type,
      status: 'pending',
    }));
    setImages(newImages);
    setMode(selectedMode);
    setCurrentProjectId(null); // This is a new session

    if (selectedMode === 'single' && newImages.length > 0) {
      const initialState: HistoryState = { 
        imageData: newImages[0].originalData, 
        imageType: newImages[0].originalType,
        prompt: 'Initial state', 
        tool: EditTool.None 
      };
      setHistory([initialState]);
      setCurrentHistoryIndex(0);
    }
  }, []);

  const resetApp = useCallback(() => {
    setImages([]);
    setHistory([]);
    setCurrentHistoryIndex(-1);
    setCurrentProjectId(null);
    setMode('upload');
    setError(null);
  }, []);

  const handleSaveProject = useCallback((name: string) => {
    if (images.length === 0) return;

    const project: Project = {
        id: currentProjectId || `proj-${Date.now()}`,
        name,
        originalImage: { data: images[0].originalData, type: images[0].originalType },
        history,
        currentHistoryIndex,
        savedAt: new Date().toISOString(),
    };
    saveProject(project);
    setProjects(getProjects()); // Refresh projects list
    setCurrentProjectId(project.id);
    alert('Project saved successfully!');
  }, [images, history, currentHistoryIndex, currentProjectId]);

  const handleLoadProject = useCallback((projectId: string) => {
    const projectToLoad = getProjects().find(p => p.id === projectId);
    if (!projectToLoad) {
      setError('Could not find the project to load.');
      return;
    }
    
    setImages([{
        id: `img-${Date.now()}`,
        originalData: projectToLoad.originalImage.data,
        originalType: projectToLoad.originalImage.type,
        status: 'pending',
    }]);
    setHistory(projectToLoad.history);
    setCurrentHistoryIndex(projectToLoad.currentHistoryIndex);
    setCurrentProjectId(projectToLoad.id);
    setMode('single');
  }, []);

  const handleDeleteProject = useCallback((projectId: string) => {
    if (window.confirm('Are you sure you want to delete this project? This cannot be undone.')) {
        deleteProject(projectId);
        setProjects(getProjects());
    }
  }, []);

  const renderContent = () => {
    switch(mode) {
      case 'single':
        if (images.length === 0) {
            setMode('upload');
            return null;
        }
        return (
          <EditorUI 
            originalImage={{ data: images[0].originalData, type: images[0].originalType }}
            history={history}
            setHistory={setHistory}
            currentHistoryIndex={currentHistoryIndex}
            setCurrentHistoryIndex={setCurrentHistoryIndex}
            resetEditor={resetApp}
            onSaveProject={handleSaveProject}
          />
        );
      case 'batch':
        return <BatchEditorUI initialImages={images} onCancel={resetApp} />;
      case 'upload':
      default:
        return <UploadScreen 
          onImagesSelected={handleImagesSelected} 
          setError={setError}
          projects={projects}
          onLoadProject={handleLoadProject}
          onDeleteProject={handleDeleteProject}
        />;
    }
  };
  
  return (
    <div className="font-sans antialiased">
        {error && (
            <div className="fixed top-5 right-5 bg-red-500 text-white py-2 px-4 rounded-lg shadow-lg flex items-center gap-2 z-[100]">
                <span>{error}</span>
                <button onClick={() => setError(null)} title="Dismiss"><CloseIcon /></button>
            </div>
        )}
        {renderContent()}
    </div>
  );
};

export default App;