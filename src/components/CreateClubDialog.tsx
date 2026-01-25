import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/ImageUpload';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface Club {
  id: string;
  name: string;
  logo_url: string | null;
}

interface CreateClubDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
  onClubCreated: (club: Club) => void;
}

export function CreateClubDialog({
  open,
  onOpenChange,
  initialName = '',
  onClubCreated,
}: CreateClubDialogProps) {
  const [name, setName] = useState(initialName);
  const [logoUrl, setLogoUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Update name when initialName changes
  React.useEffect(() => {
    if (initialName) {
      setName(initialName);
    }
  }, [initialName]);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Nome do clube é obrigatório');
      return;
    }

    if (name.trim().length < 2) {
      setError('Nome deve ter pelo menos 2 caracteres');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Check if club already exists
      const { data: existing } = await supabase
        .from('clubs')
        .select('id, name, image_url')
        .ilike('name', name.trim())
        .maybeSingle();

      if (existing) {
        // Club exists, use it instead
        const clubData: Club = { id: existing.id, name: existing.name, logo_url: existing.image_url };
        toast({
          title: 'Clube já existe',
          description: `O clube "${existing.name}" já está cadastrado. Selecionando automaticamente.`,
        });
        onClubCreated(clubData);
        onOpenChange(false);
        resetForm();
        return;
      }

      // Create new club
      const { data: newClub, error: createError } = await supabase
        .from('clubs')
        .insert({
          name: name.trim(),
          image_url: logoUrl || null,
        })
        .select('id, name, image_url')
        .single();

      if (createError) {
        // Check for duplicate key error
        if (createError.message.includes('duplicate') || createError.message.includes('unique')) {
          setError('Um clube com este nome já existe');
          return;
        }
        throw createError;
      }

      const clubData: Club = { id: newClub.id, name: newClub.name, logo_url: newClub.image_url };

      toast({
        title: 'Clube criado!',
        description: `O clube "${newClub.name}" foi adicionado à base global.`,
      });

      onClubCreated(clubData);
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('Error creating club:', error);
      setError(error.message || 'Erro ao criar clube');
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setName('');
    setLogoUrl('');
    setError(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Criar Novo Clube
          </DialogTitle>
          <DialogDescription>
            Este clube será adicionado à base global e poderá ser reutilizado em todos os bolões.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="club-name">Nome do Clube *</Label>
            <Input
              id="club-name"
              placeholder="Ex: Flamengo, Barcelona, Real Madrid..."
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              disabled={isCreating}
            />
            <p className="text-xs text-muted-foreground">
              Use o nome oficial do clube para evitar duplicatas.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Logo/Escudo</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Esta será a imagem padrão do clube em todos os bolões.
            </p>
            <ImageUpload
              value={logoUrl}
              onChange={setLogoUrl}
              placeholder="Arraste ou clique para adicionar o escudo"
              bucket="team-images"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isCreating}
          >
            Cancelar
          </Button>
          <Button
            variant="hero"
            onClick={handleCreate}
            disabled={isCreating || !name.trim()}
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Criando...
              </>
            ) : (
              'Criar Clube'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
