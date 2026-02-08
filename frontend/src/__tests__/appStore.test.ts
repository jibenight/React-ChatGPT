import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../stores/appStore';

describe('appStore', () => {
  beforeEach(() => {
    useAppStore.setState({
      profil: false,
      selectedOption: null,
      projectMode: true,
      selectedProjectId: null,
      selectedThreadId: null,
    });
  });

  it('should initialize with default values', () => {
    const state = useAppStore.getState();
    expect(state.profil).toBe(false);
    expect(state.selectedOption).toBeNull();
    expect(state.projectMode).toBe(true);
    expect(state.selectedProjectId).toBeNull();
    expect(state.selectedThreadId).toBeNull();
  });

  it('should toggle profil', () => {
    useAppStore.getState().setProfil(true);
    expect(useAppStore.getState().profil).toBe(true);
  });

  it('should set selected option', () => {
    const option = { provider: 'openai', model: 'gpt-4o', name: 'GPT-4o' };
    useAppStore.getState().setSelectedOption(option);
    expect(useAppStore.getState().selectedOption).toEqual(option);
  });

  it('should toggle project mode', () => {
    useAppStore.getState().setProjectMode(false);
    expect(useAppStore.getState().projectMode).toBe(false);
  });

  it('should set selected project and thread', () => {
    useAppStore.getState().setSelectedProjectId(42);
    useAppStore.getState().setSelectedThreadId('thread-abc');
    expect(useAppStore.getState().selectedProjectId).toBe(42);
    expect(useAppStore.getState().selectedThreadId).toBe('thread-abc');
  });

  it('should clear selection', () => {
    useAppStore.getState().setSelectedProjectId(42);
    useAppStore.getState().setSelectedProjectId(null);
    expect(useAppStore.getState().selectedProjectId).toBeNull();
  });
});
