"use client";

import { useId, useOptimistic, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { PipelineStage } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { PIPELINE_COLUMNS, STAGE_LABELS, STAGE_VARIANT, type PipelineColumnId } from "@/lib/pipeline";
import { cn } from "@/lib/utils";
import { movePatientStage } from "./actions";

export type KanbanCard = {
  id: string;
  name: string;
  phone: string;
  healthInsurance: string | null;
  channel: string;
  stage: PipelineStage;
  column: PipelineColumnId;
  appointment: string | null;
};

type Move = { cardId: string; column: PipelineColumnId; stage: PipelineStage };

export function KanbanBoard({ cards }: { cards: KanbanCard[] }) {
  const [optimisticCards, applyMove] = useOptimistic(cards, (state, move: Move) =>
    state.map((c) => (c.id === move.cardId ? { ...c, column: move.column, stage: move.stage } : c)),
  );
  const [, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Id estable entre servidor y cliente: sin él, dnd-kit genera "DndDescribedBy-N" distinto en cada lado (error de hidratación).
  const dndId = useId();
  const nameOf = (id: string | number) => optimisticCards.find((c) => c.id === id)?.name ?? "el paciente";
  const columnOf = (id: string | number | undefined) => PIPELINE_COLUMNS.find((c) => c.id === id)?.title;
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Tomaste a ${nameOf(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over ? `${nameOf(active.id)} está sobre la columna ${columnOf(over.id)}.` : `${nameOf(active.id)} no está sobre ninguna columna.`,
    onDragEnd: ({ active, over }) =>
      over ? `Soltaste a ${nameOf(active.id)} en ${columnOf(over.id)}.` : `Soltaste a ${nameOf(active.id)} fuera de las columnas.`,
    onDragCancel: ({ active }) => `Se canceló el movimiento de ${nameOf(active.id)}.`,
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
    setError(null);
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const card = optimisticCards.find((c) => c.id === e.active.id);
    const column = PIPELINE_COLUMNS.find((c) => c.id === e.over?.id);
    if (!card || !column || column.id === card.column) return;

    const move: Move = { cardId: card.id, column: column.id, stage: column.dropStage };
    startTransition(async () => {
      applyMove(move);
      try {
        await movePatientStage(card.id, column.dropStage);
      } catch {
        setError(`No se pudo mover a ${card.name}. Intentá de nuevo.`);
      }
    });
  }

  const activeCard = optimisticCards.find((c) => c.id === activeId);

  return (
    <>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <DndContext
        id={dndId}
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              "Para mover a un paciente, presioná espacio. Usá las flechas para llevarlo a otra columna y espacio para soltarlo, o escape para cancelar.",
          },
        }}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {PIPELINE_COLUMNS.map((column) => {
            const columnCards = optimisticCards.filter((c) => c.column === column.id);
            return (
              <Column key={column.id} id={column.id} title={column.title} count={columnCards.length}>
                {columnCards.map((card) => (
                  <DraggableCard key={card.id} card={card} />
                ))}
              </Column>
            );
          })}
        </div>
        <DragOverlay>{activeCard && <CardBody card={activeCard} className="shadow-lg" />}</DragOverlay>
      </DndContext>
    </>
  );
}

function Column({ id, title, count, children }: { id: string; title: string; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section
      ref={setNodeRef}
      aria-label={title}
      className={cn(
        "flex w-64 shrink-0 flex-col gap-2 rounded-lg border bg-muted p-2 transition-colors",
        isOver && "border-primary bg-secondary",
      )}
    >
      <header className="flex items-center justify-between px-1 text-sm font-medium">
        <span>{title}</span>
        <span className="text-xs text-muted-foreground">{count}</span>
      </header>
      <div className="flex min-h-24 flex-col gap-2">{children}</div>
    </section>
  );
}

function DraggableCard({ card }: { card: KanbanCard }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={cn("cursor-grab touch-none", isDragging && "opacity-40")}>
      <CardBody card={card} />
    </div>
  );
}

function CardBody({ card, className }: { card: KanbanCard; className?: string }) {
  return (
    <article className={cn("space-y-1.5 rounded-md border bg-card p-2.5 text-sm shadow-xs", className)}>
      <p className="font-medium">{card.name}</p>
      <p className="text-xs text-muted-foreground">
        {[card.name !== card.phone && card.phone, card.healthInsurance].filter(Boolean).join(" · ") || "Sin datos aún"}
      </p>
      {card.appointment && <p className="text-xs">Turno: {card.appointment}</p>}
      <div className="flex flex-wrap gap-1">
        <Badge variant={STAGE_VARIANT[card.stage]}>{STAGE_LABELS[card.stage]}</Badge>
        <Badge variant="outline">{card.channel}</Badge>
      </div>
    </article>
  );
}
