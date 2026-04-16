"use client";

import React from 'react';
import { useResumeStore } from '@/store/useResumeStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ResumeDndContext } from '@/components/dnd/ResumeDndContext';
import { ImageUpload } from './ImageUpload';
import { RichTextEditor } from './RichTextEditor';
import { 
  User, 
  Palette, 
  Type, 
  Layout, 
  Plus,
  Image as ImageIcon,
  FileText,
  LayoutTemplate,
  Sparkles
} from 'lucide-react';
import { SectionType } from '@/types/resume';
import { TEMPLATES } from '@/lib/templates';
import { MagicAIImport } from './MagicAIImport';

export function EditorPanel() {
  return (
    <div className="h-full flex flex-col bg-background border-r overflow-hidden">
      <Tabs defaultValue="content" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full justify-start rounded-none border-b p-0 h-auto overflow-x-auto shrink-0">
          <TabsTrigger
            value="templates"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
          >
            <LayoutTemplate className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger
            value="ai"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-primary"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Magic AI
          </TabsTrigger>
          <TabsTrigger
            value="content"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
          >
            <User className="h-4 w-4 mr-2" />
            Content
          </TabsTrigger>
          <TabsTrigger
            value="design"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
          >
            <Palette className="h-4 w-4 mr-2" />
            Design
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="templates" className="p-4 mt-0 outline-none">
            <TemplatesTab />
          </TabsContent>

          <TabsContent value="ai" className="p-4 mt-0 outline-none">
            <MagicAIImport />
          </TabsContent>

          <TabsContent value="content" className="p-4 mt-0 outline-none">
            <ContentTab />
          </TabsContent>

          <TabsContent value="design" className="p-4 mt-0 outline-none">
            <DesignTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}


function TemplatesTab() {
  const { resume, setTheme } = useResumeStore();

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {TEMPLATES.map((template) => (
          <button
            key={template.id}
            onClick={() => setTheme(template.config)}
            className={cn(
              "flex flex-col text-left p-4 rounded-xl border-2 transition-all hover:border-primary/50",
              resume.theme.fontFamily === template.config.fontFamily && 
              resume.theme.colors.primary === template.config.colors.primary
                ? "border-primary bg-primary/5"
                : "border-slate-100 bg-white"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-900">{template.name}</span>
              {resume.theme.fontFamily === template.config.fontFamily && (
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              )}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-3">
              {template.description}
            </p>
            <div className="flex gap-1.5">
              <div className="h-4 w-4 rounded-full border border-slate-200" style={{ backgroundColor: template.config.colors.primary }} />
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter self-center">
                {template.config.fontFamily} • {template.config.layout.columns}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ContentTab() {
  const { resume, updatePersonalInfo, updateContactInfo, addSection } = useResumeStore();
  const { personalInfo } = resume;

  return (
    <div className="space-y-6 pb-20 md:pb-4">
      {/* Personal Information */}
      <Accordion type="single" collapsible defaultValue="personal-info">
        <AccordionItem value="personal-info" className="border-b-0">
          <AccordionTrigger className="text-sm font-semibold py-3 px-1 hover:no-underline">
            Personal Information
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="space-y-4">
              <ImageUpload />
              
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="name" className="text-xs font-medium mb-1.5 block">Full Name</Label>
                  <Input
                    id="name"
                    value={personalInfo.name}
                    onChange={(e) => updatePersonalInfo('name', e.target.value)}
                    placeholder="John Doe"
                    className="h-10 md:h-9 text-base md:text-sm" // Larger touch target on mobile
                  />
                </div>
                
                <div>
                  <Label htmlFor="title" className="text-xs font-medium mb-1.5 block">Professional Title</Label>
                  <Input
                    id="title"
                    value={personalInfo.title || ''}
                    onChange={(e) => updatePersonalInfo('title', e.target.value)}
                    placeholder="Software Engineer"
                    className="h-10 md:h-9 text-base md:text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="summary" className="text-xs font-medium mb-1.5 block">Summary</Label>
                  <RichTextEditor
                    content={personalInfo.summary || ''}
                    onChange={(value) => updatePersonalInfo('summary', value)}
                    placeholder="Brief professional summary..."
                    className="min-h-[120px]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t mt-6">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 block">Contact Information</Label>
              <div className="grid gap-3">
                <div className="relative group">
                  <Input
                    placeholder="Email"
                    value={personalInfo.contact.email || ''}
                    onChange={(e) => updateContactInfo('email', e.target.value)}
                    className="h-10 md:h-9 text-base md:text-sm"
                  />
                </div>
                <Input
                  placeholder="Phone"
                  value={personalInfo.contact.phone || ''}
                  onChange={(e) => updateContactInfo('phone', e.target.value)}
                  className="h-10 md:h-9 text-base md:text-sm"
                />
                <Input
                  placeholder="Location"
                  value={personalInfo.contact.location || ''}
                  onChange={(e) => updateContactInfo('location', e.target.value)}
                  className="h-10 md:h-9 text-base md:text-sm"
                />
                <Input
                  placeholder="Website"
                  value={personalInfo.contact.website || ''}
                  onChange={(e) => updateContactInfo('website', e.target.value)}
                  className="h-10 md:h-9 text-base md:text-sm"
                />
                <Input
                  placeholder="LinkedIn"
                  value={personalInfo.contact.linkedin || ''}
                  onChange={(e) => updateContactInfo('linkedin', e.target.value)}
                  className="h-10 md:h-9 text-base md:text-sm"
                />
                <Input
                  placeholder="GitHub"
                  value={personalInfo.contact.github || ''}
                  onChange={(e) => updateContactInfo('github', e.target.value)}
                  className="h-10 md:h-9 text-base md:text-sm"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Sections */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <Label className="text-sm font-semibold">Sections</Label>
          <Select
            onValueChange={(value) => addSection(value as SectionType)}
          >
            <SelectTrigger className="h-9 w-[160px] text-xs">
              <SelectValue placeholder="Add section" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="experience">Work Experience</SelectItem>
              <SelectItem value="education">Education</SelectItem>
              <SelectItem value="skills">Skills</SelectItem>
              <SelectItem value="projects">Projects</SelectItem>
              <SelectItem value="certifications">Certifications</SelectItem>
              <SelectItem value="languages">Languages</SelectItem>
              <SelectItem value="interests">Interests</SelectItem>
              <SelectItem value="custom">Custom Section</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ResumeDndContext />
      </div>
    </div>
  );
}

function DesignTab() {
  const { resume, updateTheme, updateThemeColors } = useResumeStore();
  const { theme } = resume;

  const handleFontSizeChange = (key: string, value: number) => {
    updateTheme(`fontSizes.${key}`, `${value}pt`);
  };

  const handleSpacingChange = (key: string, value: number) => {
    updateTheme(`spacing.${key}`, `${value}px`);
  };
  
  const handleMarginChange = (key: string, value: number) => {
    updateTheme(`spacing.margins.${key}`, `${value}px`);
  };

  const handleLayoutChange = (key: string, value: string) => {
    updateTheme(`layout.${key}`, value);
  };
  
  const handlePhotoChange = (key: string, value: any) => {
    updateTheme(`photo.${key}`, value);
  };

  return (
    <div className="space-y-6">
      {/* Page Setup */}
      <Accordion type="single" collapsible defaultValue="page">
        <AccordionItem value="page">
          <AccordionTrigger className="text-sm font-medium">
            <FileText className="h-4 w-4 mr-2" />
            Page Setup
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div>
              <Label className="text-xs mb-2 block">Page Size</Label>
              <Select
                value={theme.layout.pageSize}
                onValueChange={(value) => handleLayoutChange('pageSize', value)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A4">A4 (210mm x 297mm)</SelectItem>
                  <SelectItem value="Letter">Letter (8.5in x 11in)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-semibold">Margins (px)</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <Label className="text-[10px] text-muted-foreground">Top</Label>
                    <span className="text-[10px]">{parseInt(theme.spacing.margins.top)}</span>
                  </div>
                  <Slider
                    value={[parseInt(theme.spacing.margins.top)]}
                    onValueChange={(value) => handleMarginChange('top', value[0])}
                    min={0} max={100} step={5} className="h-2"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <Label className="text-[10px] text-muted-foreground">Bottom</Label>
                    <span className="text-[10px]">{parseInt(theme.spacing.margins.bottom)}</span>
                  </div>
                  <Slider
                    value={[parseInt(theme.spacing.margins.bottom)]}
                    onValueChange={(value) => handleMarginChange('bottom', value[0])}
                    min={0} max={100} step={5} className="h-2"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <Label className="text-[10px] text-muted-foreground">Left</Label>
                    <span className="text-[10px]">{parseInt(theme.spacing.margins.left)}</span>
                  </div>
                  <Slider
                    value={[parseInt(theme.spacing.margins.left)]}
                    onValueChange={(value) => handleMarginChange('left', value[0])}
                    min={0} max={100} step={5} className="h-2"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <Label className="text-[10px] text-muted-foreground">Right</Label>
                    <span className="text-[10px]">{parseInt(theme.spacing.margins.right)}</span>
                  </div>
                  <Slider
                    value={[parseInt(theme.spacing.margins.right)]}
                    onValueChange={(value) => handleMarginChange('right', value[0])}
                    min={0} max={100} step={5} className="h-2"
                  />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Photo Styling */}
      <Accordion type="single" collapsible>
        <AccordionItem value="photo">
          <AccordionTrigger className="text-sm font-medium">
            <ImageIcon className="h-4 w-4 mr-2" />
            Photo Styling
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Show Photo</Label>
              <Switch 
                checked={theme.photo.visible}
                onCheckedChange={(checked) => handlePhotoChange('visible', checked)}
              />
            </div>
            
            {theme.photo.visible && (
              <>
                <div>
                  <Label className="text-xs mb-2 block">Shape</Label>
                  <Select
                    value={theme.photo.shape}
                    onValueChange={(value) => handlePhotoChange('shape', value)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="square">Square</SelectItem>
                      <SelectItem value="circle">Circle</SelectItem>
                      <SelectItem value="rounded">Rounded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <Label className="text-xs">Size</Label>
                    <span className="text-xs text-muted-foreground">
                      {parseInt(theme.photo.size)}px
                    </span>
                  </div>
                  <Slider
                    value={[parseInt(theme.photo.size)]}
                    onValueChange={(value) => handlePhotoChange('size', `${value[0]}px`)}
                    min={40}
                    max={150}
                    step={5}
                    className="h-2"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <Label className="text-xs">Border Width</Label>
                    <span className="text-xs text-muted-foreground">
                      {parseInt(theme.photo.borderWidth)}px
                    </span>
                  </div>
                  <Slider
                    value={[parseInt(theme.photo.borderWidth)]}
                    onValueChange={(value) => handlePhotoChange('borderWidth', `${value[0]}px`)}
                    min={0}
                    max={10}
                    step={1}
                    className="h-2"
                  />
                </div>
                
                <div>
                  <Label className="text-xs mb-2 block">Border Color</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={theme.photo.borderColor}
                      onChange={(e) => handlePhotoChange('borderColor', e.target.value)}
                      className="h-8 w-12 rounded cursor-pointer"
                    />
                    <Input
                      value={theme.photo.borderColor}
                      onChange={(e) => handlePhotoChange('borderColor', e.target.value)}
                      className="h-8 text-sm flex-1 uppercase"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-xs">Grayscale</Label>
                  <Switch 
                    checked={theme.photo.grayscale}
                    onCheckedChange={(checked) => handlePhotoChange('grayscale', checked)}
                  />
                </div>
              </>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Typography */}
      <Accordion type="single" collapsible defaultValue="typography">
        <AccordionItem value="typography">
          <AccordionTrigger className="text-sm font-medium">
            <Type className="h-4 w-4 mr-2" />
            Typography
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div>
              <Label className="text-xs mb-2 block">Font Family</Label>
              <Select
                value={theme.fontFamily}
                onValueChange={(value) => updateTheme('fontFamily', value)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inter">Inter</SelectItem>
                  <SelectItem value="Arial">Arial</SelectItem>
                  <SelectItem value="Georgia">Georgia</SelectItem>
                  <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                  <SelectItem value="Helvetica">Helvetica</SelectItem>
                  <SelectItem value="Verdana">Verdana</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <Label className="text-xs">Base Font Size</Label>
                  <span className="text-xs text-muted-foreground">
                    {parseInt(theme.fontSizes.base)}pt
                  </span>
                </div>
                <Slider
                  value={[parseInt(theme.fontSizes.base)]}
                  onValueChange={(value) => handleFontSizeChange('base', value[0])}
                  min={8}
                  max={14}
                  step={0.5}
                  className="h-2"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <Label className="text-xs">Header Size</Label>
                  <span className="text-xs text-muted-foreground">
                    {parseInt(theme.fontSizes.header)}pt
                  </span>
                </div>
                <Slider
                  value={[parseInt(theme.fontSizes.header)]}
                  onValueChange={(value) => handleFontSizeChange('header', value[0])}
                  min={16}
                  max={36}
                  step={1}
                  className="h-2"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <Label className="text-xs">Subheader Size</Label>
                  <span className="text-xs text-muted-foreground">
                    {parseInt(theme.fontSizes.subHeader)}pt
                  </span>
                </div>
                <Slider
                  value={[parseInt(theme.fontSizes.subHeader)]}
                  onValueChange={(value) => handleFontSizeChange('subHeader', value[0])}
                  min={9}
                  max={18}
                  step={0.5}
                  className="h-2"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Colors */}
      <Accordion type="single" collapsible>
        <AccordionItem value="colors">
          <AccordionTrigger className="text-sm font-medium">
            <Palette className="h-4 w-4 mr-2" />
            Colors
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div className="grid gap-3">
              <div>
                <Label className="text-xs mb-2 block">Primary Color</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={theme.colors.primary}
                    onChange={(e) => updateThemeColors({ primary: e.target.value })}
                    className="h-8 w-12 rounded cursor-pointer"
                  />
                  <Input
                    value={theme.colors.primary}
                    onChange={(e) => updateThemeColors({ primary: e.target.value })}
                    className="h-8 text-sm flex-1 uppercase"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs mb-2 block">Text Color</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={theme.colors.text}
                    onChange={(e) => updateThemeColors({ text: e.target.value })}
                    className="h-8 w-12 rounded cursor-pointer"
                  />
                  <Input
                    value={theme.colors.text}
                    onChange={(e) => updateThemeColors({ text: e.target.value })}
                    className="h-8 text-sm flex-1 uppercase"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs mb-2 block">Muted Text Color</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={theme.colors.muted}
                    onChange={(e) => updateThemeColors({ muted: e.target.value })}
                    className="h-8 w-12 rounded cursor-pointer"
                  />
                  <Input
                    value={theme.colors.muted}
                    onChange={(e) => updateThemeColors({ muted: e.target.value })}
                    className="h-8 text-sm flex-1 uppercase"
                  />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Layout */}
      <Accordion type="single" collapsible>
        <AccordionItem value="layout">
          <AccordionTrigger className="text-sm font-medium">
            <Layout className="h-4 w-4 mr-2" />
            Layout
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div>
              <Label className="text-xs mb-2 block">Header Alignment</Label>
              <Select
                value={theme.layout.headerAlign}
                onValueChange={(value) => handleLayoutChange('headerAlign', value)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs mb-2 block">Summary Alignment</Label>
              <Select
                value={theme.layout.summaryAlign}
                onValueChange={(value) => handleLayoutChange('summaryAlign', value)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                  <SelectItem value="justify">Justify</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <Label className="text-xs">Section Spacing</Label>
                  <span className="text-xs text-muted-foreground">
                    {parseInt(theme.spacing.section)}px
                  </span>
                </div>
                <Slider
                  value={[parseInt(theme.spacing.section)]}
                  onValueChange={(value) => handleSpacingChange('section', value[0])}
                  min={5}
                  max={30}
                  step={1}
                  className="h-2"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <Label className="text-xs">Item Spacing</Label>
                  <span className="text-xs text-muted-foreground">
                    {parseInt(theme.spacing.item)}px
                  </span>
                </div>
                <Slider
                  value={[parseInt(theme.spacing.item)]}
                  onValueChange={(value) => handleSpacingChange('item', value[0])}
                  min={5}
                  max={25}
                  step={1}
                  className="h-2"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
