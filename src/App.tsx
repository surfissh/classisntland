import { useEffect } from 'react';
import useStore from '@/store/useStore';
import Canvas, { registerTool } from '@/canvas/Canvas';
import { getTool } from '@/tools';
import type { ToolType } from '@/types';
import Toolbar from '@/ui/Toolbar';
import SelectionInspector from '@/ui/SelectionInspector';

const ALL_TOOLS: ToolType[] = ['select', 'pen', 'eraser', 'rectangle', 'circle', 'arc', 'line', 'arrow'];

function applyTheme(theme: string) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  }
}

const App = () => {
  useEffect(() => {
    useStore.getState().init();

    ALL_TOOLS.forEach((toolType) => {
      registerTool(toolType, getTool(toolType));
    });
  }, []);

  useEffect(() => {
    const store = useStore.getState();
    const theme = store.settings.theme ?? 'system';
    applyTheme(theme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const current = useStore.getState().settings.theme ?? 'system';
      if (current === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const unsub = useStore.subscribe((state, prevState) => {
      if (state.settings.theme !== prevState.settings.theme && state.settings.theme) {
        applyTheme(state.settings.theme);
      }
    });
    return unsub;
  }, []);

  return (
    <div className="w-full h-full">
      <Canvas />
      <Toolbar />
      <SelectionInspector />
    </div>
  );
};

export default App;
