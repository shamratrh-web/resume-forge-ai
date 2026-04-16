"use client";

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useResumeStore } from '@/store/useResumeStore';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { EditorPanel } from '@/components/editor/EditorPanel';
import { ResumePreview } from '@/components/editor/ResumePreview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Save,
  Download,
  Loader2,
  FileText,
  Pencil,
} from 'lucide-react';

interface EditorPageProps {
  params: Promise<{ id: string }>;
}

export default function EditorPage({ params }: EditorPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { 
    resume, 
    setResume,
    resetResume,
    updateTitle,
    toggleDraft,
    undo,
    redo,
    isSaving, 
    setSaving, 
    hasUnsavedChanges,
    setUnsavedChanges,
  } = useResumeStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [zoom, setZoom] = useState(100);
  const [pageCount, setPageCount] = useState(1);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState<'edit' | 'pdf'>('edit');

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Fetch resume data on mount
  useEffect(() => {
    const fetchResume = async () => {
      if (resolvedParams.id === 'new') {
        resetResume();
        setIsLoading(false);
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('id', resolvedParams.id)
        .single();

      if (error) {
        toast.error('Failed to load resume');
        router.push('/');
        return;
      }

      if (data) {
        setResume({
          id: data.id,
          title: data.title,
          is_draft: data.is_draft,
          personalInfo: data.content.personalInfo,
          sections: data.content.sections,
          theme: data.theme_config,
        });
      }

      setIsLoading(false);
    };

    fetchResume();
  }, [resolvedParams.id, router, setResume, resetResume]);

  useEffect(() => {
    if (previewMode !== 'pdf') return;

    let urlToRevoke: string | null = null;

    const buildPdfPreview = async () => {
      setIsPreviewLoading(true);

      try {
        const response = await fetch('/api/pdf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            preview: true,
            content: {
              personalInfo: resume.personalInfo,
              sections: resume.sections,
            },
            theme_config: resume.theme,
            title: resume.title,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate preview PDF');
        }

        const pagesHeader = response.headers.get('X-Page-Count');
        setPageCount(pagesHeader ? Number(pagesHeader) : 1);

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        urlToRevoke = objectUrl;
        setPreviewUrl(objectUrl);
      } catch {
        setPreviewUrl(null);
      } finally {
        setIsPreviewLoading(false);
      }
    };

    const timer = setTimeout(buildPdfPreview, 450);

    return () => {
      clearTimeout(timer);
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
    };
  }, [previewMode, resume.personalInfo, resume.sections, resume.theme, resume.title]);

  // Auto-save functionality
  const saveResume = async () => {
    if (resolvedParams.id === 'new') {
      // Create new resume
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Please sign in to save');
        return;
      }

      const { data, error } = await supabase
        .from('resumes')
        .insert({
          user_id: user.id,
          title: resume.title,
          is_draft: resume.is_draft,
          content: {
            personalInfo: resume.personalInfo,
            sections: resume.sections,
          },
          theme_config: resume.theme,
        })
        .select()
        .single();

      if (error) {
        console.error('Create resume error:', error);
        toast.error(`Failed to create resume: ${error.message}`);
        return;
      }

      setUnsavedChanges(false);
      router.replace(`/editor/${data.id}`);
      toast.success('Resume created as ' + (resume.is_draft ? 'draft' : 'final'));
      return;
    }

    // Update existing resume
    const supabase = createClient();
    const { error } = await supabase
      .from('resumes')
      .update({
        title: resume.title,
        is_draft: resume.is_draft,
        content: {
          personalInfo: resume.personalInfo,
          sections: resume.sections,
        },
        theme_config: resume.theme,
        updated_at: new Date().toISOString(),
      })
      .eq('id', resolvedParams.id);

    if (error) {
      console.error('Update resume error:', error);
      toast.error(`Failed to save resume: ${error.message}`);
      return;
    }

    setUnsavedChanges(false);
    toast.success('Resume saved');
  };

  // Download PDF
  const downloadPdf = async () => {
    if (resolvedParams.id === 'new') {
      toast.error('Please save your resume first');
      return;
    }

    setSaving(true);
    
    try {
      const response = await fetch('/api/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resumeId: resolvedParams.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${resume.title || 'resume'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('PDF downloaded');
    } catch (error) {
      toast.error('Failed to generate PDF');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-100 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b px-4 py-2 flex items-center justify-between shrink-0 z-50">
        <div className="flex items-center gap-2 md:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/')}
            className="h-10 w-10" // Larger touch target
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <Input
            value={resume.title}
            onChange={(e) => updateTitle(e.target.value)}
            className="w-32 md:w-48 h-9 font-medium border-0 focus-visible:ring-1 bg-transparent"
            placeholder="Untitled"
          />

          <div className="flex items-center gap-2 ml-2 border-l pl-2 md:pl-4">
            <span className="text-[10px] font-bold uppercase text-slate-400 hidden sm:inline">Draft</span>
            <Switch
              checked={!resume.is_draft}
              onCheckedChange={(checked) => toggleDraft(!checked)}
              className="scale-75"
            />
            <span className="text-[10px] font-bold uppercase text-slate-400 hidden sm:inline">Final</span>
          </div>
          
          {hasUnsavedChanges && (
            <span className="text-[10px] md:text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 hidden md:inline">
              Unsaved
            </span>
          )}
        </div>

        {/* Mobile Tab Switcher */}
        <div className="flex md:hidden bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('edit')}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              activeTab === 'edit' ? "bg-white shadow-sm text-primary" : "text-slate-500"
            )}
          >
            Edit
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              activeTab === 'preview' ? "bg-white shadow-sm text-primary" : "text-slate-500"
            )}
          >
            Preview
          </button>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          {/* Desktop Preview Controls */}
          <div className="hidden md:flex items-center gap-2 mr-4">
            <div className="flex items-center bg-slate-100 rounded-md p-1">
              <button
                onClick={() => setPreviewMode('edit')}
                className={cn(
                  'px-2 py-1 text-xs rounded flex items-center gap-1',
                  previewMode === 'edit' ? 'bg-white shadow-sm text-primary' : 'text-slate-600'
                )}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
              <button
                onClick={() => setPreviewMode('pdf')}
                className={cn(
                  'px-2 py-1 text-xs rounded flex items-center gap-1',
                  previewMode === 'pdf' ? 'bg-white shadow-sm text-primary' : 'text-slate-600'
                )}
              >
                <FileText className="h-3.5 w-3.5" />
                PDF
              </button>
            </div>

            <Button variant="ghost" size="icon" onClick={() => setZoom(Math.max(50, zoom - 10))}>
              <span className="text-sm">−</span>
            </Button>
            <span className="text-xs w-12 text-center">{zoom}%</span>
            <Button variant="ghost" size="icon" onClick={() => setZoom(Math.min(150, zoom + 10))}>
              <span className="text-sm">+</span>
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={saveResume}
            disabled={isSaving}
            className="h-9 md:h-8 px-2 md:px-3"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 md:mr-2" />}
            <span className="hidden md:inline">Save</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={downloadPdf}
            disabled={isSaving}
            className="h-9 md:h-8 px-2 md:px-3"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 md:mr-2" />}
            <span className="hidden md:inline">PDF</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Editor Panel - Fixed on Desktop, Toggleable on Mobile */}
        <div className={cn(
          "w-full md:w-96 shrink-0 overflow-hidden border-r bg-white transition-transform duration-300 md:translate-x-0 absolute md:relative z-20 h-full",
          activeTab === 'edit' ? "translate-x-0" : "-translate-x-full"
        )}>
          <EditorPanel />
        </div>

        {/* Preview Canvas - Scrollable, Toggleable on Mobile */}
        <div className={cn(
          "flex-1 overflow-auto bg-slate-200/50 p-4 md:p-8 flex flex-col items-center gap-4 transition-transform duration-300 w-full absolute md:relative z-10 h-full",
          activeTab === 'preview' ? "translate-x-0" : "translate-x-full md:translate-x-0"
        )}>
          <div
            className="transition-transform duration-200 origin-top"
            style={{ transform: `scale(${activeTab === 'preview' && typeof window !== 'undefined' && window.innerWidth < 768 ? (window.innerWidth - 32) / 794 : zoom / 100})` }}
          >
            <div className="md:hidden mb-2 flex items-center justify-center">
              <div className="flex items-center bg-slate-100 rounded-md p-1">
                <button
                  onClick={() => setPreviewMode('edit')}
                  className={cn(
                    'px-2 py-1 text-xs rounded flex items-center gap-1',
                    previewMode === 'edit' ? 'bg-white shadow-sm text-primary' : 'text-slate-600'
                  )}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => setPreviewMode('pdf')}
                  className={cn(
                    'px-2 py-1 text-xs rounded flex items-center gap-1',
                    previewMode === 'pdf' ? 'bg-white shadow-sm text-primary' : 'text-slate-600'
                  )}
                >
                  <FileText className="h-3.5 w-3.5" />
                  PDF
                </button>
              </div>
            </div>

            {/* Page Indicator (только для точного PDF-режима) */}
            {previewMode === 'pdf' && (
              <div className="text-xs text-slate-500 mb-2 font-medium text-center">
                {pageCount} {pageCount === 1 ? 'page' : 'pages'}
              </div>
            )}

            {previewMode === 'edit' ? (
              <div
                className="bg-white shadow-2xl overflow-hidden"
                style={{
                  width: resume.theme.layout.pageSize === 'Letter' ? '8.5in' : '210mm',
                  minHeight: resume.theme.layout.pageSize === 'Letter' ? '11in' : '297mm',
                }}
              >
                <ResumePreview />
              </div>
            ) : (
              <div
                className="relative bg-white shadow-2xl"
                style={{
                  width: resume.theme.layout.pageSize === 'Letter' ? '8.5in' : '210mm',
                  minHeight: resume.theme.layout.pageSize === 'Letter' ? '11in' : '297mm',
                }}
              >
                {isPreviewLoading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
                  </div>
                )}

                {previewUrl ? (
                  <iframe
                    title="PDF Preview"
                    src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                    className="w-full"
                    style={{
                      height: resume.theme.layout.pageSize === 'Letter' ? 'calc(11in * 1.5)' : 'calc(297mm * 1.5)',
                      border: 'none',
                    }}
                  />
                ) : (
                  <div className="h-full min-h-[60vh] flex items-center justify-center text-sm text-slate-500">
                    Preview unavailable
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}