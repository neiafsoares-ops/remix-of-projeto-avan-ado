import React, { useCallback, useState } from 'react';
import { Upload, X, Camera, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AvatarUploadProps {
  value?: string | null;
  onChange: (url: string) => void;
  userId: string;
  fallback?: string;
  className?: string;
}

export function AvatarUpload({
  value,
  onChange,
  userId,
  fallback = 'U',
  className,
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione apenas arquivos de imagem.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Erro',
        description: 'A imagem deve ter no máximo 5MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/avatar.${fileExt}`;

      // Delete old avatar if exists
      await supabase.storage.from('avatars').remove([fileName]);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Add timestamp to bust cache
      const urlWithCache = `${publicUrl}?t=${Date.now()}`;
      onChange(urlWithCache);
      
      toast({
        title: 'Sucesso',
        description: 'Foto de perfil atualizada!',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Erro no upload',
        description: error.message || 'Não foi possível enviar a imagem.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        uploadFile(file);
      }
    },
    [userId]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  return (
    <div
      className={cn('relative group', className)}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <Avatar className={cn(
        'w-24 h-24 border-4 transition-all cursor-pointer',
        isDragging ? 'border-primary scale-105' : 'border-background',
        isUploading && 'opacity-50'
      )}>
        <AvatarImage src={value || undefined} alt="Avatar" />
        <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
          {fallback}
        </AvatarFallback>
      </Avatar>

      {/* Overlay */}
      <div className={cn(
        'absolute inset-0 rounded-full flex items-center justify-center transition-opacity',
        'bg-black/50 opacity-0 group-hover:opacity-100',
        isDragging && 'opacity-100',
        isUploading && 'opacity-100'
      )}>
        {isUploading ? (
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        ) : isDragging ? (
          <Upload className="w-8 h-8 text-white" />
        ) : (
          <Camera className="w-8 h-8 text-white" />
        )}
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer rounded-full"
        disabled={isUploading}
      />
    </div>
  );
}
