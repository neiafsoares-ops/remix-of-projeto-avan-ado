import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Megaphone, Loader2, Users, Shield, Crown } from 'lucide-react';

type Audience = 'all' | 'moderators' | 'mestres';

interface CreateNotificationFormProps {
  onSuccess?: () => void;
}

export function CreateNotificationForm({ onSuccess }: CreateNotificationFormProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<Audience>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [targetCount, setTargetCount] = useState(0);

  const MAX_TITLE_LENGTH = 40;
  const MAX_MESSAGE_LENGTH = 150;

  const getTargetUsers = async (targetAudience: Audience): Promise<string[]> => {
    switch (targetAudience) {
      case 'all': {
        const { data } = await supabase.from('profiles').select('id');
        return data?.map(p => p.id) || [];
      }
      case 'moderators': {
        const { data } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'moderator');
        return data?.map(r => r.user_id) || [];
      }
      case 'mestres': {
        const { data } = await supabase
          .from('mestre_plans')
          .select('user_id')
          .eq('is_active', true);
        return data?.map(p => p.user_id) || [];
      }
    }
  };

  const handlePrepareSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o título e a mensagem.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const userIds = await getTargetUsers(audience);
      setTargetCount(userIds.length);

      if (userIds.length === 0) {
        toast({
          title: 'Nenhum destinatário',
          description: 'Não há usuários para o público-alvo selecionado.',
          variant: 'destructive',
        });
        return;
      }

      setShowConfirmDialog(true);
    } catch (error) {
      console.error('Error fetching target users:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível buscar os destinatários.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendNotifications = async () => {
    setIsLoading(true);
    setShowConfirmDialog(false);

    try {
      const userIds = await getTargetUsers(audience);

      const notifications = userIds.map(userId => ({
        user_id: userId,
        type: 'admin_broadcast',
        title: title.trim(),
        message: message.trim(),
        data: { sent_by: 'admin', audience },
      }));

      // Insert in batches of 100 to avoid timeout
      const batchSize = 100;
      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);
        const { error } = await supabase.from('notifications').insert(batch);
        if (error) throw error;
      }

      toast({
        title: 'Notificações enviadas!',
        description: `${notifications.length} notificações foram enviadas com sucesso.`,
      });

      // Reset form
      setTitle('');
      setMessage('');
      setAudience('all');
      onSuccess?.();
    } catch (error: any) {
      console.error('Error sending notifications:', error);
      toast({
        title: 'Erro ao enviar',
        description: error.message || 'Não foi possível enviar as notificações.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getAudienceLabel = (aud: Audience) => {
    switch (aud) {
      case 'all': return 'todos os usuários';
      case 'moderators': return 'moderadores';
      case 'mestres': return 'mestres do bolão';
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Field */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="title">Título *</Label>
          <span className={`text-xs ${title.length > MAX_TITLE_LENGTH ? 'text-destructive' : 'text-muted-foreground'}`}>
            {title.length}/{MAX_TITLE_LENGTH}
          </span>
        </div>
        <Input
          id="title"
          placeholder="Ex: Aviso importante"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE_LENGTH))}
          maxLength={MAX_TITLE_LENGTH}
        />
      </div>

      {/* Message Field */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="message">Mensagem *</Label>
          <span className={`text-xs ${message.length > MAX_MESSAGE_LENGTH ? 'text-destructive' : 'text-muted-foreground'}`}>
            {message.length}/{MAX_MESSAGE_LENGTH}
          </span>
        </div>
        <Textarea
          id="message"
          placeholder="Digite a mensagem da notificação..."
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
          maxLength={MAX_MESSAGE_LENGTH}
          rows={3}
        />
      </div>

      {/* Audience Selection */}
      <div className="space-y-3">
        <Label>Público-alvo *</Label>
        <RadioGroup
          value={audience}
          onValueChange={(value: Audience) => setAudience(value)}
          className="space-y-2"
        >
          <div className="flex items-center space-x-3 rounded-md border p-3 hover:bg-muted/50 cursor-pointer">
            <RadioGroupItem value="all" id="all" />
            <Label htmlFor="all" className="flex items-center gap-2 cursor-pointer flex-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              Todos os usuários
            </Label>
          </div>
          <div className="flex items-center space-x-3 rounded-md border p-3 hover:bg-muted/50 cursor-pointer">
            <RadioGroupItem value="moderators" id="moderators" />
            <Label htmlFor="moderators" className="flex items-center gap-2 cursor-pointer flex-1">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Apenas Moderadores
            </Label>
          </div>
          <div className="flex items-center space-x-3 rounded-md border p-3 hover:bg-muted/50 cursor-pointer">
            <RadioGroupItem value="mestres" id="mestres" />
            <Label htmlFor="mestres" className="flex items-center gap-2 cursor-pointer flex-1">
              <Crown className="h-4 w-4 text-muted-foreground" />
              Apenas Mestres
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Preview */}
      {(title || message) && (
        <div className="space-y-2">
          <Label>Preview</Label>
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-accent/20">
                  <Megaphone className="h-4 w-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{title || 'Título da notificação'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {message || 'Mensagem da notificação...'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">agora</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Submit Button */}
      <Button
        onClick={handlePrepareSend}
        disabled={isLoading || !title.trim() || !message.trim()}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Preparando...
          </>
        ) : (
          <>
            <Megaphone className="h-4 w-4 mr-2" />
            Enviar Notificação
          </>
        )}
      </Button>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar envio</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a enviar uma notificação para{' '}
              <strong>{targetCount} {getAudienceLabel(audience)}</strong>.
              <br /><br />
              <strong>Título:</strong> {title}
              <br />
              <strong>Mensagem:</strong> {message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSendNotifications}>
              Enviar para {targetCount} usuários
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
