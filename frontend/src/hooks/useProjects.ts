import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/apiClient';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Project = any;

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
      const response = await apiClient.get('/api/projects');
      setProjects(response.data || []);
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
      const response = await apiClient.post('/api/projects', data);
      const created = response.data || null;

      if (created) {
        setProjects((prev) => prev.map((p) => (p.id === tempId ? created : p)));
      } else {
        setProjects((prev) => prev.filter((p) => p.id !== tempId));
      }

      return created;
    } catch (err) {
      console.error(err);
      setProjects(previousProjects);
      setError('Erreur lors de la cr\u00e9ation du projet.');
      toast.error('Erreur lors de la cr\u00e9ation du projet');
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
      await apiClient.patch(`/api/projects/${id}`, data);
    } catch (err) {
      console.error(err);
      setProjects(previousProjects);
      setError('Erreur lors de la mise \u00e0 jour du projet.');
      toast.error('Erreur lors de la mise \u00e0 jour du projet');
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
      await apiClient.delete(`/api/projects/${id}`);
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
