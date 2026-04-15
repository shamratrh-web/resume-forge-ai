"use client";

import React from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useResumeStore } from '@/store/useResumeStore';
import { SortableSection } from './SortableSection';
import { SortableItem } from './SortableItem';
import { ResumeSection, ResumeItem } from '@/types/resume';
import { cn } from '@/lib/utils';

interface ResumeDndContextProps {
}

export function ResumeDndContext({ }: ResumeDndContextProps) {
  const {
    resume,
    reorderSections,
    reorderItems,
    selectedSectionId,
    selectSection,
  } = useResumeStore();

  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [activeType, setActiveType] = React.useState<'section' | 'item' | null>(null);
  const [activeSectionId, setActiveSectionId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const idParts = String(active.id).split('__');
    
    if (idParts[0] === 'section') {
      setActiveType('section');
      setActiveId(idParts[1]);
    } else if (idParts[0] === 'item') {
      setActiveType('item');
      setActiveId(idParts[1]);
      setActiveSectionId(idParts[2]);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    
    const activeParts = activeIdStr.split('__');
    const overParts = overIdStr.split('__');

    // Handle section reordering
    if (activeParts[0] === 'section' && overParts[0] === 'section') {
      if (activeIdStr !== overIdStr) {
        reorderSections(activeIdStr, overIdStr);
      }
    }

    // Handle item reordering between sections
    if (activeParts[0] === 'item' && overParts[0] === 'item') {
      const sourceSectionId = activeParts[2];
      const targetSectionId = overParts[2];
      
      if (sourceSectionId === targetSectionId) {
        // Same section - reorder
        if (activeIdStr !== overIdStr) {
          reorderItems(sourceSectionId, activeIdStr, overIdStr);
        }
      }
    }

    // Handle item dropping on a section
    if (activeParts[0] === 'item' && overParts[0] === 'section') {
      const sourceSectionId = activeParts[2];
      const targetSectionId = overParts[1];
      
      if (sourceSectionId !== targetSectionId) {
        // Move item to different section
        // This would require an additional action in the store
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setActiveType(null);
    setActiveSectionId(null);

    if (!over) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    if (activeIdStr === overIdStr) return;

    const activeParts = activeIdStr.split('__');
    const overParts = overIdStr.split('__');

    if (activeParts[0] === 'section') {
      reorderSections(activeIdStr, overIdStr);
    }
  };

  const handleDragEndItem = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setActiveType(null);
    setActiveSectionId(null);

    if (!over) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    const activeParts = activeIdStr.split('__');
    const overParts = overIdStr.split('__');

    if (activeParts[0] === 'item' && overParts[0] === 'item') {
      const sectionId = activeParts[2];
      reorderItems(sectionId, activeIdStr, overIdStr);
    }
  };

  const getActiveSection = (): ResumeSection | undefined => {
    if (activeType === 'section' && activeId) {
      return resume.sections.find((s) => s.id === activeId);
    }
    return undefined;
  };

  const getActiveItem = (): { section: ResumeSection; item: ResumeItem } | undefined => {
    if (activeType === 'item' && activeId && activeSectionId) {
      const section = resume.sections.find((s) => s.id === activeSectionId);
      const item = section?.items.find((i) => i.id === activeId);
      if (section && item) {
        return { section, item };
      }
    }
    return undefined;
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full">
        {/* Sortable Sections */}
        <SortableContext
          items={resume.sections.map((s) => `section__${s.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {resume.sections.map((section) => (
            <SortableSection key={section.id} section={section} />
          ))}
        </SortableContext>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeType === 'section' && activeId && (
          <div className="bg-background border-2 border-primary rounded-lg shadow-lg p-4 opacity-90">
            <span className="font-medium">
              {getActiveSection()?.title || 'Section'}
            </span>
          </div>
        )}
        {activeType === 'item' && activeId && (
          <div className="bg-background border-2 border-primary rounded shadow-lg p-3 opacity-90 max-w-md">
            <span className="font-medium text-sm">
              {getActiveItem()?.item.title || 'Item'}
            </span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
