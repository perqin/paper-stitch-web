import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { useColorScheme } from '@mui/material/styles'
import { editorStore, useEditorStore } from './store'
import { calculateComposition } from './composition'
import { renderComposition } from './renderer'
import { getAlignmentImageId } from './alignment'
import { localizeError } from './localizedErrors'
import { constrainCamera, fitCamera, panCamera, resizeCamera, zoomCamera } from './camera'
import type { Camera, Viewport } from './camera'
import type { ImageResources } from './resources'

function fitPreview(bounds: Parameters<typeof fitCamera>[0], viewport: Viewport, toolbarHeight: number) {
  // Constraints center fitted content, so reserve toolbar clearance symmetrically.
  return fitCamera(bounds, { ...viewport, height: Math.max(1, viewport.height - 2 * (toolbarHeight + 16)) })
}

export default function CanvasPreview({ resources, alignmentEnabled = false }: { resources: ImageResources; alignmentEnabled?: boolean }) {
  const { t } = useTranslation()
  const { mode, systemMode } = useColorScheme()
  const dark = (mode === 'system' ? systemMode : mode) === 'dark'
  const alignment = useRef(alignmentEnabled)
  const container = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const toolbar = useRef<HTMLElement>(null)
  const camera = useRef<Camera>({ zoom: 1, x: 24, y: 24 })
  const viewport = useRef<Viewport>({ width: 0, height: 0 })
  const schedule = useRef<() => void>(() => {})
  const hasImages = useEditorStore(state => state.images.length > 0)
  const [zoom, setZoom] = useState(1)
  const [error, setError] = useState('')

  useEffect(() => {
    alignment.current = alignmentEnabled
    schedule.current()
  }, [alignmentEnabled, mode, systemMode])

  useEffect(() => {
    const element = container.current!
    const target = canvas.current!
    let frame = 0
    let hadImages = false
    let drag: { id: number; x: number; y: number } | null = null
    let gestureScale: number | null = null

    function stopDrag(id?: number) {
      if (!drag || (id !== undefined && id !== drag.id)) return
      const pointer = drag.id
      drag = null
      if (element.hasPointerCapture(pointer)) element.releasePointerCapture(pointer)
      element.style.cursor = hadImages ? 'grab' : 'default'
    }

    function currentBounds() {
      const state = editorStore.getState()
      try { return calculateComposition(state.images, state.mode).bounds }
      catch { return null } // The draw path reports invalid composition geometry.
    }

    function pointerDown(event: PointerEvent) {
      if (event.pointerType !== 'mouse' || event.button !== 0 || drag || !currentBounds()) return
      if (event.target instanceof Element && event.target.closest('nav, button, input, a, [role="alert"]')) return
      event.preventDefault()
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY }
      element.setPointerCapture(event.pointerId)
      element.style.cursor = 'grabbing'
    }

    function pointerMove(event: PointerEvent) {
      if (!drag || event.pointerId !== drag.id) return
      if (!(event.buttons & 1)) { stopDrag(event.pointerId); return }
      const bounds = currentBounds()
      if (!bounds) { stopDrag(); return }
      camera.current = constrainCamera(panCamera(camera.current, event.clientX - drag.x, event.clientY - drag.y), bounds, viewport.current)
      drag.x = event.clientX
      drag.y = event.clientY
      requestDraw()
    }

    function pointerEnd(event: PointerEvent) { stopDrag(event.pointerId) }

    function zoomAt(factor: number, clientX: number, clientY: number) {
      const bounds = currentBounds()
      if (!bounds) return
      const rect = element.getBoundingClientRect()
      camera.current = constrainCamera(zoomCamera(camera.current, factor, viewport.current, { x: clientX - rect.left, y: clientY - rect.top }), bounds, viewport.current)
      requestDraw()
    }

    function wheel(event: WheelEvent) {
      if (!currentBounds()) return
      event.preventDefault()
      if (gestureScale !== null) return
      const units = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.current.height : 1
      const delta = Math.max(-1000, Math.min(1000, event.deltaY * units))
      zoomAt(Math.exp(-delta * (event.ctrlKey ? 0.01 : 0.002)), event.clientX, event.clientY)
    }

    // Safari exposes trackpad pinch through GestureEvent rather than ctrl+wheel.
    function gesture(event: Event) {
      if (event.type === 'gestureend') {
        if (gestureScale !== null) event.preventDefault()
        gestureScale = null
        return
      }
      if (!currentBounds()) return
      event.preventDefault()
      const pinch = event as Event & { scale: number; clientX: number; clientY: number }
      if (event.type === 'gesturestart') { gestureScale = 1; return }
      if (gestureScale === null || !Number.isFinite(pinch.scale) || pinch.scale <= 0) return
      zoomAt(pinch.scale / gestureScale, pinch.clientX, pinch.clientY)
      gestureScale = pinch.scale
    }

    function draw() {
      frame = 0
      const rect = element.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return
      const size = { width: rect.width, height: rect.height }
      if (viewport.current.width && (size.width !== viewport.current.width || size.height !== viewport.current.height)) {
        camera.current = resizeCamera(camera.current, viewport.current, size)
      }
      viewport.current = size
      const dpr = window.devicePixelRatio || 1
      const width = Math.max(1, Math.round(size.width * dpr))
      const height = Math.max(1, Math.round(size.height * dpr))
      if (target.width !== width) target.width = width
      if (target.height !== height) target.height = height
      let lease: ReturnType<ImageResources['acquire']> | undefined
      try {
        const context = target.getContext('2d')
        if (!context) throw new Error('Canvas 2D is not available in this browser.')
        context.setTransform(1, 0, 0, 1, 0, 0)
        context.clearRect(0, 0, width, height)
        context.fillStyle = getComputedStyle(element).backgroundColor
        context.fillRect(0, 0, width, height)
        const document = editorStore.getState()
        const composition = calculateComposition(document.images, document.mode)
        if (composition.bounds && !hadImages) camera.current = fitPreview(composition.bounds, size, toolbar.current?.offsetHeight ?? 0)
        if (composition.bounds) camera.current = constrainCamera(camera.current, composition.bounds, size)
        hadImages = document.images.length > 0
        if (!hadImages) { stopDrag(); gestureScale = null }
        element.style.cursor = hadImages ? drag ? 'grabbing' : 'grab' : 'default'
        context.setTransform(width / size.width, 0, 0, height / size.height, 0, 0)
        context.translate(camera.current.x, camera.current.y)
        context.scale(camera.current.zoom, camera.current.zoom)
        lease = resources.acquire(document.images.map(image => image.id))
        // Read actual DOM focus at draw time, so blur/unmount cannot leave stale editing state.
        const focused = window.document.activeElement
        const focusedId = focused instanceof HTMLInputElement ? focused.dataset.imageId ?? null : null
        renderComposition(context, document, composition, lease.getSource, {
          translucentImageId: getAlignmentImageId(composition, focusedId, alignment.current),
        })
        setError('')
        setZoom(camera.current.zoom)
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Unable to render preview.')
      } finally {
        lease?.release()
      }
    }

    function requestDraw() { if (!frame) frame = requestAnimationFrame(draw) }
    schedule.current = requestDraw
    const observer = new ResizeObserver(requestDraw)
    observer.observe(element)
    const unsubscribe = editorStore.subscribe(requestDraw)
    window.addEventListener('resize', requestDraw)
    document.addEventListener('focusin', requestDraw)
    document.addEventListener('focusout', requestDraw)
    element.addEventListener('pointerdown', pointerDown)
    element.addEventListener('pointermove', pointerMove)
    element.addEventListener('pointerup', pointerEnd)
    element.addEventListener('pointercancel', pointerEnd)
    element.addEventListener('lostpointercapture', pointerEnd)
    element.addEventListener('wheel', wheel, { passive: false })
    element.addEventListener('gesturestart', gesture, { passive: false })
    element.addEventListener('gesturechange', gesture, { passive: false })
    element.addEventListener('gestureend', gesture, { passive: false })
    requestDraw()
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      unsubscribe()
      window.removeEventListener('resize', requestDraw)
      document.removeEventListener('focusin', requestDraw)
      document.removeEventListener('focusout', requestDraw)
      stopDrag()
      element.removeEventListener('pointerdown', pointerDown)
      element.removeEventListener('pointermove', pointerMove)
      element.removeEventListener('pointerup', pointerEnd)
      element.removeEventListener('pointercancel', pointerEnd)
      element.removeEventListener('lostpointercapture', pointerEnd)
      element.removeEventListener('wheel', wheel)
      element.removeEventListener('gesturestart', gesture)
      element.removeEventListener('gesturechange', gesture)
      element.removeEventListener('gestureend', gesture)
      schedule.current = () => {}
    }
  }, [resources])

  function zoomBy(factor: number) {
    camera.current = zoomCamera(camera.current, factor, viewport.current)
    schedule.current()
  }

  function fit() {
    const state = editorStore.getState()
    const { bounds } = calculateComposition(state.images, state.mode)
    if (bounds) camera.current = fitPreview(bounds, viewport.current, toolbar.current?.offsetHeight ?? 0)
    schedule.current()
  }

  return (
    <Box ref={container} component="section" aria-label={t('stitchPreview')} sx={{
      position: 'relative', overflow: 'hidden', bgcolor: dark ? '#27252d' : '#b5b5b5', userSelect: 'none',
      minWidth: 0, minHeight: { xs: 420, md: 0 }, height: '100%',
    }}>
      <Box ref={canvas} component="canvas" aria-label={t('previewCanvas')} sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      {!hasImages && <Typography sx={{ position: 'absolute', top: '45%', width: '100%', textAlign: 'center', px: 2 }}>{t('previewEmpty')}</Typography>}
      {error && <Alert severity="error" sx={{ position: 'absolute', top: 16, left: 16, right: 16 }}>{localizeError(error, t)}</Alert>}
      <Paper ref={toolbar} component="nav" aria-label={t('previewControls')} sx={{ position: 'absolute', bottom: 16, left: 16, right: 16, p: 0.75, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5, width: 'fit-content', maxWidth: 'calc(100% - 32px)' }}>
        <Button disabled={!hasImages} size="small" onClick={fit}>{t('fit')}</Button>
        <Button disabled={!hasImages} size="small" onClick={() => zoomBy(1 / camera.current.zoom)}>100%</Button>
        <Typography variant="caption" aria-label={t('previewZoom')} sx={{ px: 0.5 }}>{Math.round(zoom * 10000) / 100}%</Typography>
      </Paper>
    </Box>
  )
}
