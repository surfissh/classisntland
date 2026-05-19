export type ToolType = 'select' | 'pen' | 'eraser' | 'rectangle' | 'circle' | 'arc' | 'line' | 'arrow';

export type ShapeType = 'rectangle' | 'circle' | 'arc' | 'line' | 'arrow';

export type ToolbarPosition = 'top' | 'bottom' | 'left' | 'right';

export type ToolbarMode = 'fill' | 'floating';

export interface Point {
  x: number;
  y: number;
  pressure: number;
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface ElementStyle {
  color: string;
  opacity: number;
}

export interface BaseElement {
  id: string;
  type: ToolType;
  style: ElementStyle;
  pageId: string;
  createdAt: number;
  userId: string;
  rotation?: number;
}

export interface StrokeElement extends BaseElement {
  type: 'pen';
  points: Point[];
  baseWidth: number;
}

export interface ShapeElement extends BaseElement {
  type: ToolType;
  shapeType: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  startAngle?: number;
  endAngle?: number;
  strokeWidth: number;
  fillColor: string | null;
  showArrow?: boolean;
}

export type WhiteboardElement = StrokeElement | ShapeElement;

export interface Page {
  id: string;
  name: string;
  camera: Camera;
}

export interface PenSettings {
  color: string;
  baseWidth: number;
  minWidth: number;
  maxWidth: number;
}

export interface EraserSettings {
  size: number;
}

export interface ShapeSettings {
  color: string;
  strokeWidth: number;
  fillColor: string | null;
}

export interface Settings {
  toolbarPosition: ToolbarPosition;
  toolbarMode: ToolbarMode;
  showToolbar: boolean;
}

export interface AppState {
  pages: Page[];
  currentPageId: string;
  elements: Record<string, WhiteboardElement[]>;
  camera: Camera;
  activeTool: ToolType;
  selectedElementIds: string[];
  penSettings: PenSettings;
  eraserSettings: EraserSettings;
  shapeSettings: ShapeSettings;
  shapeType: ShapeType;
  settings: Settings;
}
