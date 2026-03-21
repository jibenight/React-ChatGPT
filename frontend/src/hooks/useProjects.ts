import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import * as tauri from '@/tauriClient';
import type { Project } from '@/types';

type ProjectData = {
  name: string;
  description?: string;
  instructions?: string;
  context_data?: string;
};

type UseProjectsReturn = {
  projects: Project[];
  loadingProjects: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  createProject: (data: ProjectData) => Promise<Project | null>;
  updateProject: (id: number, data: Partial<ProjectData>) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;
};

export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoadingProjects(true);
    setError(null);
    try {
      const result = await tauri.listProjects() as Project[];
      setProjects(result || []);
    } catch (err) {
      console.error(err);
      setError('Erreur lors du chargement des projets.');
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  const createProject = useCallback(async (data: ProjectData): Promise<Project | null> => {
    setError(null);

    const tempId = `temp-${Date.now()}`;
    const optimisticProject: Project = {
      id: tempId,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let previousProjects: Project[] = [];
    setProjects((prev) => {
      previousProjects = prev;
      return [optimisticProject, ...prev];
    });

    try {
      const created = await tauri.createProject(data) as Project | null;

      if (created) {
        setProjects((prev) => prev.map((p) => (p.id === tempId ? created : p)));
      } else {
        setProjects((prev) => prev.filter((p) => p.id !== tempId));
      }

      return created;
    } catch (err) {
      console.error(err);
      setProjects(previousProjects);
      setError('Erreur lors de la création du projet.');
      toast.error('Erreur lors de la création du projet');
      return null;
    }
  }, []);

  const updateProject = useCallback(async (id: number, data: Partial<ProjectData>) => {
    setError(null);

    let previousProjects: Project[] = [];
    setProjects((prev) => {
      previousProjects = prev;
      return prev.map((p) => (p.id === id ? { ...p, ...data } : p));
    });

    try {
      await tauri.updateProject(id, data);
    } catch (err) {
      console.error(err);
      setProjects(previousProjects);
      setError('Erreur lors de la mise à jour du projet.');
      toast.error('Erreur lors de la mise à jour du projet');
    }
  }, []);

  const deleteProject = useCallback(async (id: number) => {
    setError(null);

    let previousProjects: Project[] = [];
    setProjects((prev) => {
      previousProjects = prev;
      return prev.filter((p) => p.id !== id);
    });

    try {
      await tauri.deleteProject(id);
    } catch (err) {
      console.error(err);
      setProjects(previousProjects);
      setError('Erreur lors de la suppression du projet.');
      toast.error('Erreur lors de la suppression du projet');
    }
  }, []);

  return {
    projects,
    loadingProjects,
    error,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
  };
}
