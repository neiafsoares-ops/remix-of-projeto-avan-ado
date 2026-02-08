import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ImageUpload } from '@/components/ImageUpload';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { formatBRL } from '@/lib/prize-utils';
import { Loader2, Target, DollarSign, Percent, Globe } from 'lucide-react';

interface CreateQuizDialogProps {
  children: React.ReactNode;
  onSuccess?: () => void;
}

export function CreateQuizDialog({ children, onSuccess }: CreateQuizDialogProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    entry_fee: 0,
    admin_fee_percent: 20,
    cover_image: '',
    is_public: true,
    allow_multiple_tickets: false,
  });

  const estimatedPrizePerParticipant = formData.entry_fee * (1 - formData.admin_fee_percent / 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: 'Erro',
        description: 'Informe o nome do quiz.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('quizzes')
        .insert({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          entry_fee: formData.entry_fee,
          admin_fee_percent: formData.admin_fee_percent,
          cover_image: formData.cover_image || null,
          is_public: formData.is_public,
          allow_multiple_tickets: formData.allow_multiple_tickets,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Quiz criado!',
        description: 'Agora adicione rodadas e perguntas.',
      });

      setOpen(false);
      setFormData({
        name: '',
        description: '',
        entry_fee: 0,
        admin_fee_percent: 0,
        cover_image: '',
        is_public: true,
        allow_multiple_tickets: false,
      });

      onSuccess?.();
      navigate(`/quiz/${data.id}/manage`);
    } catch (error: any) {
      console.error('Error creating quiz:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar o quiz.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-accent" />
            Criar Novo Quiz
          </DialogTitle>
          <DialogDescription>
            Configure o quiz com nome, valor de entrada e taxa administrativa.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Quiz *</Label>
            <Input
              id="name"
              placeholder="Ex: Quiz Esportes Janeiro 2026"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Responda 10 perguntas e acumule pontos!"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          {/* Valor e Taxa */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entry_fee" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Valor de Entrada
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  R$
                </span>
                <Input
                  id="entry_fee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.entry_fee}
                  onChange={(e) => setFormData({ ...formData, entry_fee: parseFloat(e.target.value) || 0 })}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-muted-foreground" />
                Taxa Administrativa
              </Label>
              <div className="pt-2">
                <Slider
                  value={[formData.admin_fee_percent]}
                  onValueChange={(value) => setFormData({ ...formData, admin_fee_percent: value[0] })}
                  max={50}
                  step={1}
                />
                <p className="text-sm text-muted-foreground text-center mt-1">
                  {formData.admin_fee_percent}%
                </p>
              </div>
            </div>
          </div>

          {/* Prêmio Estimado */}
          {formData.entry_fee > 0 && (
            <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
              <p className="text-sm text-muted-foreground mb-1">
                📋 Prêmio estimado por participante:
              </p>
              <p className="text-xl font-bold text-accent">
                {formatBRL(estimatedPrizePerParticipant)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                (Valor entrada - taxa admin)
              </p>
            </div>
          )}

          {/* Imagem de Capa */}
          <div className="space-y-2">
            <Label>Imagem de Capa (opcional)</Label>
            <ImageUpload
              value={formData.cover_image}
              onChange={(url) => setFormData({ ...formData, cover_image: url })}
              placeholder="Clique para fazer upload ou arraste uma imagem"
            />
          </div>

          {/* Público/Privado */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Quiz Público</p>
                <p className="text-sm text-muted-foreground">
                  Qualquer pessoa pode ver e participar
                </p>
              </div>
            </div>
            <Switch
              checked={formData.is_public}
              onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
            />
          </div>

          {/* Múltiplos Palpites */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Permitir Múltiplos Palpites</p>
                <p className="text-sm text-muted-foreground">
                  Participantes podem comprar vários tickets
                </p>
              </div>
            </div>
            <Switch
              checked={formData.allow_multiple_tickets}
              onCheckedChange={(checked) => setFormData({ ...formData, allow_multiple_tickets: checked })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Target className="h-4 w-4 mr-2" />
                  Criar Quiz
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
