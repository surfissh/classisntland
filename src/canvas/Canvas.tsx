import { useRef, useEffect, useCallback } from 'react';
import { useStore, updateAwareness } from '@/store/useStore';
import { renderAll } from './renderer';
import type { Point, Camera, ToolType } from '@/types';
import type { ToolHandler, ToolPreview } from '@/tools/types';

const toolRegistry = new Map<ToolType, ToolHandler>();

export function registerTool(type: ToolType, handler: ToolHandler): void {
  toolRegistry.set(type, handler);
}

export function screenToWorld(
  sx: number,
  sy: number,
  cssW: number,
  cssH: number,
  camera: Camera,
): Point {
  return {
    x: (sx - cssW / 2) / camera.zoom + camera.x,
    y: (sy - cssH / 2) / camera.zoom + camera.y,
    pressure: 0,
  };
}

export function worldToScreen(
  wx: number,
  wy: number,
  cssW: number,
  cssH: number,
  camera: Camera,
): { x: number; y: number } {
  return {
    x: (wx - camera.x) * camera.zoom + cssW / 2,
    y: (wy - camera.y) * camera.zoom + cssH / 2,
  };
}

interface PinchGesture {
  pointerIds: [number, number];
  initDist: number;
  initZoom: number;
  initCamX: number;
  initCamY: number;
  worldMidX: number;
  worldMidY: number;
}

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const dirtyRef = useRef(true);

  const dimsRef = useRef({ cssW: 0, cssH: 0 });

  const currentPageId = useStore((s) => s.currentPageId);
  const elements = useStore((s) => s.elements[currentPageId] || []);
  const camera = useStore((s) => s.camera);
  const selectedIds = useStore((s) => s.selectedElementIds);
  const activeTool = useStore((s) => s.activeTool);
  const theme = useStore((s) => s.settings.theme ?? 'system');
  const remoteUsers = useStore((s) => s.remoteUsers);

  const elementsRef = useRef(elements);
  const cameraRef = useRef(camera);
  const selectedIdsRef = useRef(selectedIds);
  const activeToolRef = useRef(activeTool);
  const remoteUsersRef = useRef(remoteUsers);

  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  useEffect(() => {
    remoteUsersRef.current = remoteUsers;
  }, [remoteUsers]);

  const activePointers = useRef<Map<number, PointerEvent>>(new Map());
  const gestureRef = useRef<PinchGesture | null>(null);
  const panRef = useRef<{ active: boolean; lastX: number; lastY: number }>({
    active: false,
    lastX: 0,
    lastY: 0,
  });

  const getToolPreview = useCallback((): ToolPreview | null => {
    const tool = toolRegistry.get(activeToolRef.current);
    return tool?.getPreview?.() ?? null;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const cssW = window.innerWidth;
      const cssH = window.innerHeight;
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      canvas.width = cssW * dpr;
      canvas.height = cssH * dpr;
      dimsRef.current = { cssW, cssH };
      dirtyRef.current = true;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    dirtyRef.current = true;
  }, [elements, camera, selectedIds, activeTool, theme, remoteUsers]);

  useEffect(() => {
    const { cssW, cssH } = dimsRef.current;
    if (cssW > 0 && cssH > 0) {
      updateAwareness(camera, cssW, cssH, currentPageId);
    }
  }, [camera, currentPageId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let running = true;

    const loop = () => {
      if (!running) return;

      if (dirtyRef.current) {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { cssW, cssH } = dimsRef.current;
        const preview = getToolPreview();

        renderAll(
          ctx,
          elementsRef.current,
          cameraRef.current,
          selectedIdsRef.current,
          activeToolRef.current,
          preview,
          cssW,
          cssH,
          remoteUsersRef.current,
        );

        dirtyRef.current = false;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [getToolPreview]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);
    activePointers.current.set(e.pointerId, e.nativeEvent);

    const { cssW, cssH } = dimsRef.current;
    const cam = cameraRef.current;
    const worldPoint = screenToWorld(e.clientX, e.clientY, cssW, cssH, cam);

    if (e.button === 2) {
      panRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
      return;
    }

    if (activePointers.current.size === 2) {
      const ptrs = Array.from(activePointers.current.values());
      const p1 = ptrs[0];
      const p2 = ptrs[1];
      const dist = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY);
      const midX = (p1.clientX + p2.clientX) / 2;
      const midY = (p1.clientY + p2.clientY) / 2;
      gestureRef.current = {
        pointerIds: [p1.pointerId, p2.pointerId],
        initDist: dist,
        initZoom: cam.zoom,
        initCamX: cam.x,
        initCamY: cam.y,
        worldMidX: (midX - cssW / 2) / cam.zoom + cam.x,
        worldMidY: (midY - cssH / 2) / cam.zoom + cam.y,
      };
      const tool = toolRegistry.get(useStore.getState().activeTool);
      tool?.abort?.();
      return;
    }

    const tool = toolRegistry.get(useStore.getState().activeTool);
    tool?.onPointerDown?.(e.nativeEvent, worldPoint.x, worldPoint.y, cam);
    dirtyRef.current = true;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!activePointers.current.has(e.pointerId)) return;
    activePointers.current.set(e.pointerId, e.nativeEvent);

    const { cssW, cssH } = dimsRef.current;

    if (panRef.current.active) {
      const dx = e.clientX - panRef.current.lastX;
      const dy = e.clientY - panRef.current.lastY;
      panRef.current.lastX = e.clientX;
      panRef.current.lastY = e.clientY;
      const cam = cameraRef.current;
      useStore.getState().setCamera({
        x: cam.x - dx / cam.zoom,
        y: cam.y - dy / cam.zoom,
      });
      dirtyRef.current = true;
      return;
    }

    if (gestureRef.current && activePointers.current.size >= 2) {
      const g = gestureRef.current;
      const p1 = activePointers.current.get(g.pointerIds[0]);
      const p2 = activePointers.current.get(g.pointerIds[1]);
      if (!p1 || !p2) return;

      const dist = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY);
      const midX = (p1.clientX + p2.clientX) / 2;
      const midY = (p1.clientY + p2.clientY) / 2;

      const newZoom = Math.max(0.1, Math.min(10, g.initZoom * (dist / g.initDist)));
      const newCamX = g.worldMidX - (midX - cssW / 2) / newZoom;
      const newCamY = g.worldMidY - (midY - cssH / 2) / newZoom;

      useStore.getState().setCamera({ x: newCamX, y: newCamY, zoom: newZoom });
      dirtyRef.current = true;
      return;
    }

    const cam = cameraRef.current;
    const worldPoint = screenToWorld(e.clientX, e.clientY, cssW, cssH, cam);
    const tool = toolRegistry.get(useStore.getState().activeTool);
    tool?.onPointerMove?.(e.nativeEvent, worldPoint.x, worldPoint.y, cam);
    dirtyRef.current = true;
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId);

    if (panRef.current.active && e.button === 2) {
      panRef.current.active = false;
      return;
    }

    if (gestureRef.current && activePointers.current.size < 2) {
      gestureRef.current = null;
      return;
    }

    if (e.button === 2) return;

    const { cssW, cssH } = dimsRef.current;
    const cam = cameraRef.current;
    const worldPoint = screenToWorld(e.clientX, e.clientY, cssW, cssH, cam);
    const tool = toolRegistry.get(useStore.getState().activeTool);
    tool?.onPointerUp?.(e.nativeEvent, worldPoint.x, worldPoint.y, cam);
    dirtyRef.current = true;
  }, []);

  const handlePointerCancel = useCallback((e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId);

    if (gestureRef.current && activePointers.current.size < 2) {
      gestureRef.current = null;
    }

    if (panRef.current.active) {
      panRef.current.active = false;
    }
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();

    const { cssW, cssH } = dimsRef.current;
    const cam = cameraRef.current;

    const factor = e.deltaY > 0 ? 0.92 : 1 / 0.92;
    const newZoom = Math.max(0.1, Math.min(10, cam.zoom * factor));

    const worldX = (e.clientX - cssW / 2) / cam.zoom + cam.x;
    const worldY = (e.clientY - cssH / 2) / cam.zoom + cam.y;
    const newCamX = worldX - (e.clientX - cssW / 2) / newZoom;
    const newCamY = worldY - (e.clientY - cssH / 2) / newZoom;

    useStore.getState().setCamera({ x: newCamX, y: newCamY, zoom: newZoom });
    dirtyRef.current = true;
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const tool = toolRegistry.get(useStore.getState().activeTool);
    tool?.onKeyDown?.(e.nativeEvent);
    dirtyRef.current = true;
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 bg-white dark:bg-neutral-900 outline-none"
      style={{ touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onWheel={handleWheel}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
    />
  );
}
