'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '../lib/utils';
import { formatCurrency } from './ModulePage';

export interface KanbanDeal {
  id: string;
  name: string;
  value: string;
  currency?: string;
  owner: { firstName: string; lastName: string };
}

export interface KanbanStage {
  id: string;
  name: string;
  color: string | null;
  deals: KanbanDeal[];
}

export interface KanbanBoardProps {
  stages: KanbanStage[];
  onStageChange: (dealId: string, stageId: string) => void;
  className?: string;
}

function findStageForDeal(stages: KanbanStage[], dealId: string): string | null {
  for (const stage of stages) {
    if (stage.deals.some((d) => d.id === dealId)) return stage.id;
  }
  return null;
}

function DealCardContent({ deal, dragging }: { deal: KanbanDeal; dragging?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border/60 bg-card p-3.5 shadow-lg cursor-grab active:cursor-grabbing',
        'hover:shadow-xl hover:border-primary/20 transition-all duration-200',
        dragging && 'shadow-xl ring-2 ring-primary/30 scale-[1.02] rotate-1'
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{deal.name}</p>
          <p className="mt-1.5 text-sm font-bold gradient-text">
            {formatCurrency(deal.value, deal.currency)}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-5 h-5 rounded-full bg-gradient-to-br from-primary/70 to-indigo-500 text-[9px] font-bold text-white flex items-center justify-center">
              {deal.owner.firstName[0]}{deal.owner.lastName[0]}
            </span>
            {deal.owner.firstName} {deal.owner.lastName}
          </p>
        </div>
      </div>
    </div>
  );
}

function SortableDealCard({ deal }: { deal: KanbanDeal }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
    data: { type: 'deal', deal },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      {...attributes}
      {...listeners}
    >
      <DealCardContent deal={deal} />
    </div>
  );
}

function KanbanColumn({
  stage,
  dealIds,
}: {
  stage: KanbanStage;
  dealIds: string[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: { type: 'stage', stageId: stage.id },
  });

  return (
    <div className="flex min-w-[280px] flex-col rounded-2xl bg-muted/50 border border-border/40 p-3 backdrop-blur-sm">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
        <span
          className="h-2.5 w-2.5 rounded-full shadow-sm"
          style={{ background: stage.color ?? '#94a3b8' }}
        />
        {stage.name}
        <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-card border border-border text-muted-foreground">
          {dealIds.length}
        </span>
      </h3>
      <div
        ref={setNodeRef}
        className={cn(
          'min-h-[140px] flex-1 space-y-2.5 rounded-xl p-1 transition-all duration-200',
          isOver && 'bg-primary/5 ring-2 ring-primary/20 ring-dashed'
        )}
      >
        <SortableContext items={dealIds} strategy={verticalListSortingStrategy}>
          {stage.deals.map((deal) => (
            <SortableDealCard key={deal.id} deal={deal} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

export function KanbanBoard({ stages: initialStages, onStageChange, className }: KanbanBoardProps) {
  const [stages, setStages] = useState(initialStages);
  const [activeDealId, setActiveDealId] = useState<string | null>(null);

  const dealMap = useMemo(() => {
    const map = new Map<string, KanbanDeal>();
    for (const stage of stages) {
      for (const deal of stage.deals) {
        map.set(deal.id, deal);
      }
    }
    return map;
  }, [stages]);

  const activeDeal = activeDealId ? dealMap.get(activeDealId) : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const moveDeal = (dealId: string, toStageId: string) => {
    setStages((prev) => {
      let movedDeal: KanbanDeal | null = null;
      const without = prev.map((stage) => {
        const deals = stage.deals.filter((d) => {
          if (d.id === dealId) {
            movedDeal = d;
            return false;
          }
          return true;
        });
        return { ...stage, deals };
      });

      if (!movedDeal) return prev;

      return without.map((stage) =>
        stage.id === toStageId
          ? { ...stage, deals: [...stage.deals, movedDeal!] }
          : stage
      );
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDealId(String(event.active.id));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const dealId = String(active.id);
    const fromStageId = findStageForDeal(stages, dealId);
    let toStageId = over.id as string;

    if (over.data.current?.type === 'deal') {
      toStageId = findStageForDeal(stages, String(over.id)) ?? toStageId;
    }

    if (fromStageId && toStageId && fromStageId !== toStageId) {
      moveDeal(dealId, toStageId);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDealId(null);

    if (!over) return;

    const dealId = String(active.id);
    let toStageId = over.id as string;

    if (over.data.current?.type === 'deal') {
      toStageId = findStageForDeal(stages, String(over.id)) ?? toStageId;
    } else if (over.data.current?.type === 'stage') {
      toStageId = over.data.current.stageId as string;
    }

    const fromStageId = findStageForDeal(initialStages, dealId);
    if (fromStageId && toStageId && fromStageId !== toStageId) {
      onStageChange(dealId, toStageId);
    }
  };

  useEffect(() => {
    if (!activeDealId) {
      setStages(initialStages);
    }
  }, [initialStages, activeDealId]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className={cn('flex gap-4 overflow-x-auto pb-4', className)}>
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            dealIds={stage.deals.map((d) => d.id)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeDeal ? <DealCardContent deal={activeDeal} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
