import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ClubAutocomplete } from '@/components/ClubAutocomplete';
import { Plus, Loader2, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';

const formSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  description: z.string().optional(),
  club_id: z.string().optional(),
  club_name: z.string().min(2, 'Selecione ou digite o nome do clube'),
  club_image: z.string().optional(),
  entry_fee: z.coerce.number().min(0, 'Taxa deve ser positiva'),
  admin_fee_percent: z.coerce.number().min(0).max(100, 'Taxa deve estar entre 0 e 100'),
  allow_draws: z.boolean().default(false),
  allow_multiple_tickets: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateTorcidaMestreDialogProps {
  onCreated?: () => void;
}

export function CreateTorcidaMestreDialog({ onCreated }: CreateTorcidaMestreDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      club_id: '',
      club_name: '',
      club_image: '',
      entry_fee: 0,
      admin_fee_percent: 20,
      allow_draws: false,
      allow_multiple_tickets: false,
    },
  });
  
  const onSubmit = async (values: FormValues) => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('torcida_mestre_pools')
        .insert({
          name: values.name,
          description: values.description || null,
          club_id: values.club_id || null,
          club_name: values.club_name,
          club_image: values.club_image || null,
          entry_fee: values.entry_fee,
          admin_fee_percent: values.admin_fee_percent,
          allow_draws: values.allow_draws,
          allow_multiple_tickets: values.allow_multiple_tickets,
          created_by: user.id,
        });
      
      if (error) throw error;
      
      toast.success('Bolão Time Mestre criado com sucesso!');
      form.reset();
      setOpen(false);
      onCreated?.();
    } catch (error: any) {
      console.error('Error creating pool:', error);
      toast.error(error.message || 'Erro ao criar bolão');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-amber-500 hover:bg-amber-600 text-amber-950">
          <Plus className="h-4 w-4 mr-2" />
          Criar Time Mestre
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Criar Bolão Time Mestre
          </DialogTitle>
          <DialogDescription>
            Crie um bolão focado em um único time. Participantes que acertarem o placar exato vencem!
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Bolão</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Bolão do Cruzeiro 2026" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="club_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clube</FormLabel>
                  <FormControl>
                    <ClubAutocomplete
                      value={field.value}
                      onSelect={(club) => {
                        form.setValue('club_id', club.id);
                        form.setValue('club_name', club.name);
                        form.setValue('club_image', club.logo_url || '');
                      }}
                      onCreate={(name) => {
                        form.setValue('club_name', name);
                        form.setValue('club_id', '');
                        form.setValue('club_image', '');
                      }}
                      placeholder="Buscar clube..."
                    />
                  </FormControl>
                  <FormDescription>
                    Selecione o clube que será o foco deste bolão
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descreva as regras ou informações adicionais..."
                      className="resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="entry_fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taxa de Entrada (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="admin_fee_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taxa Admin (%)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="100" step="0.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="allow_draws"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Considerar Empates</FormLabel>
                    <FormDescription>
                      Se habilitado, empates com placar exato também premiam
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="allow_multiple_tickets"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Permitir Múltiplos Palpites</FormLabel>
                    <FormDescription>
                      Participantes podem comprar vários tickets
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-amber-500 hover:bg-amber-600 text-amber-950"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Criar Bolão
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
