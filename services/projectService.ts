import { Project } from '../types';

const PROJECTS_STORAGE_KEY = 'nano-ai-studio-projects';

export const getProjects = (): Project[] => {
  try {
    const projectsJson = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (!projectsJson) return [];
    const projects = JSON.parse(projectsJson) as Project[];
    // Sort by date, newest first
    return projects.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  } catch (error) {
    console.error("Failed to load projects from local storage:", error);
    return [];
  }
};

export const saveProject = (project: Project): void => {
  try {
    const projects = getProjects();
    const existingIndex = projects.findIndex(p => p.id === project.id);
    if (existingIndex > -1) {
      projects[existingIndex] = project;
    } else {
      projects.unshift(project); // Add to the beginning
    }
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error("Failed to save project to local storage:", error);
  }
};

export const deleteProject = (projectId: string): void => {
  try {
    let projects = getProjects();
    projects = projects.filter(p => p.id !== projectId);
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error("Failed to delete project from local storage:", error);
  }
};
