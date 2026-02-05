import { type ReactNode } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DragDropListProps<T extends { id: string }> {
  items: T[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  renderItem: (item: T, index: number) => ReactNode;
  disabled?: boolean;
}

function SortableItem({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: 'relative',
      }}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

export default function DragDropList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  disabled = false,
}: DragDropListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const fromIndex = items.findIndex((item) => item.id === active.id);
    const toIndex = items.findIndex((item) => item.id === over.id);
    if (fromIndex !== -1 && toIndex !== -1) {
      onReorder(fromIndex, toIndex);
    }
  };

  if (disabled) {
    return (
      <div>
        {items.map((item, index) => (
          <div key={item.id}>{renderItem(item, index)}</div>
        ))}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        {items.map((item, index) => (
          <SortableItem key={item.id} id={item.id}>
            {renderItem(item, index)}
          </SortableItem>
        ))}
      </SortableContext>
    </DndContext>
  );
}
