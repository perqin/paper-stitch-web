import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import ZoomIn from '@mui/icons-material/ZoomIn'
import ZoomOut from '@mui/icons-material/ZoomOut'
import ArrowBack from '@mui/icons-material/ArrowBack'
import ArrowForward from '@mui/icons-material/ArrowForward'
import ArrowUpward from '@mui/icons-material/ArrowUpward'
import ArrowDownward from '@mui/icons-material/ArrowDownward'
import { editorStore, useEditorStore } from './store'
import { calculateComposition } from './composition'
import { renderComposition } from './renderer'
import { fitCamera, panCamera, resizeCamera, zoomCamera } from './camera'
import type { Camera, Viewport } from './camera'
import type { ImageResources } from './resources'

function PreviewAction({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return <Tooltip title={label}><span><IconButton disabled={disabled} size="small" aria-label={label} onClick={onClick}>{children}</IconButton></span></Tooltip>
}

export default function CanvasPreview({ resources }: { resources: ImageResources }) {
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
    const element = container.current!
    const target = canvas.current!
    let frame = 0
    let hadImages = false

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
        context.fillStyle = '#b5b5b5'
        context.fillRect(0, 0, width, height)
        const document = editorStore.getState()
        const composition = calculateComposition(document.images, document.mode)
        if (composition.bounds && !hadImages) camera.current = fitCamera(composition.bounds, { ...size, height: Math.max(1, size.height - (toolbar.current?.offsetHeight ?? 0) - 16) })
        hadImages = document.images.length > 0
        context.setTransform(width / size.width, 0, 0, height / size.height, 0, 0)
        context.translate(camera.current.x, camera.current.y)
        context.scale(camera.current.zoom, camera.current.zoom)
        lease = resources.acquire(document.images.map(image => image.id))
        renderComposition(context, document, composition, lease.getSource)
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
    requestDraw()
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      unsubscribe()
      window.removeEventListener('resize', requestDraw)
      schedule.current = () => {}
    }
  }, [resources])

  function zoomBy(factor: number) {
    camera.current = zoomCamera(camera.current, factor, viewport.current)
    schedule.current()
  }

  function panBy(x: number, y: number) {
    camera.current = panCamera(camera.current, x, y)
    schedule.current()
  }

  function fit() {
    const state = editorStore.getState()
    const { bounds } = calculateComposition(state.images, state.mode)
    if (bounds) camera.current = fitCamera(bounds, { ...viewport.current, height: Math.max(1, viewport.current.height - (toolbar.current?.offsetHeight ?? 0) - 16) })
    schedule.current()
  }

  return (
    <Box ref={container} component="section" aria-label="Stitch preview" sx={{
      position: 'relative', overflow: 'hidden', bgcolor: '#b5b5b5',
      minWidth: 0, minHeight: { xs: 420, md: 0 }, height: '100%',
    }}>
      <Box ref={canvas} component="canvas" aria-label="Stitched image preview" sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      {!hasImages && <Typography sx={{ position: 'absolute', top: '45%', width: '100%', textAlign: 'center', px: 2 }}>Add images to preview your stitch.</Typography>}
      {error && <Alert severity="error" sx={{ position: 'absolute', top: 16, left: 16, right: 16 }}>{error}</Alert>}
      <Paper ref={toolbar} component="nav" aria-label="Preview controls" sx={{ position: 'absolute', bottom: 16, left: 16, right: 16, p: 0.75, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5, width: 'fit-content', maxWidth: 'calc(100% - 32px)' }}>
        <PreviewAction label="Zoom in" disabled={!hasImages} onClick={() => zoomBy(1.25)}><ZoomIn /></PreviewAction>
        <PreviewAction label="Zoom out" disabled={!hasImages} onClick={() => zoomBy(0.8)}><ZoomOut /></PreviewAction>
        <PreviewAction label="Pan left" disabled={!hasImages} onClick={() => panBy(-64, 0)}><ArrowBack /></PreviewAction>
        <PreviewAction label="Pan right" disabled={!hasImages} onClick={() => panBy(64, 0)}><ArrowForward /></PreviewAction>
        <PreviewAction label="Pan up" disabled={!hasImages} onClick={() => panBy(0, -64)}><ArrowUpward /></PreviewAction>
        <PreviewAction label="Pan down" disabled={!hasImages} onClick={() => panBy(0, 64)}><ArrowDownward /></PreviewAction>
        <Button disabled={!hasImages} size="small" onClick={fit}>Fit</Button>
        <Button disabled={!hasImages} size="small" onClick={() => zoomBy(1 / camera.current.zoom)}>100%</Button>
        <Typography variant="caption" aria-label="Preview zoom" sx={{ px: 0.5 }}>{Math.round(zoom * 10000) / 100}%</Typography>
      </Paper>
    </Box>
  )
}
