"use client";

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn, stripHtml } from '@/lib/utils';
import { useResumeStore } from '@/store/useResumeStore';
import { ResumeItem } from '@/types/resume';
import { GripVertical, Trash2, Plus, Settings2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label as UILabel } from "@/components/ui/label";

interface SortableItemProps {
  item: ResumeItem;
  sectionId: string;
  index: number;
}

export function SortableItem({ item, sectionId, index }: SortableItemProps) {
  const { updateItem, removeItem, toggleItemField } = useResumeStore();

  const visibility = item.fieldVisibility || {
    title: true,
    subtitle: true,
    date: true,
    location: true,
    description: true
  };

  const isVisible = (field: string) => visibility[field as keyof typeof visibility] !== false;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `item__${item.id}__${sectionId}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-slate-50/50 rounded-lg p-3 md:p-2 border border-slate-200 shadow-sm transition-all',
        isDragging && 'opacity-50 z-50 border-primary bg-primary/5 shadow-md'
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex flex-col items-center gap-1 mt-1">
          <button
            className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-slate-200 rounded touch-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-slate-400" />
          </button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400">
                <Settings2 className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" align="start">
              <h4 className="text-xs font-bold uppercase mb-3 text-slate-500">Show/Hide Fields</h4>
              <div className="space-y-3">
                {[
                  { id: 'title', label: 'Title / Role' },
                  { id: 'subtitle', label: 'Organization' },
                  { id: 'date', label: 'Date / Period' },
                  { id: 'location', label: 'Location' },
                  { id: 'description', label: 'Description' },
                ].map((field) => (
                  <div key={field.id} className="flex items-center justify-between">
                    <UILabel htmlFor={`vis-${field.id}`} className="text-xs">{field.label}</UILabel>
                    <Switch
                      id={`vis-${field.id}`}
                      checked={isVisible(field.id)}
                      onCheckedChange={() => toggleItemField(sectionId, item.id, field.id)}
                    />
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex-1 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-2">
            <Input
              placeholder="Title"
              value={stripHtml(item.title) || ''}
              onChange={(e) => updateItem(sectionId, item.id, 'title', e.target.value)}
              className={cn("h-10 md:h-8 text-base md:text-sm", !isVisible('title') && "opacity-40 grayscale")}
            />
            <Input
              placeholder="Organization"
              value={stripHtml(item.subtitle) || ''}
              onChange={(e) => updateItem(sectionId, item.id, 'subtitle', e.target.value)}
              className={cn("h-10 md:h-8 text-base md:text-sm", !isVisible('subtitle') && "opacity-40 grayscale")}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-2">
            <div className="flex gap-2 items-center">
              <Input
                placeholder="Start"
                value={stripHtml(item.date) || ''}
                onChange={(e) => updateItem(sectionId, item.id, 'date', e.target.value)}
                className={cn("h-10 md:h-8 text-base md:text-sm flex-1", !isVisible('date') && "opacity-40 grayscale")}
              />
              <Input
                placeholder="End"
                value={stripHtml(item.dateEnd) || ''}
                onChange={(e) => updateItem(sectionId, item.id, 'dateEnd', e.target.value)}
                className={cn("h-10 md:h-8 text-base md:text-sm flex-1", !isVisible('date') && "opacity-40 grayscale")}
              />
            </div>
            <Input
              placeholder="Location"
              value={stripHtml(item.location) || ''}
              onChange={(e) => updateItem(sectionId, item.id, 'location', e.target.value)}
              className={cn("h-10 md:h-8 text-base md:text-sm", !isVisible('location') && "opacity-40 grayscale")}
            />
          </div>

          <div className={cn(!isVisible('description') && "opacity-40 grayscale")}>
            <RichTextEditor
              placeholder="Description..."
              content={item.description || ''}
              onChange={(value) => updateItem(sectionId, item.id, 'description', value)}
            />
          </div>

          {/* Bullets */}
          {item.bullets && item.bullets.length > 0 && (
            <div className="space-y-2 ml-2 md:ml-4 border-l-2 border-slate-100 pl-3">
              {item.bullets.map((bullet, bulletIndex) => (
                <div key={bulletIndex} className="flex items-center gap-2">
                  <Input
                    placeholder="Key achievement..."
                    value={stripHtml(bullet)}
                    onChange={(e) => {
                      const newBullets = [...(item.bullets || [])];
                      newBullets[bulletIndex] = e.target.value;
                      updateItem(sectionId, item.id, 'bullets', newBullets);
                    }}
                    className="h-10 md:h-8 text-base md:text-sm flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 md:h-7 md:w-7 text-destructive hover:bg-red-50 shrink-0"
                    onClick={() => {
                      const newBullets = [...(item.bullets || [])];
                      newBullets.splice(bulletIndex, 1);
                      updateItem(sectionId, item.id, 'bullets', newBullets);
                    }}
                  >
                    <Trash2 className="h-4 w-4 md:h-3.5 md:w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-10 md:h-7 text-sm md:text-xs text-primary hover:bg-primary/5"
            onClick={() => {
              const newBullets = [...(item.bullets || []), 'New achievement'];
              updateItem(sectionId, item.id, 'bullets', newBullets);
            }}
          >
            <Plus className="h-4 w-4 md:h-3.5 md:w-3.5 mr-1.5" />
            Add Bullet Point
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 md:h-8 md:w-8 text-slate-400 hover:text-destructive hover:bg-red-50 shrink-0"
          onClick={() => removeItem(sectionId, item.id)}
          aria-label="Delete item"
        >
          <Trash2 className="h-5 w-5 md:h-4 md:w-4" />
        </Button>
      </div>
    </div>
  );
}