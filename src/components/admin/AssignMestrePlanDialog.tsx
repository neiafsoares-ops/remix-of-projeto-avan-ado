import { useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Crown, Loader2, Infinity } from 'lucide-react';
import type { MestrePlanType } from '@/hooks/use-mestre-subscription';

interface AssignMestrePlanDialogProps {
  userId: string;
  userName: string;
  onSuccess: () => void;
  children: React.ReactNode;
}

const PLANS: { type: MestrePlanType; name: string; limit: number | null; duration: string; color: string }[] = [
  { type: 'iniciante', name: 'Iniciante', limit: 3, duration: '90 dias', color: 'bg-emerald-500' },
  { type: 'intermediario', name: 'Intermediário', limit: 8, duration: '180 dias', color: 'bg-blue-500' },
  { type: 'supremo', name: 'Supremo', limit: null, duration: '365 dias', color: 'bg-amber-500' },
];

export function AssignMestrePlanDialog({ userId, userName, onSuccess, children }: AssignMestrePlanDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<MestrePlanType | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAssign = async () => {
    if (!selectedPlan) return;

    setLoading(true);
    try {
      // Get the plan details
      const { data: planData, error: planError } = await (supabase as any)
        .from('mestre_plans')
        .select('id, duration_days')
        .eq('plan_type', selectedPlan)
        .single();

      if (planError || !planData) {
        throw new Error('Plano não encontrado. Execute a migration do banco de dados.');
      }

      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + planData.duration_days);

      // Insert subscription
      const { error: subError } = await (supabase as any)
        .from('mestre_subscriptions')
        .insert({
          user_id: userId,
          plan_id: planData.id,
          expires_at: expiresAt.toISOString(),
        });

      if (subError) throw subError;

      // Also grant mestre_bolao role if not already present
      await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role: 'mestre_bolao' as any }, { onConflict: 'user_id,role' });

      const planName = PLANS.find(p => p.type === selectedPlan)?.name;
      
      toast({
        title: 'Plano atribuído!',
        description: `${userName} agora é Mestre ${planName}.`,
      });

      setOpen(false);
      setSelectedPlan(null);
      onSuccess();
    } catch (error: any) {
      console.error('Error assigning plan:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atribuir o plano.',
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Atribuir Plano Mestre
          </DialogTitle>
          <DialogDescription>
            Selecione o plano para <strong>@{userName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {PLANS.map((plan) => (
            <button
              key={plan.type}
              onClick={() => setSelectedPlan(plan.type)}
              className={`
                w-full p-4 rounded-lg border-2 transition-all text-left
                ${selectedPlan === plan.type 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge className={`${plan.color} text-white`}>
                    {plan.name}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {plan.duration}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-sm font-medium">
                  {plan.limit === null ? (
                    <>
                      <Infinity className="h-4 w-4" />
                      <span>ilimitados</span>
                    </>
                  ) : (
                    <span>{plan.limit} bolões</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={!selectedPlan || loading}
            className="gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Atribuir Plano
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
