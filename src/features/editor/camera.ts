export interface Camera { zoom: number; x: number; y: number }
export interface Viewport { width: number; height: number }
interface Bounds extends Viewport { x: number; y: number }

export function documentToScreen(camera: Camera, point: { x: number; y: number }) {
  return { x: camera.x + point.x * camera.zoom, y: camera.y + point.y * camera.zoom }
}

export function fitCamera(bounds: Bounds, viewport: Viewport): Camera {
  const zoom = Math.min(1, Math.max(1, viewport.width - 48) / bounds.width, Math.max(1, viewport.height - 48) / bounds.height)
  return {
    zoom,
    x: (viewport.width - bounds.width * zoom) / 2 - bounds.x * zoom,
    y: (viewport.height - bounds.height * zoom) / 2 - bounds.y * zoom,
  }
}

export function zoomCamera(camera: Camera, factor: number, viewport: Viewport): Camera {
  const zoom = Math.max(0.001, Math.min(16, camera.zoom * factor))
  const ratio = zoom / camera.zoom
  return { zoom, x: viewport.width / 2 - (viewport.width / 2 - camera.x) * ratio, y: viewport.height / 2 - (viewport.height / 2 - camera.y) * ratio }
}

export function panCamera(camera: Camera, x: number, y: number): Camera {
  return { ...camera, x: camera.x + x, y: camera.y + y }
}

export function resizeCamera(camera: Camera, before: Viewport, after: Viewport): Camera {
  return { ...camera, x: camera.x + (after.width - before.width) / 2, y: camera.y + (after.height - before.height) / 2 }
}
