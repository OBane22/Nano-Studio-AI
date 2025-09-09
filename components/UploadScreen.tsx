import React, { useCallback } from 'react';
import { UploadIcon, BatchIcon, TrashIcon } from './icons';
import { Project } from '../types';

interface UploadScreenProps {
  onImagesSelected: (images: { data: string, type: string }[], mode: 'single' | 'batch') => void;
  setError: (error: string | null) => void;
  projects: Project[];
  onLoadProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
}

const UploadScreen: React.FC<UploadScreenProps> = ({ onImagesSelected, setError, projects, onLoadProject, onDeleteProject }) => {

  const handleFiles = useCallback((files: FileList | null, mode: 'single' | 'batch') => {
    if (!files || files.length === 0) {
      return;
    }
    
    if (mode === 'single' && files.length > 1) {
        setError("Please select only one file for single edit mode.");
        return;
    }

    const validFiles = Array.from(files).filter(file => file.type.startsWith('image/'));

    if (validFiles.length !== files.length) {
      setError('One or more selected files were not valid images (PNG, JPG, WebP).');
    }
    
    if (validFiles.length === 0) {
        return;
    }

    setError(null);

    const imagePromises = validFiles.map(file => {
      return new Promise<{ data: string, type: string }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          const base64Data = result.split(',')[1];
          resolve({ data: base64Data, type: file.type });
        };
        reader.onerror = () => {
          reject(new Error('Failed to read the image file.'));
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(imagePromises)
      .then(imageDataArray => {
        onImagesSelected(imageDataArray, mode);
      })
      .catch(err => {
        setError(err.message);
      });

  }, [onImagesSelected, setError]);
  
  const createClickHandler = (id: string) => () => {
    document.getElementById(id)?.click()
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A192F] p-4">
       <div className="text-center mb-12">
            <h1 className="text-5xl font-bold tracking-tight text-white">Nano Studio AI</h1>
            <p className="mt-4 text-lg text-[#8892b0]">Your AI-powered creative suite. Choose your workflow.</p>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        <div 
          onClick={createClickHandler('single-file-upload')}
          title="Click to upload a single image for editing"
          className="group relative cursor-pointer p-8 bg-[#112240]/50 rounded-2xl border-2 border-dashed border-[#233554] hover:border-[#64FFDA] hover:bg-[#112240] transition-all duration-300 flex flex-col items-center justify-center text-center"
        >
          <div className="text-[#8892b0] group-hover:text-[#64FFDA] transition-colors duration-300">
            <UploadIcon />
          </div>
          <h3 className="mt-4 text-xl font-semibold text-white">Single Photo Edit</h3>
          <p className="mt-2 text-[#8892b0]">Upload one image for detailed, hands-on editing.</p>
          <input id="single-file-upload" type="file" className="sr-only" onChange={e => handleFiles(e.target.files, 'single')} accept="image/png, image/jpeg, image/webp" />
        </div>
        
        <div 
          onClick={createClickHandler('batch-file-upload')}
          title="Click to upload multiple images for batch processing"
          className="group relative cursor-pointer p-8 bg-[#112240]/50 rounded-2xl border-2 border-dashed border-[#233554] hover:border-[#64FFDA] hover:bg-[#112240] transition-all duration-300 flex flex-col items-center justify-center text-center"
        >
          <div className="text-[#8892b0] group-hover:text-[#64FFDA] transition-colors duration-300">
            <BatchIcon />
          </div>
          <h3 className="mt-4 text-xl font-semibold text-white">Batch Edit Photos</h3>
          <p className="mt-2 text-[#8892b0]">Apply the same edits to multiple images at once.</p>
          <input id="batch-file-upload" type="file" multiple className="sr-only" onChange={e => handleFiles(e.target.files, 'batch')} accept="image/png, image/jpeg, image/webp" />
        </div>
      </div>
      
      {projects.length > 0 && (
          <div className="w-full max-w-4xl mt-12">
              <h2 className="text-2xl font-bold text-center text-white mb-6">Saved Projects</h2>
              <div className="bg-[#112240]/50 rounded-lg border border-[#233554] max-h-96 overflow-y-auto">
                  <ul className="divide-y divide-[#233554]">
                      {projects.map(project => (
                          <li key={project.id} className="p-4 flex justify-between items-center hover:bg-[#112240] transition-colors duration-200">
                              <div>
                                  <p className="font-semibold text-white">{project.name}</p>
                                  <p className="text-sm text-[#8892b0]">Saved on {new Date(project.savedAt).toLocaleString()}</p>
                              </div>
                              <div className="flex items-center gap-4">
                                  <button 
                                      onClick={() => onLoadProject(project.id)}
                                      title="Load this project and continue editing"
                                      className="bg-[#64FFDA] hover:bg-[#64ffda]/90 text-[#0A192F] font-semibold py-1 px-4 rounded-md text-sm transition-colors duration-200"
                                  >
                                      Load
                                  </button>
                                  <button 
                                      onClick={() => onDeleteProject(project.id)}
                                      className="text-red-400 hover:text-red-300 p-1"
                                      title="Delete Project"
                                  >
                                      <TrashIcon />
                                  </button>
                              </div>
                          </li>
                      ))}
                  </ul>
              </div>
          </div>
      )}
    </div>
  );
};

export default UploadScreen;