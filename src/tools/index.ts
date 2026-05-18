import type { ToolType } from '@/types';
import type { ToolHandler } from './types';
import { SelectTool } from './SelectTool';
import { PenTool } from './PenTool';
import { EraserTool } from './EraserTool';
import { ShapeTool } from './ShapeTool';

export { SelectTool, PenTool, EraserTool, ShapeTool };
export { type ToolHandler, type ToolPreview } from './types';

const shapeTools: ToolType[] = ['rectangle', 'circle', 'arc', 'line', 'arrow'];

export function getTool(toolType: ToolType): ToolHandler {
  switch (toolType) {
    case 'select':
      return SelectTool;
    case 'pen':
      return PenTool;
    case 'eraser':
      return EraserTool;
    case 'rectangle':
    case 'circle':
    case 'arc':
    case 'line':
    case 'arrow':
      return ShapeTool;
    default:
      return SelectTool;
  }
}

export function isShapeTool(toolType: ToolType): boolean {
  return shapeTools.includes(toolType);
}
