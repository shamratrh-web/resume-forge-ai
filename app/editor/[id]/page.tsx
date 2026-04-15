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
  Share2,
  Loader2,
  Undo2,
  Redo2,
  Eye,
  EyeOff,
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
  const [showPreview, setShowPreview] = useState(true);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [zoom, setZoom] = useState(100);

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
          {/* Desktop Zoom/View Controls */}
          <div className="hidden md:flex items-center gap-1 mr-4">
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
          "flex-1 overflow-auto bg-slate-200/50 p-4 md:p-8 flex justify-center transition-transform duration-300 w-full absolute md:relative z-10 h-full",
          activeTab === 'preview' ? "translate-x-0" : "translate-x-full md:translate-x-0"
        )}>
          <div
            className="transition-transform duration-200 origin-top"
            style={{ transform: `scale(${activeTab === 'preview' && typeof window !== 'undefined' && window.innerWidth < 768 ? (window.innerWidth - 32) / 794 : zoom / 100})` }}
          >
            <div className="bg-white shadow-2xl mb-20" style={{ width: '210mm' }}>
              <ResumePreview />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}