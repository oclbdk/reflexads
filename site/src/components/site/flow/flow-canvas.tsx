'use client'

import '@xyflow/react/dist/style.css'

import { useEffect, useRef, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
  useStore,
} from '@xyflow/react'
import type { ReactFlowProps } from '@xyflow/react'
import { clsx } from 'clsx'

// The base every chapter's flow diagram sits on. In-prose diagrams are
// exhibits, not editors: interaction is opt-in per widget, and the canvas must
// never hijack page scroll. Node types, edges, and behaviour are designed
// per chapter; only the frame and defaults live here.

// The `fitView` prop only fires at init, before custom nodes have measured
// their real sizes — so exhibits drifted off-center. Re-fit once nodes are
// measured, once more after fonts settle, and on every container resize.
function AutoFit({ padding }: { padding: number }) {
  const nodesInitialized = useNodesInitialized()
  const { fitView } = useReactFlow()
  const domNode = useStore((s) => s.domNode)

  useEffect(() => {
    if (!nodesInitialized) return
    fitView({ padding })
    const t = setTimeout(() => fitView({ padding }), 250)
    return () => clearTimeout(t)
  }, [nodesInitialized, fitView, padding])

  useEffect(() => {
    if (!domNode) return
    const ro = new ResizeObserver(() => fitView({ padding }))
    ro.observe(domNode)
    return () => ro.disconnect()
  }, [domNode, fitView, padding])

  return null
}

export function FlowCanvas({
  className,
  children,
  ...props
}: ReactFlowProps & { className?: string }) {
  const padding = typeof props.fitViewOptions?.padding === 'number' ? props.fitViewOptions.padding : 0.1

  // Every widget defines nodeTypes at module level, so its identity only ever
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
      <div className={clsx('relative rounded-lg', className ?? 'h-72')}>
        <ReactFlow
          colorMode="system"
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          panOnScroll={false}
          preventScrolling={false}
          proOptions={{ hideAttribution: true }}
          style={{ background: 'transparent' }}
          {...props}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} className="opacity-40" />
          <AutoFit padding={padding} />
          {children}
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  )
}
