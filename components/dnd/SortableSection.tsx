"use client";

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { useResumeStore } from '@/store/useResumeStore';
import { ResumeSection } from '@/types/resume';
import { GripVertical, Eye, EyeOff, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { SortableItem } from './SortableItem';

interface SortableSectionProps {
  section: ResumeSection;
}

export function SortableSection({ section }: SortableSectionProps) {
  const {
    removeSection,
    updateSection,
    addItem,
    selectSection,
    selectedSectionId,
  } = useResumeStore();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `section__${section.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isSelected = selectedSectionId === section.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group mb-3', // Slightly more margin
        isDragging && 'opacity-50 z-50 scale-[1.02] shadow-lg'
      )}
    >
      <Accordion
        type="single"
        collapsible
        value={isSelected ? section.id : undefined}
        onValueChange={(value) => selectSection(value || null)}
        className="border rounded-lg bg-background shadow-sm"
      >
        <AccordionItem value={section.id} className="px-2 md:px-4 border-b-0">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-1 md:gap-2">
              <button
                className="cursor-grab active:cursor-grabbing p-2 md:p-1 hover:bg-muted rounded touch-none"
                {...attributes}
                {...listeners}
                aria-label="Drag section"
              >
                <GripVertical className="h-5 w-5 md:h-4 md:w-4 text-slate-400" />
              </button>
              
              <AccordionTrigger className="py-0 hover:no-underline text-base md:text-sm">
                <span className="font-semibold text-slate-900">{section.title}</span>
              </AccordionTrigger>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 md:h-8 md:w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  updateSection(section.id, 'isVisible', !section.isVisible);
                }}
                aria-label={section.isVisible ? "Hide section" : "Show section"}
              >
                {section.isVisible ? (
                  <Eye className="h-5 w-5 md:h-4 md:w-4" />
                ) : (
                  <EyeOff className="h-5 w-5 md:h-4 md:w-4" />
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 md:h-8 md:w-8 text-destructive hover:text-destructive hover:bg-red-50"
                onClick={(e) => {
                  e.stopPropagation();
                  removeSection(section.id);
                }}
                aria-label="Delete section"
              >
                <Trash2 className="h-5 w-5 md:h-4 md:w-4" />
              </Button>
            </div>
          </div>

          <AccordionContent>
            <div className="space-y-4 pt-2 pb-4">
              {/* Section Items */}
              <div className="space-y-3">
                {section.items.map((item, index) => (
                  <SortableItem
                    key={item.id}
                    item={item}
                    sectionId={section.id}
                    index={index}
                  />
                ))}
              </div>

              {/* Add Item Button */}
              <Button
                variant="outline"
                size="default"
                className="w-full h-11 md:h-9 border-dashed mt-2 font-medium"
                onClick={() => addItem(section.id)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add {section.title.endsWith('s') ? section.title.slice(0, -1) : 'Item'}
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
