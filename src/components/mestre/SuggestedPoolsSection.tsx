import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useMestreSubscription } from '@/hooks/use-mestre-subscription';
import { 
  Sparkles, 
  Calendar, 
  Loader2,
  Copy,
  CheckCircle,
  Trophy,
  Target,
  AlertTriangle,
  Crown,
  Lock,
  HelpCircle,
  Settings,
  CheckCircle2,
  Check
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type { SuggestedPool, SuggestedPoolRound, SuggestedPoolMatch } from '@/types/suggested-pools';

// Limits for common members
const MEMBER_LIMITS = {
  maxTeams: 8,
  maxGroups: 2,
  maxMatches: 15,
};

interface SuggestedPoolWithDetails extends SuggestedPool {
  rounds: SuggestedPoolRound[];
  matches: SuggestedPoolMatch[];
  total_matches: number;
}

interface PoolLimitCheck {
  withinLimits: boolean;
  violations: string[];
}

export function SuggestedPoolsSection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Subscription and limits check
  const { 
    canCreateResult, 
    isAdmin, 
    isMestreBolao,
    loading: loadingSubscription 
  } = useMestreSubscription(user?.id);
  
  const isPrivilegedUser = isAdmin || isMestreBolao;
  const canCreateNewPool = canCreateResult?.canCreate ?? false;
  
  const [suggestedPools, setSuggestedPools] = useState<SuggestedPoolWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [adopting, setAdopting] = useState(false);
  
  // Adopt dialog
  const [adoptDialogOpen, setAdoptDialogOpen] = useState(false);
  const [selectedPool, setSelectedPool] = useState<SuggestedPoolWithDetails | null>(null);
  const [adoptFormData, setAdoptFormData] = useState({
    name: '',
    description: '',
    is_public: false
  });

  // Check if a suggested pool exceeds user limits
  const checkPoolLimits = (pool: SuggestedPoolWithDetails): PoolLimitCheck => {
    if (isPrivilegedUser) {
      return { withinLimits: true, violations: [] };
    }
    
    const violations: string[] = [];
    
    if (pool.total_matches > MEMBER_LIMITS.maxMatches) {
      violations.push(`${pool.total_matches} partidas (máximo ${MEMBER_LIMITS.maxMatches})`);
    }
    
    // Check rounds count as potential teams/groups indicator
    if (pool.total_rounds > MEMBER_LIMITS.maxGroups * 2) {
      violations.push(`Estrutura excede limite de grupos permitido`);
    }
    
    return {
      withinLimits: violations.length === 0,
      violations
    };
  };

  useEffect(() => {
    fetchSuggestedPools();
  }, []);

  const fetchSuggestedPools = async () => {
    try {
      // Fetch active suggested pools
      const { data: pools, error: poolsError } = await supabase
        .from('suggested_pools' as any)
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (poolsError) throw poolsError;

      if (!pools || pools.length === 0) {
        setSuggestedPools([]);
        setLoading(false);
        return;
      }

      const poolIds = pools.map((p: any) => p.id);

      // Fetch rounds for all pools
      const { data: rounds } = await supabase
        .from('suggested_pool_rounds' as any)
        .select('*')
        .in('suggested_pool_id', poolIds);

      // Fetch matches for all pools
      const { data: matches } = await supabase
        .from('suggested_pool_matches' as any)
        .select('*')
        .in('suggested_pool_id', poolIds);

      // Combine data
      const poolsWithDetails: SuggestedPoolWithDetails[] = pools.map((pool: any) => {
        const poolRounds = (rounds || []).filter((r: any) => r.suggested_pool_id === pool.id);
        const poolMatches = (matches || []).filter((m: any) => m.suggested_pool_id === pool.id);
        
        return {
          ...pool,
          rounds: poolRounds as unknown as SuggestedPoolRound[],
          matches: poolMatches as unknown as SuggestedPoolMatch[],
          total_matches: poolMatches.length
        };
      });

      setSuggestedPools(poolsWithDetails);
    } catch (error) {
      console.error('Error fetching suggested pools:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as sugestões.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openAdoptDialog = (pool: SuggestedPoolWithDetails) => {
    const { withinLimits } = checkPoolLimits(pool);
    
    if (!canCreateNewPool) {
      toast({
        title: 'Limite atingido',
        description: canCreateResult?.reason || 'Você não pode criar mais bolões',
        variant: 'destructive',
      });
      return;
    }
    
    if (!withinLimits) {
      toast({
        title: 'Excede seus limites',
        description: 'Este bolão excede os limites para membros comuns. Torne-se Mestre para adotá-lo.',
        variant: 'destructive',
      });
      return;
    }
    
    setSelectedPool(pool);
    setAdoptFormData({
      name: pool.name,
      description: pool.description || '',
      is_public: false
    });
    setAdoptDialogOpen(true);
  };

  const handleAdopt = async () => {
    if (!user || !selectedPool) return;

    setAdopting(true);

    try {
      // 1. Create the new pool
      const { data: newPool, error: poolError } = await supabase
        .from('pools')
        .insert({
          name: adoptFormData.name,
          description: adoptFormData.description || null,
          is_public: adoptFormData.is_public,
          is_active: true,
          created_by: user.id,
          total_rounds: selectedPool.total_rounds,
          matches_per_round: selectedPool.matches_per_round
        })
        .select()
        .single();

      if (poolError) throw poolError;

      // 2. Create rounds for the new pool
      const roundsToCreate = selectedPool.rounds.map(round => ({
        pool_id: newPool.id,
        round_number: round.round_number,
        name: round.name,
        match_limit: selectedPool.matches_per_round
      }));

      const { data: newRounds, error: roundsError } = await supabase
        .from('rounds')
        .insert(roundsToCreate)
        .select();

      if (roundsError) throw roundsError;

      // 3. Map old round IDs to new round IDs
      const roundIdMap: Record<string, string> = {};
      selectedPool.rounds.forEach((oldRound, index) => {
        if (newRounds && newRounds[index]) {
          roundIdMap[oldRound.id] = newRounds[index].id;
        }
      });

      // 4. Copy matches to the new pool
      if (selectedPool.matches.length > 0) {
        const matchesToCreate = selectedPool.matches.map(match => ({
          pool_id: newPool.id,
          round_id: roundIdMap[match.round_id],
          home_team: match.home_team,
          away_team: match.away_team,
          home_team_image: null,
          away_team_image: null,
          match_date: match.match_date,
          prediction_deadline: match.prediction_deadline,
          created_by: user.id
        }));

        const { error: matchesError } = await supabase
          .from('matches')
          .insert(matchesToCreate);

        if (matchesError) throw matchesError;
      }

      // 5. Register the instance in mestre_pool_instances
      // Note: Creator is NOT automatically added as participant
      // They can join manually if they wish to participate
      const { error: instanceError } = await supabase
        .from('mestre_pool_instances' as any)
        .insert({
          suggested_pool_id: selectedPool.id,
          pool_id: newPool.id,
          mestre_user_id: user.id,
          rounds_consumed: selectedPool.total_rounds,
          matches_per_round: selectedPool.matches_per_round
        });

      if (instanceError) {
        console.warn('Could not register instance:', instanceError);
      }

      toast({
        title: 'Bolão criado com sucesso!',
        description: `"${adoptFormData.name}" foi criado com ${selectedPool.total_rounds} rodadas e ${selectedPool.total_matches} jogos.`,
      });

      setAdoptDialogOpen(false);
      setSelectedPool(null);
      
      // Navigate to the new pool
      navigate(`/pools/${newPool.id}/manage`);
    } catch (error: any) {
      console.error('Error adopting pool:', error);
      toast({
        title: 'Erro ao criar bolão',
        description: error.message || 'Não foi possível adotar a sugestão.',
        variant: 'destructive',
      });
    } finally {
      setAdopting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (suggestedPools.length === 0) {
    return null; // Don't show section if no suggested pools
  }

  return (
    <>
      <Card className="border-2 border-accent/30 bg-gradient-to-br from-accent/5 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            Sugestões Zapions
          </CardTitle>
          <CardDescription>
            Adote uma sugestão pronta com todos os jogos já configurados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sugestões de bolões */}
          <div className="grid gap-4">
            {suggestedPools.map((pool) => {
              const { withinLimits, violations } = checkPoolLimits(pool);
              const canAdopt = canCreateNewPool && withinLimits;
              
              return (
                <Card 
                  key={pool.id}
                  className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                        <Sparkles className="h-5 w-5 text-accent" />
                      </div>
                      <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/30">
                        Pronto para usar
                      </Badge>
                    </div>
                    <CardTitle className="text-lg mt-3">{pool.name}</CardTitle>
                    {pool.description && (
                      <CardDescription className="line-clamp-2">
                        {pool.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{pool.total_rounds} rodadas</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Target className="h-4 w-4" />
                        <span>{pool.total_matches} jogos</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle className="h-3.5 w-3.5 text-success" />
                      <span>Jogos já configurados pelo admin</span>
                    </div>
                    
                    {/* Limit exceeded warning for common members */}
                    {!withinLimits && (
                      <Alert className="border-amber-500/50 bg-amber-500/10 py-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="ml-2 text-xs">
                          <p className="font-medium text-amber-700 dark:text-amber-400">
                            Excede seus limites:
                          </p>
                          <ul className="list-disc list-inside mt-1 text-amber-600 dark:text-amber-400/80">
                            {violations.map((v, i) => (
                              <li key={i}>{v}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Pool quota reached warning */}
                    {!canCreateNewPool && withinLimits && (
                      <Alert className="border-destructive/50 bg-destructive/10 py-2">
                        <Lock className="h-4 w-4 text-destructive" />
                        <AlertDescription className="ml-2 text-xs text-destructive">
                          {isMestreBolao 
                            ? 'Limite de bolões do seu plano atingido. Renove ou faça upgrade.' 
                            : 'Limite de bolões atingido. Torne-se Mestre para criar mais.'}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <Button 
                      className="w-full gap-2"
                      onClick={() => openAdoptDialog(pool)}
                      disabled={!canAdopt}
                      variant={canAdopt ? "default" : "outline"}
                    >
                      {!canCreateNewPool && isMestreBolao ? (
                        <>
                          <Lock className="h-4 w-4" />
                          Renove seu plano
                        </>
                      ) : !canCreateNewPool ? (
                        <>
                          <Crown className="h-4 w-4" />
                          Torne-se Mestre
                        </>
                      ) : !withinLimits ? (
                        <>
                          <Crown className="h-4 w-4" />
                          Requer plano Mestre
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Adotar Sugestão
                        </>
                      )}
                    </Button>

                    {/* Link to become Mestre when limits exceeded */}
                    {!canAdopt && (
                      <Button
                        variant="link"
                        size="sm"
                        className="w-full text-xs text-primary"
                        onClick={() => navigate('/mestre-do-bolao')}
                      >
                        <Crown className="h-3 w-3 mr-1" />
                        {!canCreateNewPool && isMestreBolao 
                          ? 'Renove ou faça upgrade do plano'
                          : 'Conheça os planos Mestre do Bolão'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          {/* Card explicativo - abaixo das sugestões */}
          <div className="p-4 rounded-lg bg-gradient-to-br from-accent/10 to-background border border-accent/20 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <HelpCircle className="h-4 w-4 text-accent" />
              <span className="text-sm font-semibold">O que é Sugestão Zapions?</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Seu bolão <strong className="text-foreground">configurado, pronto e atualizado automaticamente!</strong>
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <h4 className="text-xs font-semibold flex items-center gap-1.5">
                  <Settings className="h-3.5 w-3.5 text-primary" />
                  O que você gerencia:
                </h4>
                <ul className="space-y-0.5 text-xs text-muted-foreground">
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-primary shrink-0" />
                    Participantes, Aprovações, Premiações
                  </li>
                </ul>
              </div>
              
              <div className="space-y-1">
                <h4 className="text-xs font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  O que já vem pronto:
                </h4>
                <ul className="space-y-0.5 text-xs text-muted-foreground">
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-success shrink-0" />
                    Jogos, Placares, Pontos, Ranking
                  </li>
                </ul>
              </div>
            </div>
            
            {/* Banner informativo para membros comuns */}
            {!isPrivilegedUser && (
              <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50">
                Você pode adotar sugestões com até {MEMBER_LIMITS.maxTeams} equipes, {MEMBER_LIMITS.maxGroups} grupos e {MEMBER_LIMITS.maxMatches} partidas.{' '}
                <button onClick={() => navigate('/mestre-do-bolao')} className="font-semibold text-primary underline underline-offset-2 hover:text-primary/80">
                  Torne-se Mestre para sugestões maiores!
                </button>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Adopt Dialog */}
      <Dialog open={adoptDialogOpen} onOpenChange={setAdoptDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-accent" />
              Criar Bolão a partir da Sugestão
            </DialogTitle>
            <DialogDescription>
              Personalize o nome e descrição do seu bolão. Os jogos serão copiados automaticamente.
            </DialogDescription>
          </DialogHeader>
          
          {selectedPool && (
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Rodadas:</span>
                  <span className="font-medium">{selectedPool.total_rounds}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Jogos por rodada:</span>
                  <span className="font-medium">{selectedPool.matches_per_round}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total de jogos:</span>
                  <span className="font-medium text-accent">{selectedPool.total_matches}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="adopt-name">Nome do Bolão</Label>
                <Input
                  id="adopt-name"
                  value={adoptFormData.name}
                  onChange={(e) => setAdoptFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Bolão da Galera"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="adopt-description">Descrição (opcional)</Label>
                <Textarea
                  id="adopt-description"
                  value={adoptFormData.description}
                  onChange={(e) => setAdoptFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva seu bolão..."
                  rows={3}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="adopt-public">Bolão Público</Label>
                  <p className="text-xs text-muted-foreground">
                    Qualquer pessoa pode ver e pedir para participar
                  </p>
                </div>
                <Switch
                  id="adopt-public"
                  checked={adoptFormData.is_public}
                  onCheckedChange={(checked) => setAdoptFormData(prev => ({ ...prev, is_public: checked }))}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdoptDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAdopt} 
              disabled={adopting || !adoptFormData.name.trim()}
              className="gap-2"
            >
              {adopting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trophy className="h-4 w-4" />
              )}
              Criar Meu Bolão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
