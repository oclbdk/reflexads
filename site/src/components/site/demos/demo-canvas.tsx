'use client'

import '@xyflow/react/dist/style.css'

import { useEffect, useRef, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
  useStore,
} from '@xyflow/react'
import type { ReactFlowProps } from '@xyflow/react'
import { clsx } from 'clsx'
import {
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  ViewfinderCircleIcon,
} from '@heroicons/react/16/solid'

// The base every chapter's demo sits on. In-prose demos are
// exhibits, not editors: the canvas must never hijack page scroll. On screens
// too small to read a fitted diagram, the reader can zoom: pinch on touch,
// the corner controls anywhere. Panning unlocks only once zoomed past the
// fitted level (recentering locks it again), so an at-rest canvas passes
// one-finger swipes through to the page — xyflow's own touch-action: none
// would otherwise swallow them.

// The `fitView` prop only fires at init, before custom nodes have measured
// their real sizes — so demos drifted off-center. Re-fit once nodes are
// measured, once more after fonts settle, and on every container resize.
// Each fit records the zoom it lands on; that level is what panning and the
// touch-action override are judged against.
function AutoFit({
  padding,
  fittedZoom,
}: {
  padding: number
  fittedZoom: React.MutableRefObject<number>
}) {
  const nodesInitialized = useNodesInitialized()
  const { fitView, getViewport } = useReactFlow()
  const domNode = useStore((s) => s.domNode)

  useEffect(() => {
    if (!nodesInitialized) return
    const record = () => {
      fittedZoom.current = getViewport().zoom
    }
    fitView({ padding }).then(record)
    const t = setTimeout(() => fitView({ padding }).then(record), 250)
    return () => clearTimeout(t)
  }, [nodesInitialized, fitView, getViewport, padding, fittedZoom])

  useEffect(() => {
    if (!domNode) return
    const ro = new ResizeObserver(() =>
      fitView({ padding }).then(() => {
        fittedZoom.current = getViewport().zoom
      }),
    )
    ro.observe(domNode)
    return () => ro.disconnect()
  }, [domNode, fitView, getViewport, padding, fittedZoom])

  return null
}

// Unlocks canvas panning only while zoomed in past the fitted level. At rest
// a drag should scroll the page, not shove the demo around.
function PanGovernor({
  fittedZoom,
  onPanChange,
}: {
  fittedZoom: React.MutableRefObject<number>
  onPanChange: (unlocked: boolean) => void
}) {
  const zoom = useStore((s) => s.transform[2])
  useEffect(() => {
    onPanChange(zoom > fittedZoom.current * 1.1)
  }, [zoom, fittedZoom, onPanChange])
  return null
}

function ViewControls({ padding }: { padding: number }) {
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  const btn =
    'flex size-6 items-center justify-center text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-200'
  const divider = 'border-l border-zinc-950/10 dark:border-white/10'
  return (
    <Panel
      position="bottom-right"
      data-you-skip
      className="flex overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10"
    >
      <button aria-label="Zoom in" onClick={() => zoomIn({ duration: 150 })} className={btn}>
        <MagnifyingGlassPlusIcon className="size-3.5" />
      </button>
      <button
        aria-label="Zoom out"
        onClick={() => zoomOut({ duration: 150 })}
        className={clsx(btn, divider)}
      >
        <MagnifyingGlassMinusIcon className="size-3.5" />
      </button>
      <button
        aria-label="Recenter diagram"
        onClick={() => fitView({ padding, duration: 150 })}
        className={clsx(btn, divider)}
      >
        <ViewfinderCircleIcon className="size-3.5" />
      </button>
    </Panel>
  )
}

export function DemoCanvas({
  className,
  children,
  ...props
}: ReactFlowProps & { className?: string }) {
  const padding = typeof props.fitViewOptions?.padding === 'number' ? props.fitViewOptions.padding : 0.1
  const fittedZoom = useRef(1)
  const [panUnlocked, setPanUnlocked] = useState(false)

  // Every demo defines nodeTypes at module level, so its identity only ever
  // changes when HMR reloads the module. React Flow handles that by partially
  // remounting nodes against a stale store (error #002), which can leave most
  // of a diagram unrendered until a refresh. A changed identity instead keys a
  // full clean remount. In production this never fires.
  const [generation, setGeneration] = useState(0)
  const lastTypes = useRef(props.nodeTypes)
  if (lastTypes.current !== props.nodeTypes) {
    lastTypes.current = props.nodeTypes
    setGeneration((g) => g + 1)
  }

  return (
    <ReactFlowProvider key={generation}>
      <div
        className={clsx(
          'relative rounded-lg',
          className ?? 'h-72',
          // At rest, let one-finger swipes scroll the page (pinch still zooms
          // the canvas). Once panning unlocks, the library's touch-action:
          // none takes back over so a finger drags the canvas instead.
          // Plain CSS class: Tailwind's arbitrary variants read `_` as a
          // space, which mangles `.react-flow__pane`.
          !panUnlocked && 'demo-scroll-through',
        )}
      >
        <ReactFlow
          colorMode="system"
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={panUnlocked}
          zoomOnScroll={false}
          zoomOnPinch
          zoomOnDoubleClick={false}
          panOnScroll={false}
          preventScrolling={false}
          minZoom={0.15}
          maxZoom={2.5}
          proOptions={{ hideAttribution: true }}
          style={{ background: 'transparent' }}
          {...props}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} className="opacity-40" />
          <AutoFit padding={padding} fittedZoom={fittedZoom} />
          <PanGovernor fittedZoom={fittedZoom} onPanChange={setPanUnlocked} />
          <ViewControls padding={padding} />
          {children}
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  )
}
