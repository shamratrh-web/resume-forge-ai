"use client";

import React from 'react';
import { useResumeStore } from '@/store/useResumeStore';
import { cn } from '@/lib/utils';
import { ResumeSection as IResumeSection, ResumeItem as IResumeItem } from '@/types/resume';
import { User, EyeOff, ArrowUp, ArrowDown, Trash2, AlignLeft, AlignCenter, AlignRight, X } from 'lucide-react';
import { PreviewEditor } from './PreviewEditor';

// Helper to convert pts to px for screen
const convertPtToPx = (pt: string) => {
  const value = parseFloat(pt);
  if (isNaN(value)) return pt;
  return `${value * 1.333}px`;
};

export function ResumePreview() {
  const { resume, updatePersonalInfo, updateContactInfo, updateTheme } = useResumeStore();
  const { theme, personalInfo, sections } = resume;

  const dimensions = React.useMemo(() => {
    switch (theme.layout.pageSize) {
      case 'Letter':
        return { width: '8.5in', height: '11in' };
      case 'A4':
      default:
        return { width: '210mm', height: '297mm' };
    }
  }, [theme.layout.pageSize]);

  const removeContactField = (field: string) => {
    updateContactInfo(field, '');
  };

  return (
    <div
      className="bg-white text-slate-900 shadow-sm relative group/page"
      style={{
        width: dimensions.width,
        minHeight: dimensions.height,
        fontFamily: theme.fontFamily,
        color: theme.colors.text,
        backgroundColor: theme.colors.background,
        paddingTop: theme.spacing.margins.top,
        paddingRight: theme.spacing.margins.right,
        paddingBottom: theme.spacing.margins.bottom,
        paddingLeft: theme.spacing.margins.left,
        fontSize: convertPtToPx(theme.fontSizes.base),
        lineHeight: 1.5,
      }}
    >
      <header 
        className={cn(
          "mb-8 border-b pb-6 relative group/header flex gap-6",
          theme.layout.headerAlign === 'center' && "text-center flex-col items-center",
          theme.layout.headerAlign === 'right' && "text-right flex-row-reverse"
        )}
        style={{ borderColor: theme.colors.border }}
      >
        {/* Alignment Controls (Page Level Sidebar) */}
        <div className="absolute -left-14 top-0 flex flex-col gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity print:hidden">
           <button 
            onClick={() => updateTheme('layout.headerAlign', 'left')}
            className={cn("p-1.5 bg-white border rounded shadow-sm hover:bg-slate-50", theme.layout.headerAlign === 'left' && "text-primary border-primary")}
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button 
            onClick={() => updateTheme('layout.headerAlign', 'center')}
            className={cn("p-1.5 bg-white border rounded shadow-sm hover:bg-slate-50", theme.layout.headerAlign === 'center' && "text-primary border-primary")}
            title="Align Center"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button 
            onClick={() => updateTheme('layout.headerAlign', 'right')}
            className={cn("p-1.5 bg-white border rounded shadow-sm hover:bg-slate-50", theme.layout.headerAlign === 'right' && "text-primary border-primary")}
            title="Align Right"
          >
            <AlignRight className="w-4 h-4" />
          </button>
        </div>

        {/* Photo */}
        {theme.photo.visible && (
          <div className="shrink-0 relative group/photo">
             {personalInfo.avatar ? (
               <img
                src={personalInfo.avatar}
                alt={personalInfo.name}
                className={cn(
                  "object-cover",
                  theme.photo.shape === 'circle' && "rounded-full",
                  theme.photo.shape === 'rounded' && "rounded-lg",
                  theme.photo.grayscale && "grayscale"
                )}
                style={{
                  width: theme.photo.size,
                  height: theme.photo.size,
                  borderWidth: theme.photo.borderWidth,
                  borderColor: theme.photo.borderColor,
                  borderStyle: 'solid'
                }}
              />
             ) : (
               <div 
                 className={cn("bg-slate-200 flex items-center justify-center text-slate-400", theme.photo.shape === 'circle' && "rounded-full", theme.photo.shape === 'rounded' && "rounded-lg")}
                 style={{ width: theme.photo.size, height: theme.photo.size }}
               >
                 <User className="w-1/2 h-1/2" />
               </div>
             )}
             <button 
               onClick={() => updateTheme('photo.visible', false)}
               className="absolute -top-2 -right-2 bg-white border rounded-full p-0.5 opacity-0 group-hover/photo:opacity-100 shadow-sm text-red-500 hover:bg-red-50"
             >
               <X className="w-3 h-3" />
             </button>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <PreviewEditor 
            content={personalInfo.name || 'Your Name'}
            onChange={(val) => updatePersonalInfo('name', val)}
            className="font-bold leading-tight"
            singleLine
            style={{ 
              fontSize: convertPtToPx(theme.fontSizes.header),
              color: theme.colors.primary 
            }}
          />
          
          <PreviewEditor 
            content={personalInfo.title || 'Professional Title'}
            onChange={(val) => updatePersonalInfo('title', val)}
            className="mt-1"
            singleLine
            style={{ 
              fontSize: convertPtToPx(theme.fontSizes.subHeader),
              color: theme.colors.muted 
            }}
          />

          <div 
            className={cn(
              "flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm",
              theme.layout.headerAlign === 'center' && "justify-center",
              theme.layout.headerAlign === 'right' && "justify-end"
            )}
            style={{ color: theme.colors.muted }}
          >
            {['email', 'phone', 'location', 'website', 'linkedin'].map((field) => (
              personalInfo.contact[field as keyof typeof personalInfo.contact] && (
                <span key={field} className="relative group/contact inline-flex items-center">
                  <PreviewEditor 
                    content={personalInfo.contact[field as keyof typeof personalInfo.contact]!}
                    onChange={(val) => updateContactInfo(field, val)}
                    singleLine
                  />
                  <button 
                    onClick={() => removeContactField(field)}
                    className="ml-1 opacity-0 group-hover/contact:opacity-100 text-red-400 hover:text-red-600 print:hidden"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )
            ))}
          </div>

          {personalInfo.summary && (
            <div className="mt-4">
              <PreviewEditor 
                content={personalInfo.summary}
                onChange={(val) => updatePersonalInfo('summary', val)}
                className={cn(
                  theme.layout.summaryAlign === 'center' && "text-center", 
                  theme.layout.summaryAlign === 'right' && "text-right",
                  theme.layout.summaryAlign === 'justify' && "text-justify"
                )}
              />
            </div>
          )}
        </div>
      </header>

      {theme.layout.columns === 'double' ? (
        <div className="flex gap-10 items-start">
          {/* Main Column (experience, projects, etc) */}
          <div className="flex-[2] flex flex-col" style={{ gap: theme.spacing.section }}>
            {sections
              .filter((s) => s.isVisible && ['experience', 'projects', 'education', 'custom'].includes(s.type))
              .map((section, idx) => (
                <SectionDisplay key={section.id} section={section} index={idx} total={sections.length} />
              ))}
          </div>
          
          {/* Sidebar Column (skills, contact summary etc) */}
          <div 
            className="flex-1 flex flex-col border-l pl-10 h-full" 
            style={{ gap: theme.spacing.section, borderColor: theme.colors.border }}
          >
            {sections
              .filter((s) => s.isVisible && ['skills', 'languages', 'certifications', 'interests'].includes(s.type))
              .map((section, idx) => (
                <SectionDisplay key={section.id} section={section} index={idx} total={sections.length} />
              ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col" style={{ gap: theme.spacing.section }}>
          {sections
            .filter((section) => section.isVisible)
            .map((section, idx) => (
              <SectionDisplay key={section.id} section={section} index={idx} total={sections.length} />
            ))}
        </div>
      )}
    </div>
  );
}

function SectionDisplay({ section, index, total }: { section: IResumeSection, index: number, total: number }) {
  const { resume, updateSection, reorderSections } = useResumeStore();
  const { theme } = resume;

  return (
    <section style={{ marginBottom: theme.spacing.section }} className="relative group/section">
      <div className="absolute -left-12 top-0 flex flex-col gap-1 opacity-0 group-hover/section:opacity-100 transition-opacity print:hidden">
        <button 
          onClick={() => updateSection(section.id, 'isVisible', false)}
          className="p-1.5 bg-white border rounded shadow-sm hover:bg-red-50 hover:text-red-500"
          title="Hide Section"
        >
          <EyeOff className="w-4 h-4" />
        </button>
        {index > 0 && (
          <button 
            onClick={() => reorderSections(section.id, resume.sections[index-1].id)}
            className="p-1.5 bg-white border rounded shadow-sm hover:bg-slate-50"
            title="Move Up"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        )}
        {index < total - 1 && (
          <button 
            onClick={() => reorderSections(section.id, resume.sections[index+1].id)}
            className="p-1.5 bg-white border rounded shadow-sm hover:bg-slate-50"
            title="Move Down"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}
      </div>

      <PreviewEditor 
        content={section.title}
        onChange={(val) => updateSection(section.id, 'title', val)}
        className="font-bold uppercase tracking-wider mb-4 border-b pb-1"
        singleLine
        style={{ 
          fontSize: convertPtToPx(theme.fontSizes.subHeader),
          color: theme.colors.primary,
          borderColor: theme.colors.border 
        }}
      />

      <div className="space-y-4" style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.item }}>
        {section.items.map((item, itemIdx) => (
          <ItemDisplay key={item.id} item={item} sectionId={section.id} index={itemIdx} total={section.items.length} />
        ))}
      </div>
    </section>
  );
}

function ItemDisplay({ item, sectionId, index, total }: { item: IResumeItem, sectionId: string, index: number, total: number }) {
  const { resume, updateItem, updateBullet, updateTag, reorderItems, removeItem } = useResumeStore();
  const { theme } = resume;

  const visibility = item.fieldVisibility || {
    title: true,
    subtitle: true,
    date: true,
    location: true,
    description: true
  };

  const isVisible = (field: string) => visibility[field as keyof typeof visibility] !== false;

  return (
    <div className="relative group/item">
       <div className="absolute -left-10 top-0 flex flex-col gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity print:hidden">
        {index > 0 && (
          <button 
            onClick={() => reorderItems(sectionId, item.id, resume.sections.find(s => s.id === sectionId)!.items[index-1].id)}
            className="p-1 bg-white border rounded shadow-sm hover:bg-slate-50"
          >
            <ArrowUp className="w-3 h-3" />
          </button>
        )}
        {index < total - 1 && (
          <button 
            onClick={() => reorderItems(sectionId, item.id, resume.sections.find(s => s.id === sectionId)!.items[index+1].id)}
            className="p-1 bg-white border rounded shadow-sm hover:bg-slate-50"
          >
            <ArrowDown className="w-3 h-3" />
          </button>
        )}
        <button 
          onClick={() => removeItem(sectionId, item.id)}
          className="p-1 bg-white border rounded shadow-sm hover:bg-red-50 text-red-400"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {(isVisible('title') || isVisible('date')) && (
        <div className="flex justify-between items-baseline mb-1">
          {isVisible('title') && (
            <PreviewEditor 
              content={item.title || ''}
              onChange={(val) => updateItem(sectionId, item.id, 'title', val)}
              className="font-semibold"
              singleLine
              style={{ fontSize: convertPtToPx(theme.fontSizes.base) }}
            />
          )}
          
          {isVisible('date') && (
            <div 
              className={cn("flex gap-1 text-sm shrink-0 ml-auto", !isVisible('title') && "ml-0")} 
              style={{ color: theme.colors.muted, fontSize: convertPtToPx(theme.fontSizes.small) }}
            >
              <PreviewEditor 
                content={item.date || ''}
                onChange={(val) => updateItem(sectionId, item.id, 'date', val)}
                singleLine
              />
              { (item.dateEnd || item.current) && <span>-</span> }
              <PreviewEditor 
                content={item.current ? 'Present' : item.dateEnd || ''}
                onChange={(val) => updateItem(sectionId, item.id, 'dateEnd', val)}
                singleLine
              />
            </div>
          )}
        </div>
      )}

      {(isVisible('subtitle') || isVisible('location')) && (
        <div className="flex justify-between items-center mb-2">
          {isVisible('subtitle') && (
            <PreviewEditor 
              content={item.subtitle || item.organization || ''}
              onChange={(val) => updateItem(sectionId, item.id, 'subtitle', val)}
              className="text-sm font-medium"
              singleLine
              style={{ color: theme.colors.muted }}
            />
          )}
          
          {isVisible('location') && (
            <div className={cn("ml-auto", !isVisible('subtitle') && "ml-0")}>
              <PreviewEditor 
                content={item.location || ''}
                onChange={(val) => updateItem(sectionId, item.id, 'location', val)}
                className="text-sm"
                singleLine
                style={{ color: theme.colors.muted, fontSize: convertPtToPx(theme.fontSizes.small) }}
              />
            </div>
          )}
        </div>
      )}

      {isVisible('description') && item.description && (
        <div className="text-sm mb-2">
           <PreviewEditor 
            content={item.description}
            onChange={(val) => updateItem(sectionId, item.id, 'description', val)}
            className="prose prose-sm max-w-none"
            style={{ fontSize: convertPtToPx(theme.fontSizes.small) }}
          />
        </div>
      )}

      {item.bullets && item.bullets.length > 0 && (
        <ul className="list-disc list-outside ml-4 space-y-1">
          {item.bullets.map((bullet, bulletIdx) => (
            <li 
              key={bulletIdx} 
              className="text-sm pl-1 group/bullet relative"
              style={{ fontSize: convertPtToPx(theme.fontSizes.small) }}
            >
              <PreviewEditor 
                content={bullet}
                onChange={(val) => updateBullet(sectionId, item.id, bulletIdx, val)}
              />
            </li>
          ))}
        </ul>
      )}
      
      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {item.tags.map((tag, i) => (
            <div 
              key={i}
              className="px-2 py-0.5 rounded text-[10px] font-medium"
              style={{ 
                backgroundColor: `${theme.colors.primary}15`,
                color: theme.colors.primary 
              }}
            >
              <PreviewEditor 
                content={tag}
                onChange={(val) => updateTag(sectionId, item.id, i, val)}
                singleLine
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}