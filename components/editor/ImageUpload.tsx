"use client";

import React, { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { useResumeStore } from '@/store/useResumeStore';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export function ImageUpload() {
  const { resume, updatePersonalInfo, updateTheme } = useResumeStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('File must be an image');
      return;
    }

    try {
      setIsUploading(true);
      const supabase = createClient();
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update resume
      updatePersonalInfo('avatar', publicUrl);
      updateTheme('photo.visible', true);
      toast.success('Image uploaded successfully');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = () => {
    updatePersonalInfo('avatar', '');
    updateTheme('photo.visible', false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        {resume.personalInfo.avatar ? (
          <div className="relative group">
            <img
              src={resume.personalInfo.avatar}
              alt="Avatar"
              className="w-20 h-20 object-cover rounded-md border"
            />
            <button
              onClick={removeImage}
              className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
              title="Remove image"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="w-20 h-20 bg-slate-100 rounded-md border border-dashed flex items-center justify-center text-slate-400">
            <ImageIcon className="w-8 h-8" />
          </div>
        )}

        <div className="flex-1">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {resume.personalInfo.avatar ? 'Change Photo' : 'Upload Photo'}
            </Button>
            {resume.personalInfo.avatar && (
              <Button
                variant="ghost"
                size="sm"
                onClick={removeImage}
                className="text-destructive hover:text-destructive"
              >
                Remove
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Max 2MB. JPG, PNG or WebP.
          </p>
        </div>
      </div>
    </div>
  );
}
