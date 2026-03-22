import type { ProviderOption } from '$lib/types';

const STORAGE_KEY = 'app-store';

interface PersistedState {
  selectedOption: ProviderOption | null;
  projectMode: boolean;
}

function loadPersisted(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        selectedOption: parsed.selectedOption ?? null,
        projectMode: parsed.projectMode ?? true,
      };
    }
  } catch {}
  return { selectedOption: null, projectMode: true };
}

const persisted = loadPersisted();

let _profil = $state(false);
let _settingsOpen = $state(false);
let _selectedOption = $state<ProviderOption | null>(persisted.selectedOption);
let _projectMode = $state(persisted.projectMode);
let _selectedProjectId = $state<number | null>(null);
let _selectedThreadId = $state<string | null>(null);
let _sidebarCollapsed = $state(false);

$effect.root(() => {
  $effect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          selectedOption: _selectedOption,
          projectMode: _projectMode,
        }),
      );
    } catch {}
  });
});

export const appStore = {
  get profil() { return _profil; },
  setProfil(v: boolean) { if (v) _settingsOpen = false; _profil = v; },

  get settingsOpen() { return _settingsOpen; },
  setSettingsOpen(v: boolean) { if (v) _profil = false; _settingsOpen = v; },

  get selectedOption() { return _selectedOption; },
  setSelectedOption(v: ProviderOption | null) { _selectedOption = v; },

  get projectMode() { return _projectMode; },
  setProjectMode(v: boolean) { _projectMode = v; },

  get selectedProjectId() { return _selectedProjectId; },
  setSelectedProjectId(v: number | null) { _selectedProjectId = v; },

  get selectedThreadId() { return _selectedThreadId; },
  setSelectedThreadId(v: string | null) { _selectedThreadId = v; },

  get sidebarCollapsed() { return _sidebarCollapsed; },
  setSidebarCollapsed(v: boolean) { _sidebarCollapsed = v; },
};
