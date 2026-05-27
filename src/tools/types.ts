import type { Camera, Point } from '@/types';

export interface ToolPreview {
  type: 'pen' | 'rectangle' | 'circle' | 'arc' | 'line' | 'arrow' | 'marquee';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  startAngle?: number;
  endAngle?: number;
  points?: Point[];
  color?: string;
  strokeWidth?: number;
  baseWidth?: number;
  fillColor?: string | null;
  opacity?: number;
  showArrow?: boolean;
}

export interface ToolHandler {
  onPointerDown?(e: PointerEvent, worldX: number, worldY: number, camera: Camera): void;
  onPointerMove?(e: PointerEvent, worldX: number, worldY: number, camera: Camera): void;
  onPointerUp?(e: PointerEvent, worldX: number, worldY: number, camera: Camera): void;
  onKeyDown?(e: KeyboardEvent): void;
  getPreview?(): ToolPreview | null;
  onActivate?(): void;
  onDeactivate?(): void;
  abort?(): void;
}
