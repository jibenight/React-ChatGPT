import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ProviderOption {
  provider: string;
  model: string;
  name?: string;
  avatar?: string;
}

interface AppState {
  // Profile panel
  profil: boolean;
  setProfil: (v: boolean) => void;

  // AI provider selection
  selectedOption: ProviderOption | null;
  setSelectedOption: (v: ProviderOption | null) => void;

  // Project mode
  projectMode: boolean;
  setProjectMode: (v: boolean) => void;

  // Project selection
  selectedProjectId: number | null;
  setSelectedProjectId: (v: number | null) => void;

  // Thread selection
  selectedThreadId: string | null;
  setSelectedThreadId: (v: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      profil: false,
      setProfil: (v) => set({ profil: v }),

      selectedOption: null,
      setSelectedOption: (v) => set({ selectedOption: v }),

      projectMode: true,
      setProjectMode: (v) => set({ projectMode: v }),

      selectedProjectId: null,
      setSelectedProjectId: (v) => set({ selectedProjectId: v }),

      selectedThreadId: null,
      setSelectedThreadId: (v) => set({ selectedThreadId: v }),
    }),
    {
      name: 'app-store',
      partialize: (state) => ({
        selectedOption: state.selectedOption,
        projectMode: state.projectMode,
      }),
    },
  ),
);
