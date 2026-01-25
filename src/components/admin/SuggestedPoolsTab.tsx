import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { formatDateBR } from '@/lib/date-utils';
import { CupFormatStep, CupFormatConfig } from '@/components/pools/CupFormatStep';
import { KnockoutOnlyStep, KnockoutOnlyConfig } from '@/components/pools/KnockoutOnlyStep';
import { 
  Sparkles, 
  Plus, 
  Pencil, 
  Trash2, 
  Users, 
  Calendar,
  Loader2,
  Eye,
  EyeOff,
  Settings,
  UserPlus,
  ListChecks,
  Trophy,
  Layers,
  Award,
  Swords,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import type { SuggestedPool, SuggestedPoolModerator } from '@/types/suggested-pools';
import { SuggestedPoolMatchesScreen } from './SuggestedPoolMatchesScreen';
import { SuggestedPoolScoresScreen } from './SuggestedPoolScoresScreen';

interface SuggestedPoolWithModerators extends SuggestedPool {
  moderators: (SuggestedPoolModerator & { profile?: { public_id: string; full_name: string | null } })[];
  rounds_count?: number;
}

type PoolFormat = 'standard' | 'cup' | 'knockout';

export function SuggestedPoolsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [suggestedPools, setSuggestedPools] = useState<SuggestedPoolWithModerators[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [moderatorDialogOpen, setModeratorDialogOpen] = useState(false);
  const [selectedPool, setSelectedPool] = useState<SuggestedPoolWithModerators | null>(null);
  const [manageMatchesPool, setManageMatchesPool] = useState<SuggestedPoolWithModerators | null>(null);
  const [manageScoresPool, setManageScoresPool] = useState<SuggestedPoolWithModerators | null>(null);
  
  // Wizard states
  const [wizardStep, setWizardStep] = useState(1);
  const [format, setFormat] = useState<PoolFormat>('standard');
  
  // Form states
  const [formData, setFormData] = useState({
    name: 'Sugestão Zapions',
    description: '',
    total_rounds: 1,
    matches_per_round: 15,
    is_active: true
  });
  
  // Cup format config
  const [cupConfig, setCupConfig] = useState<CupFormatConfig>({
    totalTeams: 32,
    totalGroups: 8,
    classifiedPerGroup: 2,
    groupPhaseFormat: 'single',
    knockoutFormat: 'home_away',
    finalFormat: 'single',
    hasThirdPlace: false,
    awayGoalsRule: false,
    enableBestThirdPlace: false,
    bestThirdPlaceCount: 4,
    knockoutDrawMethod: 'automatic',
  });
  
  // Knockout only config
  const [knockoutConfig, setKnockoutConfig] = useState<KnockoutOnlyConfig>({
    totalTeams: 16,
    knockoutFormat: 'single',
    finalFormat: 'single',
    hasThirdPlace: false,
    awayGoalsRule: false,
  });
  
  const [moderatorUsername, setModeratorUsername] = useState('');

  useEffect(() => {
    fetchSuggestedPools();
  }, []);

  const fetchSuggestedPools = async () => {
    try {
      // Fetch suggested pools - using raw query since types aren't in supabase yet
      const { data: pools, error } = await supabase
        .from('suggested_pools' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!pools || pools.length === 0) {
        setSuggestedPools([]);
        setLoading(false);
        return;
      }

      // Fetch moderators for each pool
      const poolIds = pools.map((p: any) => p.id);
      const { data: moderators } = await supabase
        .from('suggested_pool_moderators' as any)
        .select('*')
        .in('suggested_pool_id', poolIds);

      // Fetch moderator profiles
      const moderatorUserIds = [...new Set((moderators || []).map((m: any) => m.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, public_id, full_name')
        .in('id', moderatorUserIds);

      // Fetch rounds count for each pool
      const { data: rounds } = await supabase
        .from('suggested_pool_rounds' as any)
        .select('suggested_pool_id')
        .in('suggested_pool_id', poolIds);

      // Combine data
      const poolsWithModerators: SuggestedPoolWithModerators[] = pools.map((pool: any) => ({
        ...pool,
        moderators: (moderators || [])
          .filter((m: any) => m.suggested_pool_id === pool.id)
          .map((m: any) => ({
            ...m,
            profile: profiles?.find(p => p.id === m.user_id)
          })),
        rounds_count: (rounds || []).filter((r: any) => r.suggested_pool_id === pool.id).length
      }));

      setSuggestedPools(poolsWithModerators);
    } catch (error) {
      console.error('Error fetching suggested pools:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os bolões sugeridos.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate cup rounds for suggested pools
  const generateSuggestedCupRounds = (poolId: string) => {
    const rounds: Array<{
      suggested_pool_id: string;
      round_number: number;
      name: string;
    }> = [];
    
    let roundNumber = 1;
    const teamsPerGroup = cupConfig.totalTeams / cupConfig.totalGroups;
    const matchesPerGroupPhase = cupConfig.groupPhaseFormat === 'home_away' 
      ? (teamsPerGroup - 1) * teamsPerGroup 
      : (teamsPerGroup - 1) * teamsPerGroup / 2;
    
    // Group phase rounds
    for (let g = 0; g < cupConfig.totalGroups; g++) {
      const groupLetter = String.fromCharCode(65 + g);
      rounds.push({
        suggested_pool_id: poolId,
        round_number: roundNumber++,
        name: `Grupo ${groupLetter}`,
      });
    }

    const teamsFromGroups = cupConfig.totalGroups * cupConfig.classifiedPerGroup;
    const teamsFromBestThird = cupConfig.enableBestThirdPlace ? cupConfig.bestThirdPlaceCount : 0;
    const teamsInKnockout = teamsFromGroups + teamsFromBestThird;

    // Round of 32 (16 avos)
    if (teamsInKnockout >= 32) {
      if (cupConfig.knockoutFormat === 'home_away') {
        rounds.push({
          suggested_pool_id: poolId,
          round_number: roundNumber++,
          name: '16 avos - Ida',
        });
        rounds.push({
          suggested_pool_id: poolId,
          round_number: roundNumber++,
          name: '16 avos - Volta',
        });
      } else {
        rounds.push({
          suggested_pool_id: poolId,
          round_number: roundNumber++,
          name: '16 avos de Final',
        });
      }
    }

    // Round of 16
    if (teamsInKnockout >= 16) {
      if (cupConfig.knockoutFormat === 'home_away') {
        rounds.push({
          suggested_pool_id: poolId,
          round_number: roundNumber++,
          name: 'Oitavas - Ida',
        });
        rounds.push({
          suggested_pool_id: poolId,
          round_number: roundNumber++,
          name: 'Oitavas - Volta',
        });
      } else {
        rounds.push({
          suggested_pool_id: poolId,
          round_number: roundNumber++,
          name: 'Oitavas de Final',
        });
      }
    }

    // Quarter Finals
    if (teamsInKnockout >= 8) {
      if (cupConfig.knockoutFormat === 'home_away') {
        rounds.push({
          suggested_pool_id: poolId,
          round_number: roundNumber++,
          name: 'Quartas - Ida',
        });
        rounds.push({
          suggested_pool_id: poolId,
          round_number: roundNumber++,
          name: 'Quartas - Volta',
        });
      } else {
        rounds.push({
          suggested_pool_id: poolId,
          round_number: roundNumber++,
          name: 'Quartas de Final',
        });
      }
    }

    // Semi Finals
    if (teamsInKnockout >= 4) {
      if (cupConfig.knockoutFormat === 'home_away') {
        rounds.push({
          suggested_pool_id: poolId,
          round_number: roundNumber++,
          name: 'Semifinal - Ida',
        });
        rounds.push({
          suggested_pool_id: poolId,
          round_number: roundNumber++,
          name: 'Semifinal - Volta',
        });
      } else {
        rounds.push({
          suggested_pool_id: poolId,
          round_number: roundNumber++,
          name: 'Semifinal',
        });
      }
    }

    // Third place
    if (cupConfig.hasThirdPlace) {
      rounds.push({
        suggested_pool_id: poolId,
        round_number: roundNumber++,
        name: 'Disputa 3º Lugar',
      });
    }

    // Final
    if (cupConfig.finalFormat === 'home_away') {
      rounds.push({
        suggested_pool_id: poolId,
        round_number: roundNumber++,
        name: 'Final - Jogo de Ida',
      });
      rounds.push({
        suggested_pool_id: poolId,
        round_number: roundNumber++,
        name: 'Final - Jogo de Volta',
      });
    } else {
      rounds.push({
        suggested_pool_id: poolId,
        round_number: roundNumber++,
        name: '🏆 FINAL',
      });
    }

    return rounds;
  };

  // Generate knockout-only rounds for suggested pools
  const generateSuggestedKnockoutRounds = (poolId: string) => {
    const rounds: Array<{
      suggested_pool_id: string;
      round_number: number;
      name: string;
    }> = [];
    
    let roundNumber = 1;
    const isHomeAway = knockoutConfig.knockoutFormat === 'home_away';
    
    // Round of 64 (32 avos)
    if (knockoutConfig.totalTeams >= 64) {
      if (isHomeAway) {
        rounds.push({ suggested_pool_id: poolId, round_number: roundNumber++, name: '32 avos - Ida' });
        rounds.push({ suggested_pool_id: poolId, round_number: roundNumber++, name: '32 avos - Volta' });
      } else {
        rounds.push({ suggested_pool_id: poolId, round_number: roundNumber++, name: '32 avos de Final' });
      }
    }
    
    // Round of 32 (16 avos)
    if (knockoutConfig.totalTeams >= 32) {
      if (isHomeAway) {
        rounds.push({ suggested_pool_id: poolId, round_number: roundNumber++, name: '16 avos - Ida' });
        rounds.push({ suggested_pool_id: poolId, round_number: roundNumber++, name: '16 avos - Volta' });
      } else {
        rounds.push({ suggested_pool_id: poolId, round_number: roundNumber++, name: '16 avos de Final' });
      }
    }
    
    // Round of 16 (Oitavas)
    if (knockoutConfig.totalTeams >= 16) {
      if (isHomeAway) {
        rounds.push({ suggested_pool_id: poolId, round_number: roundNumber++, name: 'Oitavas - Ida' });
        rounds.push({ suggested_pool_id: poolId, round_number: roundNumber++, name: 'Oitavas - Volta' });
      } else {
        rounds.push({ suggested_pool_id: poolId, round_number: roundNumber++, name: 'Oitavas de Final' });
      }
    }
    
    // Quarter Finals (Quartas)
    if (knockoutConfig.totalTeams >= 8) {
      if (isHomeAway) {
        rounds.push({ suggested_pool_id: poolId, round_number: roundNumber++, name: 'Quartas - Ida' });
        rounds.push({ suggested_pool_id: poolId, round_number: roundNumber++, name: 'Quartas - Volta' });
      } else {
        rounds.push({ suggested_pool_id: poolId, round_number: roundNumber++, name: 'Quartas de Final' });
      }
    }
    
    // Semi Finals
    if (knockoutConfig.totalTeams >= 4) {
      if (isHomeAway) {
        rounds.push({ suggested_pool_id: poolId, round_number: roundNumber++, name: 'Semifinal - Ida' });
        rounds.push({ suggested_pool_id: poolId, round_number: roundNumber++, name: 'Semifinal - Volta' });
      } else {
        rounds.push({ suggested_pool_id: poolId, round_number: roundNumber++, name: 'Semifinal' });
      }
    }
    
    // Third place match
    if (knockoutConfig.hasThirdPlace) {
      rounds.push({ suggested_pool_id: poolId, round_number: roundNumber++, name: 'Disputa 3º Lugar' });
    }
    
    // Final
    if (knockoutConfig.finalFormat === 'home_away') {
      rounds.push({ suggested_pool_id: poolId, round_number: roundNumber++, name: 'Final - Jogo de Ida' });
      rounds.push({ suggested_pool_id: poolId, round_number: roundNumber++, name: 'Final - Jogo de Volta' });
    } else {
      rounds.push({ suggested_pool_id: poolId, round_number: roundNumber++, name: '🏆 FINAL' });
    }
    
    return rounds;
  };

  const handleCreate = async () => {
    if (!user) return;
    
    setActionLoading('create');
    try {
      let calculatedTotalRounds = formData.total_rounds;
      let calculatedMatchesPerRound = formData.matches_per_round;
      
      if (format === 'cup') {
        // Calculate total rounds for cup format
        const teamsFromGroups = cupConfig.totalGroups * cupConfig.classifiedPerGroup;
        const teamsFromBestThird = cupConfig.enableBestThirdPlace ? cupConfig.bestThirdPlaceCount : 0;
        const teamsInKnockout = teamsFromGroups + teamsFromBestThird;
        calculatedTotalRounds = cupConfig.totalGroups; // Groups
        if (teamsInKnockout >= 16) calculatedTotalRounds += (cupConfig.knockoutFormat === 'home_away' ? 2 : 1);
        if (teamsInKnockout >= 8) calculatedTotalRounds += (cupConfig.knockoutFormat === 'home_away' ? 2 : 1);
        if (teamsInKnockout >= 4) calculatedTotalRounds += (cupConfig.knockoutFormat === 'home_away' ? 2 : 1);
        if (cupConfig.hasThirdPlace) calculatedTotalRounds += 1;
        calculatedTotalRounds += (cupConfig.finalFormat === 'home_away' ? 2 : 1);
        
        // Calculate matches per round based on teams per group
        const teamsPerGroup = cupConfig.totalTeams / cupConfig.totalGroups;
        calculatedMatchesPerRound = Math.ceil((teamsPerGroup - 1) * teamsPerGroup / 2);
      } else if (format === 'knockout') {
        // Calculate total rounds for knockout format
        const isHomeAway = knockoutConfig.knockoutFormat === 'home_away';
        calculatedTotalRounds = 0;
        if (knockoutConfig.totalTeams >= 64) calculatedTotalRounds += (isHomeAway ? 2 : 1);
        if (knockoutConfig.totalTeams >= 32) calculatedTotalRounds += (isHomeAway ? 2 : 1);
        if (knockoutConfig.totalTeams >= 16) calculatedTotalRounds += (isHomeAway ? 2 : 1);
        if (knockoutConfig.totalTeams >= 8) calculatedTotalRounds += (isHomeAway ? 2 : 1);
        if (knockoutConfig.totalTeams >= 4) calculatedTotalRounds += (isHomeAway ? 2 : 1);
        if (knockoutConfig.hasThirdPlace) calculatedTotalRounds += 1;
        calculatedTotalRounds += (knockoutConfig.finalFormat === 'home_away' ? 2 : 1);
        
        // First round matches (half of total teams)
        calculatedMatchesPerRound = knockoutConfig.totalTeams / 2;
      }

      // Create the suggested pool
      const { data: pool, error: poolError } = await supabase
        .from('suggested_pools' as any)
        .insert({
          name: formData.name,
          description: formData.description || null,
          total_rounds: calculatedTotalRounds,
          matches_per_round: calculatedMatchesPerRound,
          is_active: formData.is_active,
          created_by: user.id
        })
        .select()
        .single();

      if (poolError) throw poolError;

      const poolId = (pool as any).id;

      let roundsToCreate;
      if (format === 'standard') {
        roundsToCreate = Array.from({ length: formData.total_rounds }, (_, i) => ({
          suggested_pool_id: poolId,
          round_number: i + 1,
          name: `Rodada ${i + 1}`
        }));
      } else if (format === 'cup') {
        roundsToCreate = generateSuggestedCupRounds(poolId);
      } else {
        roundsToCreate = generateSuggestedKnockoutRounds(poolId);
      }

      const { error: roundsError } = await supabase
        .from('suggested_pool_rounds' as any)
        .insert(roundsToCreate);

      if (roundsError) throw roundsError;

      const successMessage = format === 'standard'
        ? `"${formData.name}" foi criado com ${formData.total_rounds} rodadas.`
        : format === 'cup'
          ? `"${formData.name}" foi criado no formato Copa com ${roundsToCreate.length} fases!`
          : `"${formData.name}" foi criado no formato Mata-Mata com ${roundsToCreate.length} fases!`;

      toast({
        title: 'Bolão sugerido criado!',
        description: successMessage,
      });

      setCreateDialogOpen(false);
      resetForm();
      await fetchSuggestedPools();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar o bolão sugerido.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdate = async () => {
    if (!selectedPool) return;
    
    setActionLoading('update');
    try {
      const { error } = await supabase
        .from('suggested_pools' as any)
        .update({
          name: formData.name,
          description: formData.description || null,
          total_rounds: formData.total_rounds,
          matches_per_round: formData.matches_per_round,
          is_active: formData.is_active
        })
        .eq('id', selectedPool.id);

      if (error) throw error;

      toast({
        title: 'Bolão atualizado!',
        description: 'As alterações foram salvas.',
      });

      setEditDialogOpen(false);
      setSelectedPool(null);
      resetForm();
      await fetchSuggestedPools();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (poolId: string) => {
    setActionLoading(`delete-${poolId}`);
    try {
      const { error } = await supabase
        .from('suggested_pools' as any)
        .delete()
        .eq('id', poolId);

      if (error) throw error;

      toast({
        title: 'Bolão excluído!',
        description: 'O bolão sugerido foi excluído.',
      });

      await fetchSuggestedPools();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível excluir.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (pool: SuggestedPoolWithModerators) => {
    setActionLoading(`toggle-${pool.id}`);
    try {
      const { error } = await supabase
        .from('suggested_pools' as any)
        .update({ is_active: !pool.is_active })
        .eq('id', pool.id);

      if (error) throw error;

      toast({
        title: pool.is_active ? 'Bolão desativado' : 'Bolão ativado',
        description: pool.is_active 
          ? 'O bolão não será mais exibido para os Mestres.'
          : 'O bolão agora está disponível para os Mestres.',
      });

      await fetchSuggestedPools();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível alterar o status.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddModerator = async () => {
    if (!selectedPool || !moderatorUsername.trim()) return;

    setActionLoading('add-moderator');
    try {
      // Find user by public_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('public_id', moderatorUsername.trim().replace('@', ''))
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) {
        toast({
          title: 'Usuário não encontrado',
          description: `Não foi possível encontrar o usuário @${moderatorUsername}.`,
          variant: 'destructive',
        });
        return;
      }

      // Check if already a moderator
      const existingMod = selectedPool.moderators.find(m => m.user_id === profile.id);
      if (existingMod) {
        toast({
          title: 'Já é moderador',
          description: 'Este usuário já é moderador deste bolão.',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('suggested_pool_moderators' as any)
        .insert({
          suggested_pool_id: selectedPool.id,
          user_id: profile.id,
          created_by: user?.id
        });

      if (error) throw error;

      toast({
        title: 'Moderador adicionado!',
        description: `@${moderatorUsername} agora pode gerenciar os jogos deste bolão.`,
      });

      setModeratorUsername('');
      await fetchSuggestedPools();
      
      // Update selected pool with new data
      const updatedPool = suggestedPools.find(p => p.id === selectedPool.id);
      if (updatedPool) setSelectedPool(updatedPool);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível adicionar o moderador.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveModerator = async (moderatorId: string) => {
    setActionLoading(`remove-mod-${moderatorId}`);
    try {
      const { error } = await supabase
        .from('suggested_pool_moderators' as any)
        .delete()
        .eq('id', moderatorId);

      if (error) throw error;

      toast({
        title: 'Moderador removido',
        description: 'O moderador foi removido do bolão.',
      });

      await fetchSuggestedPools();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível remover o moderador.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const openEditDialog = (pool: SuggestedPoolWithModerators) => {
    setSelectedPool(pool);
    setFormData({
      name: pool.name,
      description: pool.description || '',
      total_rounds: pool.total_rounds,
      matches_per_round: pool.matches_per_round,
      is_active: pool.is_active
    });
    setEditDialogOpen(true);
  };

  const openModeratorDialog = (pool: SuggestedPoolWithModerators) => {
    setSelectedPool(pool);
    setModeratorDialogOpen(true);
  };

  const resetForm = () => {
    setWizardStep(1);
    setFormat('standard');
    setFormData({
      name: 'Sugestão Zapions',
      description: '',
      total_rounds: 1,
      matches_per_round: 15,
      is_active: true
    });
    setCupConfig({
      totalTeams: 32,
      totalGroups: 8,
      classifiedPerGroup: 2,
      groupPhaseFormat: 'single',
      knockoutFormat: 'home_away',
      finalFormat: 'single',
      hasThirdPlace: false,
      awayGoalsRule: false,
      enableBestThirdPlace: false,
      bestThirdPlaceCount: 4,
      knockoutDrawMethod: 'automatic',
    });
    setKnockoutConfig({
      totalTeams: 16,
      knockoutFormat: 'single',
      finalFormat: 'single',
      hasThirdPlace: false,
      awayGoalsRule: false,
    });
  };
  
  const canProceedStep1 = formData.name.trim().length >= 3;
  const canProceedStep2 = format === 'standard' || format === 'cup' || format === 'knockout';
  const canProceedStep3 = format === 'standard' 
    ? (formData.total_rounds >= 1 && formData.matches_per_round >= 1)
    : format === 'cup'
      ? (cupConfig.totalTeams >= 4 && cupConfig.totalGroups >= 1 && cupConfig.classifiedPerGroup >= 1)
      : (knockoutConfig.totalTeams >= 4);
    
  const totalSteps = 3;
  const wizardProgress = (wizardStep / totalSteps) * 100;
  
  const handleWizardNext = () => {
    if (wizardStep === 1 && canProceedStep1) {
      setWizardStep(2);
    } else if (wizardStep === 2 && canProceedStep2) {
      setWizardStep(3);
    }
  };

  const handleWizardBack = () => {
    if (wizardStep > 1) {
      setWizardStep(wizardStep - 1);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If managing matches for a pool, show the matches screen
  if (manageMatchesPool) {
    return (
      <SuggestedPoolMatchesScreen
        pool={manageMatchesPool}
        onBack={() => {
          setManageMatchesPool(null);
          fetchSuggestedPools();
        }}
      />
    );
  }

  // If managing scores for a pool, show the scores screen
  if (manageScoresPool) {
    return (
      <SuggestedPoolScoresScreen
        pool={manageScoresPool}
        onBack={() => {
          setManageScoresPool(null);
          fetchSuggestedPools();
        }}
      />
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            Sugestão Zapions
          </CardTitle>
          <CardDescription>
            Crie templates de bolões que os Mestres podem adotar
          </CardDescription>
        </div>
        
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Criar para todos
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                Criar Sugestão de Bolão
              </DialogTitle>
              <DialogDescription>
                {wizardStep === 1 && 'Passo 1 de 3: Informações básicas'}
                {wizardStep === 2 && 'Passo 2 de 3: Escolha o formato'}
                {wizardStep === 3 && format === 'standard' && 'Passo 3 de 3: Estrutura de rodadas'}
                {wizardStep === 3 && format === 'cup' && 'Passo 3 de 3: Configure as fases do campeonato'}
                {wizardStep === 3 && format === 'knockout' && 'Passo 3 de 3: Configure o mata-mata'}
              </DialogDescription>
            </DialogHeader>
            
            {/* Progress Bar */}
            <div className="space-y-1">
              <Progress value={wizardProgress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Passo {wizardStep} de {totalSteps}</span>
                <span>{Math.round(wizardProgress)}%</span>
              </div>
            </div>
            
            {/* Step 1: Basic Info */}
            {wizardStep === 1 && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Sugestão Zapions"
                    maxLength={100}
                  />
                  {formData.name.length > 0 && formData.name.length < 3 && (
                    <p className="text-xs text-destructive">Mínimo de 3 caracteres</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descreva o bolão..."
                    rows={3}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <Label htmlFor="is_active" className="font-medium">Ativo para Mestres</Label>
                    <p className="text-xs text-muted-foreground">
                      Mestres poderão adotar esta sugestão
                    </p>
                  </div>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                </div>
              </div>
            )}
            
            {/* Step 2: Format Selection */}
            {wizardStep === 2 && (
              <div className="space-y-6 py-4">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Escolha o Formato do Bolão</h3>
                  <p className="text-sm text-muted-foreground">
                    Selecione o tipo de competição
                  </p>
                </div>

                <RadioGroup
                  value={format}
                  onValueChange={(value: PoolFormat) => setFormat(value)}
                  className="grid gap-4 md:grid-cols-3"
                >
                  <div>
                    <RadioGroupItem value="standard" id="format-standard" className="peer sr-only" />
                    <Label
                      htmlFor="format-standard"
                      className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                    >
                      <Layers className="h-8 w-8 mb-2 text-primary" />
                      <div className="text-center">
                        <div className="font-semibold">Formato Padrão</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Rodadas tradicionais
                        </p>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Brasileirão, Premier League
                      </div>
                    </Label>
                  </div>

                  <div>
                    <RadioGroupItem value="cup" id="format-cup" className="peer sr-only" />
                    <Label
                      htmlFor="format-cup"
                      className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                    >
                      <Award className="h-8 w-8 mb-2 text-yellow-500" />
                      <div className="text-center">
                        <div className="font-semibold">Formato Copa</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Grupos + Mata-Mata
                        </p>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Copa do Mundo, Champions
                      </div>
                    </Label>
                  </div>

                  <div>
                    <RadioGroupItem value="knockout" id="format-knockout" className="peer sr-only" />
                    <Label
                      htmlFor="format-knockout"
                      className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                    >
                      <Swords className="h-8 w-8 mb-2 text-destructive" />
                      <div className="text-center">
                        <div className="font-semibold">Somente Mata-Mata</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Eliminatórias diretas
                        </p>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Copa do Brasil, FA Cup
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}
            
            {/* Step 3: Structure */}
            {wizardStep === 3 && format === 'standard' && (
              <div className="space-y-4 py-4">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Estrutura de Rodadas</h3>
                  <p className="text-sm text-muted-foreground">
                    Defina o número de rodadas e jogos
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="total_rounds">Total de Rodadas</Label>
                    <Input
                      id="total_rounds"
                      type="number"
                      min={1}
                      max={50}
                      value={formData.total_rounds}
                      onChange={(e) => setFormData(prev => ({ ...prev, total_rounds: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="matches_per_round">Jogos por Rodada</Label>
                    <Input
                      id="matches_per_round"
                      type="number"
                      min={1}
                      max={50}
                      value={formData.matches_per_round}
                      onChange={(e) => setFormData(prev => ({ ...prev, matches_per_round: parseInt(e.target.value) || 15 }))}
                    />
                  </div>
                </div>
                
                {/* Preview */}
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="text-sm text-center">
                      <p className="font-medium">Estrutura do Bolão</p>
                      <p className="text-muted-foreground">
                        {formData.total_rounds} rodadas × {formData.matches_per_round} jogos = {' '}
                        <span className="font-semibold text-primary">
                          {formData.total_rounds * formData.matches_per_round} jogos no total
                        </span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Step 3: Cup Format */}
            {wizardStep === 3 && format === 'cup' && (
              <div className="py-4">
                <CupFormatStep config={cupConfig} onChange={setCupConfig} />
              </div>
            )}
            
            {/* Step 3: Knockout Only Format */}
            {wizardStep === 3 && format === 'knockout' && (
              <div className="py-4">
                <KnockoutOnlyStep config={knockoutConfig} onChange={setKnockoutConfig} />
              </div>
            )}
            
            <DialogFooter className="flex gap-2">
              {wizardStep > 1 && (
                <Button variant="outline" onClick={handleWizardBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
              )}
              
              <Button variant="outline" onClick={() => { setCreateDialogOpen(false); resetForm(); }}>
                Cancelar
              </Button>
              
              {wizardStep < 3 ? (
                <Button 
                  onClick={handleWizardNext}
                  disabled={
                    (wizardStep === 1 && !canProceedStep1) ||
                    (wizardStep === 2 && !canProceedStep2)
                  }
                >
                  Próximo
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={handleCreate} 
                  disabled={actionLoading === 'create' || !canProceedStep3}
                >
                  {actionLoading === 'create' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Criar Sugestão
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {suggestedPools.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum bolão sugerido criado ainda.</p>
            <p className="text-sm mt-1">Clique em "Nova Sugestão" para criar o primeiro.</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bolão</TableHead>
                  <TableHead>Estrutura</TableHead>
                  <TableHead>Moderadores</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suggestedPools.map((pool) => (
                  <TableRow key={pool.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{pool.name}</p>
                        {pool.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {pool.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {/* Detect cup format by checking rounds_count vs total_rounds or name patterns */}
                      {(() => {
                        // A simple heuristic: if pool has rounds like "Grupo A", it's cup format
                        // For now we'll show the structure info
                        const isCupFormat = pool.rounds_count !== pool.total_rounds || 
                          (pool.rounds_count && pool.rounds_count > 10);
                        
                        return (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {pool.rounds_count && pool.rounds_count > 8 ? (
                                <Badge variant="outline" className="gap-1 text-xs">
                                  <Award className="h-3 w-3 text-yellow-500" />
                                  Copa
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="gap-1 text-xs">
                                  <Layers className="h-3 w-3 text-primary" />
                                  Padrão
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {pool.rounds_count || pool.total_rounds} rodadas
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{pool.moderators.length}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openModeratorDialog(pool)}
                          className="h-7 px-2"
                        >
                          <Settings className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={pool.is_active ? 'default' : 'secondary'}
                        className={pool.is_active ? 'bg-success' : ''}
                      >
                        {pool.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDateBR(pool.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(pool)}
                          disabled={actionLoading === `toggle-${pool.id}`}
                          title={pool.is_active ? 'Desativar' : 'Ativar'}
                        >
                          {actionLoading === `toggle-${pool.id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : pool.is_active ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setManageMatchesPool(pool)}
                          title="Gerenciar Jogos"
                        >
                          <ListChecks className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setManageScoresPool(pool)}
                          title="Lançar Placares"
                        >
                          <Trophy className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(pool)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={actionLoading === `delete-${pool.id}`}
                              className="text-destructive hover:text-destructive"
                              title="Excluir"
                            >
                              {actionLoading === `delete-${pool.id}` ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir Sugestão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir "{pool.name}"? 
                                Bolões já criados pelos Mestres não serão afetados.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(pool.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Sugestão</DialogTitle>
            <DialogDescription>
              Altere as configurações do bolão sugerido
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-rounds">Rodadas</Label>
                <Input
                  id="edit-rounds"
                  type="number"
                  min={1}
                  max={50}
                  value={formData.total_rounds}
                  onChange={(e) => setFormData(prev => ({ ...prev, total_rounds: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-matches">Jogos/Rodada</Label>
                <Input
                  id="edit-matches"
                  type="number"
                  min={1}
                  max={50}
                  value={formData.matches_per_round}
                  onChange={(e) => setFormData(prev => ({ ...prev, matches_per_round: parseInt(e.target.value) || 15 }))}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-active">Ativo para Mestres</Label>
              <Switch
                id="edit-active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdate} 
              disabled={actionLoading === 'update' || !formData.name.trim()}
            >
              {actionLoading === 'update' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Moderators Dialog */}
      <Dialog open={moderatorDialogOpen} onOpenChange={setModeratorDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Moderadores do Bolão</DialogTitle>
            <DialogDescription>
              Moderadores podem adicionar e editar jogos
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input
                placeholder="@username"
                value={moderatorUsername}
                onChange={(e) => setModeratorUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddModerator()}
              />
              <Button 
                onClick={handleAddModerator}
                disabled={actionLoading === 'add-moderator' || !moderatorUsername.trim()}
              >
                {actionLoading === 'add-moderator' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {selectedPool?.moderators && selectedPool.moderators.length > 0 ? (
              <div className="space-y-2">
                {selectedPool.moderators.map((mod) => (
                  <div 
                    key={mod.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">@{mod.profile?.public_id}</p>
                      {mod.profile?.full_name && (
                        <p className="text-sm text-muted-foreground">{mod.profile.full_name}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveModerator(mod.id)}
                      disabled={actionLoading === `remove-mod-${mod.id}`}
                      className="text-destructive hover:text-destructive"
                    >
                      {actionLoading === `remove-mod-${mod.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                Nenhum moderador adicionado ainda.
              </p>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setModeratorDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
