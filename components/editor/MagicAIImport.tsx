"use client";

import React, { useState, useRef } from 'react';
import { useResumeStore } from '@/store/useResumeStore';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  FileUp, 
  Loader2, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { toast } from 'sonner';

export function MagicAIImport() {
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setResume, resume } = useResumeStore();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    setIsUploading(true);
    setIsSuccess(false);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/resume/extract', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to extract data');
      }

      const extractedData = await response.json();
      
      // Map extracted data to current resume structure, preserving theme
      const newResume = {
        ...resume,
        personalInfo: extractedData.personalInfo || resume.personalInfo,
        sections: extractedData.sections || resume.sections,
        title: extractedData.personalInfo?.name ? `${extractedData.personalInfo.name}'s Resume` : resume.title
      };

      setResume(newResume);
      setIsSuccess(true);
      toast.success('Resume data extracted successfully!');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred');
      toast.error(err.message || 'Failed to extract data');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl bg-slate-50/50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 text-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Magic AI Import</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-[240px]">
          Upload your existing resume PDF and let AI automatically fill in all the details for you.
        </p>
        
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileUpload}
          className="hidden"
          ref={fileInputRef}
          disabled={isUploading}
        />
        
        <Button 
          onClick={() => fileInputRef.current?.click()} 
          disabled={isUploading}
          className="w-full max-w-[200px]"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <FileUp className="mr-2 h-4 w-4" />
              Upload PDF
            </>
          )}
        </Button>
      </div>

      {isSuccess && (
        <div className="flex items-start p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
          <CheckCircle2 className="h-5 w-5 mr-3 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Success!</p>
            <p className="opacity-90 text-xs">Your resume has been populated with the extracted information. You can now review and edit it.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start p-4 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/50">
          <AlertCircle className="h-5 w-5 mr-3 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Import Failed</p>
            <p className="opacity-90 text-xs">{error}</p>
          </div>
        </div>
      )}

      <div className="space-y-4 pt-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">How it works</h4>
        <ul className="space-y-3">
          {[
            { step: 1, text: "Upload your existing PDF resume" },
            { step: 2, text: "AI parses your experience, education, and skills" },
            { step: 3, text: "Fields are automatically filled in the editor" },
            { step: 4, text: "Review and fine-tune your new resume" }
          ].map((item) => (
            <li key={item.step} className="flex items-center text-sm">
              <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold mr-3 shrink-0">
                {item.step}
              </span>
              <span className="text-slate-600 dark:text-slate-400">{item.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
