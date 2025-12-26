'use client';

import {
  forwardRef,
  type CSSProperties,
  type HTMLAttributes,
  useState,
} from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  defaultDropAnimationSideEffects,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  MapIcon,
  MusicalNoteIcon,
  ChatBubbleBottomCenterIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

type PanelType = 'map' | 'music' | 'chat';

interface Panel {
  id: PanelType;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}

const allPanels: Panel[] = [
  { id: 'map', title: 'Map', icon: MapIcon },
  { id: 'music', title: 'Music', icon: MusicalNoteIcon },
  { id: 'chat', title: 'Chat', icon: ChatBubbleBottomCenterIcon },
];

type PanelContainerProps = {
  panel: Panel;
  onClose: (id: PanelType) => void;
  dragHandleProps?: HTMLAttributes<HTMLDivElement>;
  style?: CSSProperties;
  className?: string;
};

const PanelContainer = forwardRef<HTMLDivElement, PanelContainerProps>(
  ({ panel, onClose, dragHandleProps, style, className }, ref) => (
    <div
      ref={ref}
      style={style}
      className={`shrink-0 w-[450px] h-full bg-white border-r border-gray-200 flex flex-col ${className ?? ''}`}
    >
      <div
        className="h-14 border-b border-gray-200 flex items-center justify-between px-6 cursor-grab active:cursor-grabbing"
        {...dragHandleProps}
      >
        <h2 className="text-lg font-medium text-gray-900">{panel.title}</h2>
        <button
          onClick={() => onClose(panel.id)}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <XMarkIcon className="w-5 h-5 text-gray-500" />
        </button>
      </div>
      <div className="flex-1 overflow-auto p-6">{/* Panel content area */}</div>
    </div>
  )
);
PanelContainer.displayName = 'PanelContainer';

function SortablePanel({
  panel,
  onClose,
}: {
  panel: Panel;
  onClose: (id: PanelType) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: panel.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 220ms cubic-bezier(0.2, 0.8, 0.4, 1)',
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <PanelContainer
      ref={setNodeRef}
      panel={panel}
      onClose={onClose}
      dragHandleProps={{ ...attributes, ...listeners }}
      style={style}
    />
  );
}

export default function Home() {
  const [panelOrder, setPanelOrder] = useState<PanelType[]>(['map', 'music', 'chat']);
  const [openPanels, setOpenPanels] = useState<Set<PanelType>>(
    new Set(['map', 'music', 'chat'])
  );
  const [activeId, setActiveId] = useState<PanelType | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as PanelType);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setPanelOrder((items) => {
        const oldIndex = items.indexOf(active.id as PanelType);
        const newIndex = items.indexOf(over.id as PanelType);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const togglePanel = (panelId: PanelType) => {
    setOpenPanels((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(panelId)) {
        newSet.delete(panelId);
      } else {
        newSet.add(panelId);
      }
      return newSet;
    });
  };

  const closePanel = (panelId: PanelType) => {
    setOpenPanels((prev) => {
      const newSet = new Set(prev);
      newSet.delete(panelId);
      return newSet;
    });
  };

  const visiblePanels = panelOrder
    .filter((id) => openPanels.has(id))
    .map((id) => allPanels.find((p) => p.id === id)!);

  const activePanel = activeId ? allPanels.find((p) => p.id === activeId) ?? null : null;

  const dropAnimation = {
    duration: 220,
    easing: 'cubic-bezier(0.2, 0.8, 0.4, 1)',
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.3',
        },
      },
    }),
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-20 bg-white border-r border-gray-200 flex flex-col items-center py-6 gap-6 shrink-0">
        {panelOrder.map((panelId) => {
          const panel = allPanels.find((p) => p.id === panelId)!;
          const isOpen = openPanels.has(panelId);
          const Icon = panel.icon;

          return (
            <button
              key={panelId}
              onClick={() => togglePanel(panelId)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200 ${
                isOpen
                  ? 'text-gray-900 hover:bg-gray-100'
                  : 'text-gray-300 hover:bg-gray-50'
              }`}
              title={panel.title}
            >
              <Icon className="w-7 h-7" />
              <span className="text-xs font-medium">{panel.title}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        {visiblePanels.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext
              items={visiblePanels.map((p) => p.id)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex h-full">
                {visiblePanels.map((panel) => (
                  <SortablePanel
                    key={panel.id}
                    panel={panel}
                    onClose={closePanel}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay dropAnimation={dropAnimation}>
              {activePanel ? (
                <PanelContainer
                  panel={activePanel}
                  onClose={closePanel}
                  className="shadow-xl rounded"
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-lg">
              Click an icon on the left to open a panel
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
