import { useEffect } from 'react';
import useStore from '@/store/useStore';
import Canvas, { registerTool } from '@/canvas/Canvas';
import { getTool } from '@/tools';
import type { ToolType } from '@/types';
import Toolbar from '@/ui/Toolbar';

const ALL_TOOLS: ToolType[] = ['select', 'pen', 'eraser', 'rectangle', 'circle', 'arc', 'line', 'arrow'];

const App = () => {
  useEffect(() => {
    useStore.getState().init();

    ALL_TOOLS.forEach((toolType) => {
      registerTool(toolType, getTool(toolType));
    });
  }, []);

  return (
    <div className="w-full h-full">
      <Canvas />
      <Toolbar />
    </div>
  );
};

export default App;
