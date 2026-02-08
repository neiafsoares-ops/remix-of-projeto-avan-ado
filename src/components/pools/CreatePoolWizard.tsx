import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PoolStructureStep } from './PoolStructureStep';
import { CupFormatStep, CupFormatConfig } from './CupFormatStep';
import { KnockoutOnlyStep, KnockoutOnlyConfig } from './KnockoutOnlyStep';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Loader2, Trophy, Layers, Award, AlertTriangle, Crown, Lock, Swords, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';
import { useMestreSubscription } from '@/hooks/use-mestre-subscription';
import { Badge } from '@/components/ui/badge';

// Limites para membros comuns
const MEMBER_LIMITS = {
  maxTeams: 8,
  maxGroups: 2,
  maxMatches: 15,
};

interface CreatePoolWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  userId: string;
}

type PoolFormat = 'standard' | 'cup' | 'knockout';

export function CreatePoolWizard({ open, onOpenChange, onSuccess, userId }: CreatePoolWizardProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  
  // Use the mestre subscription hook
  const { 
    canCreateResult, 
    subscription, 
    loading: loadingSubscription,
    isAdmin,
    isMestreBolao,
    refetch: refetchSubscription 
  } = useMestreSubscription(userId);

  // Check if user has privileged role (admin or mestre_bolao)
  const isPrivilegedUser = isAdmin || isMestreBolao;
  
  // Check if user can create more pools based on their subscription
  const canCreateNewPool = canCreateResult?.canCreate ?? false;

  // Fetch user roles on mount
  useEffect(() => {
    const fetchUserRoles = async () => {
      if (!userId) {
        setLoadingRoles(false);
        return;
      }
      
      try {
        const { data: roles, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);
        
        if (error) throw error;
        
        setUserRoles(roles?.map(r => r.role) || []);
      } catch (error) {
        console.error('Error fetching user roles:', error);
      } finally {
        setLoadingRoles(false);
      }
    };

    if (open) {
      fetchUserRoles();
      refetchSubscription();
    }
  }, [userId, open, refetchSubscription]);

  // Step 1 - Basic Info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState('');
  const [entryFee, setEntryFee] = useState('0');
  const [initialPrize, setInitialPrize] = useState('0');
  const [adminFeePercent, setAdminFeePercent] = useState(20);
  const [maxParticipants, setMaxParticipants] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [allowMultipleTickets, setAllowMultipleTickets] = useState(false);

  // Step 2 - Format Selection
  const [format, setFormat] = useState<PoolFormat>('standard');

  // Step 3 - Structure (Standard)
  const [totalRounds, setTotalRounds] = useState(10);
  const [matchesPerRound, setMatchesPerRound] = useState(10);

  // Step 3 - Structure (Cup)
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

  // Step 3 - Structure (Knockout Only)
  const [knockoutConfig, setKnockoutConfig] = useState<KnockoutOnlyConfig>({
    totalTeams: 8,
    knockoutFormat: 'single',
    finalFormat: 'single',
    hasThirdPlace: false,
    awayGoalsRule: false,
  });

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const resetForm = () => {
    setStep(1);
    setName('');
    setDescription('');
    setRules('');
    setEntryFee('0');
    setInitialPrize('0');
    setAdminFeePercent(20);
    setMaxParticipants('');
    setIsPublic(true);
    setAllowMultipleTickets(false);
    setFormat('standard');
    setTotalRounds(10);
    setMatchesPerRound(10);
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
      totalTeams: 8,
      knockoutFormat: 'single',
      finalFormat: 'single',
      hasThirdPlace: false,
      awayGoalsRule: false,
    });
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const canProceedStep1 = name.trim().length >= 3;
  const canProceedStep2 = format === 'standard' || format === 'cup' || format === 'knockout';
  
  // Calculate total matches based on format
  const calculateTotalMatches = () => {
    if (format === 'standard') {
      return totalRounds * matchesPerRound;
    } else if (format === 'knockout') {
      // Knockout only format
      const knockoutMultiplier = knockoutConfig.knockoutFormat === 'home_away' ? 2 : 1;
      const finalMultiplier = knockoutConfig.finalFormat === 'home_away' ? 2 : 1;
      
      let matches = 0;
      if (knockoutConfig.totalTeams >= 64) matches += 32 * knockoutMultiplier;
      if (knockoutConfig.totalTeams >= 32) matches += 16 * knockoutMultiplier;
      if (knockoutConfig.totalTeams >= 16) matches += 8 * knockoutMultiplier;
      if (knockoutConfig.totalTeams >= 8) matches += 4 * knockoutMultiplier;
      if (knockoutConfig.totalTeams >= 4) matches += 2 * knockoutMultiplier;
      matches += finalMultiplier;
      if (knockoutConfig.hasThirdPlace) matches += 1;
      
      return matches;
    } else {
      // Cup format match calculation
      const teamsPerGroup = cupConfig.totalTeams / cupConfig.totalGroups;
      const matchesPerGroupPhase = cupConfig.groupPhaseFormat === 'home_away' 
        ? (teamsPerGroup - 1) * teamsPerGroup 
        : (teamsPerGroup - 1) * teamsPerGroup / 2;
      const totalGroupMatches = cupConfig.totalGroups * matchesPerGroupPhase;
      
      const teamsFromGroups = cupConfig.totalGroups * cupConfig.classifiedPerGroup;
      const teamsFromBestThird = cupConfig.enableBestThirdPlace ? cupConfig.bestThirdPlaceCount : 0;
      const teamsInKnockout = teamsFromGroups + teamsFromBestThird;
      
      const knockoutGamesMultiplier = cupConfig.knockoutFormat === 'home_away' ? 2 : 1;
      const finalGamesMultiplier = cupConfig.finalFormat === 'home_away' ? 2 : 1;
      
      let knockoutMatches = 0;
      if (teamsInKnockout >= 16) knockoutMatches += 8 * knockoutGamesMultiplier;
      if (teamsInKnockout >= 8) knockoutMatches += 4 * knockoutGamesMultiplier;
      if (teamsInKnockout >= 4) knockoutMatches += 2 * knockoutGamesMultiplier;
      knockoutMatches += finalGamesMultiplier;
      if (cupConfig.hasThirdPlace) knockoutMatches += 1;
      
      return totalGroupMatches + knockoutMatches;
    }
  };

  const totalMatchesCalculated = calculateTotalMatches();

  // Check limits for common members
  const getLimitViolations = () => {
    if (isPrivilegedUser) return [];
    
    const violations: string[] = [];
    
    if (format === 'cup') {
      if (cupConfig.totalTeams > MEMBER_LIMITS.maxTeams) {
        violations.push(`Máximo de ${MEMBER_LIMITS.maxTeams} equipes`);
      }
      if (cupConfig.totalGroups > MEMBER_LIMITS.maxGroups) {
        violations.push(`Máximo de ${MEMBER_LIMITS.maxGroups} grupos`);
      }
    }
    
    if (format === 'knockout') {
      if (knockoutConfig.totalTeams > MEMBER_LIMITS.maxTeams) {
        violations.push(`Máximo de ${MEMBER_LIMITS.maxTeams} equipes`);
      }
    }
    
    if (totalMatchesCalculated > MEMBER_LIMITS.maxMatches) {
      violations.push(`Máximo de ${MEMBER_LIMITS.maxMatches} partidas no total`);
    }
    
    return violations;
  };

  const limitViolations = getLimitViolations();
  const hasLimitViolations = limitViolations.length > 0;

  const canProceedStep3 = (() => {
    if (hasLimitViolations) return false;
    
    if (format === 'standard') {
      return totalRounds >= 1 && matchesPerRound >= 1;
    } else if (format === 'knockout') {
      return knockoutConfig.totalTeams >= 4;
    } else {
      return cupConfig.totalTeams >= 4 && cupConfig.totalGroups >= 1 && cupConfig.classifiedPerGroup >= 1;
    }
  })();

  const handleNext = () => {
    if (step === 1 && canProceedStep1) {
      setStep(2);
    } else if (step === 2 && canProceedStep2) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleBecomeMestre = () => {
    handleClose();
    navigate('/mestre-do-bolao');
  };

  // Generate cup rounds automatically
  const generateCupRounds = (poolId: string) => {
    const rounds: Array<{
      pool_id: string;
      round_number: number;
      name: string;
      match_limit: number;
      created_by: string;
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
        pool_id: poolId,
        round_number: roundNumber++,
        name: `Grupo ${groupLetter}`,
        match_limit: Math.ceil(matchesPerGroupPhase),
        created_by: userId,
      });
    }

    const teamsFromGroups = cupConfig.totalGroups * cupConfig.classifiedPerGroup;
    const teamsFromBestThird = cupConfig.enableBestThirdPlace ? cupConfig.bestThirdPlaceCount : 0;
    const teamsInKnockout = teamsFromGroups + teamsFromBestThird;
    const knockoutMultiplier = cupConfig.knockoutFormat === 'home_away' ? 2 : 1;

    // Round of 16
    if (teamsInKnockout >= 16) {
      if (cupConfig.knockoutFormat === 'home_away') {
        rounds.push({
          pool_id: poolId,
          round_number: roundNumber++,
          name: 'Oitavas - Ida',
          match_limit: 8,
          created_by: userId,
        });
        rounds.push({
          pool_id: poolId,
          round_number: roundNumber++,
          name: 'Oitavas - Volta',
          match_limit: 8,
          created_by: userId,
        });
      } else {
        rounds.push({
          pool_id: poolId,
          round_number: roundNumber++,
          name: 'Oitavas de Final',
          match_limit: 8,
          created_by: userId,
        });
      }
    }

    // Quarter Finals
    if (teamsInKnockout >= 8) {
      if (cupConfig.knockoutFormat === 'home_away') {
        rounds.push({
          pool_id: poolId,
          round_number: roundNumber++,
          name: 'Quartas - Ida',
          match_limit: 4,
          created_by: userId,
        });
        rounds.push({
          pool_id: poolId,
          round_number: roundNumber++,
          name: 'Quartas - Volta',
          match_limit: 4,
          created_by: userId,
        });
      } else {
        rounds.push({
          pool_id: poolId,
          round_number: roundNumber++,
          name: 'Quartas de Final',
          match_limit: 4,
          created_by: userId,
        });
      }
    }

    // Semi Finals
    if (teamsInKnockout >= 4) {
      if (cupConfig.knockoutFormat === 'home_away') {
        rounds.push({
          pool_id: poolId,
          round_number: roundNumber++,
          name: 'Semifinal - Ida',
          match_limit: 2,
          created_by: userId,
        });
        rounds.push({
          pool_id: poolId,
          round_number: roundNumber++,
          name: 'Semifinal - Volta',
          match_limit: 2,
          created_by: userId,
        });
      } else {
        rounds.push({
          pool_id: poolId,
          round_number: roundNumber++,
          name: 'Semifinal',
          match_limit: 2,
          created_by: userId,
        });
      }
    }

    // Third place
    if (cupConfig.hasThirdPlace) {
      rounds.push({
        pool_id: poolId,
        round_number: roundNumber++,
        name: 'Disputa 3º Lugar',
        match_limit: 1,
        created_by: userId,
      });
    }

    // Final
    if (cupConfig.finalFormat === 'home_away') {
      rounds.push({
        pool_id: poolId,
        round_number: roundNumber++,
        name: 'Final - Jogo de Ida',
        match_limit: 1,
        created_by: userId,
      });
      rounds.push({
        pool_id: poolId,
        round_number: roundNumber++,
        name: 'Final - Jogo de Volta',
        match_limit: 1,
        created_by: userId,
      });
    } else {
      rounds.push({
        pool_id: poolId,
        round_number: roundNumber++,
        name: '🏆 FINAL',
        match_limit: 1,
        created_by: userId,
      });
    }

    return rounds;
  };

  // Generate knockout only rounds
  const generateKnockoutRounds = (poolId: string) => {
    const rounds: Array<{
      pool_id: string;
      round_number: number;
      name: string;
      match_limit: number;
      created_by: string;
    }> = [];
    
    let roundNumber = 1;
    const knockoutMultiplier = knockoutConfig.knockoutFormat === 'home_away' ? 2 : 1;

    // Round of 64
    if (knockoutConfig.totalTeams >= 64) {
      if (knockoutConfig.knockoutFormat === 'home_away') {
        rounds.push({ pool_id: poolId, round_number: roundNumber++, name: '32 avos - Ida', match_limit: 32, created_by: userId });
        rounds.push({ pool_id: poolId, round_number: roundNumber++, name: '32 avos - Volta', match_limit: 32, created_by: userId });
      } else {
        rounds.push({ pool_id: poolId, round_number: roundNumber++, name: '32 avos de Final', match_limit: 32, created_by: userId });
      }
    }

    // Round of 32
    if (knockoutConfig.totalTeams >= 32) {
      if (knockoutConfig.knockoutFormat === 'home_away') {
        rounds.push({ pool_id: poolId, round_number: roundNumber++, name: '16 avos - Ida', match_limit: 16, created_by: userId });
        rounds.push({ pool_id: poolId, round_number: roundNumber++, name: '16 avos - Volta', match_limit: 16, created_by: userId });
      } else {
        rounds.push({ pool_id: poolId, round_number: roundNumber++, name: '16 avos de Final', match_limit: 16, created_by: userId });
      }
    }

    // Round of 16
    if (knockoutConfig.totalTeams >= 16) {
      if (knockoutConfig.knockoutFormat === 'home_away') {
        rounds.push({ pool_id: poolId, round_number: roundNumber++, name: 'Oitavas - Ida', match_limit: 8, created_by: userId });
        rounds.push({ pool_id: poolId, round_number: roundNumber++, name: 'Oitavas - Volta', match_limit: 8, created_by: userId });
      } else {
        rounds.push({ pool_id: poolId, round_number: roundNumber++, name: 'Oitavas de Final', match_limit: 8, created_by: userId });
      }
    }

    // Quarter Finals
    if (knockoutConfig.totalTeams >= 8) {
      if (knockoutConfig.knockoutFormat === 'home_away') {
        rounds.push({ pool_id: poolId, round_number: roundNumber++, name: 'Quartas - Ida', match_limit: 4, created_by: userId });
        rounds.push({ pool_id: poolId, round_number: roundNumber++, name: 'Quartas - Volta', match_limit: 4, created_by: userId });
      } else {
        rounds.push({ pool_id: poolId, round_number: roundNumber++, name: 'Quartas de Final', match_limit: 4, created_by: userId });
      }
    }

    // Semi Finals
    if (knockoutConfig.totalTeams >= 4) {
      if (knockoutConfig.knockoutFormat === 'home_away') {
        rounds.push({ pool_id: poolId, round_number: roundNumber++, name: 'Semifinal - Ida', match_limit: 2, created_by: userId });
        rounds.push({ pool_id: poolId, round_number: roundNumber++, name: 'Semifinal - Volta', match_limit: 2, created_by: userId });
      } else {
        rounds.push({ pool_id: poolId, round_number: roundNumber++, name: 'Semifinal', match_limit: 2, created_by: userId });
      }
    }

    // Third place
    if (knockoutConfig.hasThirdPlace) {
      rounds.push({ pool_id: poolId, round_number: roundNumber++, name: 'Disputa 3º Lugar', match_limit: 1, created_by: userId });
    }

    // Final
    if (knockoutConfig.finalFormat === 'home_away') {
      rounds.push({ pool_id: poolId, round_number: roundNumber++, name: 'Final - Jogo de Ida', match_limit: 1, created_by: userId });
      rounds.push({ pool_id: poolId, round_number: roundNumber++, name: 'Final - Jogo de Volta', match_limit: 1, created_by: userId });
    } else {
      rounds.push({ pool_id: poolId, round_number: roundNumber++, name: '🏆 FINAL', match_limit: 1, created_by: userId });
    }

    return rounds;
  };

  const handleCreate = async () => {
    if (!canProceedStep3) return;

    setLoading(true);
    try {
      // Calculate total rounds based on format
      let calculatedTotalRounds = totalRounds;
      if (format === 'cup') {
        const teamsFromGroups = cupConfig.totalGroups * cupConfig.classifiedPerGroup;
        const teamsFromBestThird = cupConfig.enableBestThirdPlace ? cupConfig.bestThirdPlaceCount : 0;
        const teamsInKnockout = teamsFromGroups + teamsFromBestThird;
        calculatedTotalRounds = cupConfig.totalGroups;
        if (teamsInKnockout >= 16) calculatedTotalRounds += (cupConfig.knockoutFormat === 'home_away' ? 2 : 1);
        if (teamsInKnockout >= 8) calculatedTotalRounds += (cupConfig.knockoutFormat === 'home_away' ? 2 : 1);
        if (teamsInKnockout >= 4) calculatedTotalRounds += (cupConfig.knockoutFormat === 'home_away' ? 2 : 1);
        if (cupConfig.hasThirdPlace) calculatedTotalRounds += 1;
        calculatedTotalRounds += (cupConfig.finalFormat === 'home_away' ? 2 : 1);
      } else if (format === 'knockout') {
        calculatedTotalRounds = 0;
        if (knockoutConfig.totalTeams >= 64) calculatedTotalRounds += (knockoutConfig.knockoutFormat === 'home_away' ? 2 : 1);
        if (knockoutConfig.totalTeams >= 32) calculatedTotalRounds += (knockoutConfig.knockoutFormat === 'home_away' ? 2 : 1);
        if (knockoutConfig.totalTeams >= 16) calculatedTotalRounds += (knockoutConfig.knockoutFormat === 'home_away' ? 2 : 1);
        if (knockoutConfig.totalTeams >= 8) calculatedTotalRounds += (knockoutConfig.knockoutFormat === 'home_away' ? 2 : 1);
        if (knockoutConfig.totalTeams >= 4) calculatedTotalRounds += (knockoutConfig.knockoutFormat === 'home_away' ? 2 : 1);
        if (knockoutConfig.hasThirdPlace) calculatedTotalRounds += 1;
        calculatedTotalRounds += (knockoutConfig.finalFormat === 'home_away' ? 2 : 1);
      }

      // 1. Create the pool
      const { data: pool, error: poolError } = await supabase
        .from('pools')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          rules: rules.trim() || null,
          entry_fee: parseFloat(entryFee) || 0,
          initial_prize: parseFloat(initialPrize) || 0,
          admin_fee_percent: parseFloat(entryFee) > 0 ? adminFeePercent : 0,
          max_participants: maxParticipants ? parseInt(maxParticipants) : null,
          is_public: isPublic,
          allow_multiple_tickets: allowMultipleTickets,
          total_rounds: calculatedTotalRounds,
          matches_per_round: format === 'standard' ? matchesPerRound : null,
          created_by: userId,
        })
        .select()
        .single();

      if (poolError) throw poolError;

      // 2. Create all rounds automatically
      let rounds;
      if (format === 'standard') {
        rounds = Array.from({ length: totalRounds }, (_, i) => ({
          pool_id: pool.id,
          round_number: i + 1,
          name: `Rodada ${i + 1}`,
          match_limit: matchesPerRound,
          created_by: userId,
        }));
      } else if (format === 'knockout') {
        rounds = generateKnockoutRounds(pool.id);
      } else {
        rounds = generateCupRounds(pool.id);
      }

      const { error: roundsError } = await supabase
        .from('rounds')
        .insert(rounds);

      if (roundsError) throw roundsError;

      // Note: Creator is NOT automatically added as participant
      // They can join manually if they wish to participate

      const successMessage = format === 'standard'
        ? `Bolão "${name}" criado com ${totalRounds} rodadas!`
        : format === 'knockout'
          ? `Bolão "${name}" criado no formato Mata-Mata com ${rounds.length} fases!`
          : `Bolão "${name}" criado no formato Copa com ${rounds.length} fases!`;
      
      toast.success(successMessage);
      handleClose();
      onSuccess();
    } catch (error: any) {
      console.error('Error creating pool:', error);
      toast.error(error.message || 'Erro ao criar bolão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Criar Novo Bolão
            {subscription && (
              <Badge variant="outline" className="ml-2">
                {subscription.planName}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && 'Passo 1 de 3: Informações básicas do bolão'}
            {step === 2 && 'Passo 2 de 3: Escolha o formato do bolão'}
            {step === 3 && format === 'standard' && 'Passo 3 de 3: Defina a estrutura de rodadas e jogos'}
            {step === 3 && format === 'cup' && 'Passo 3 de 3: Configure as fases do campeonato'}
            {step === 3 && format === 'knockout' && 'Passo 3 de 3: Configure o mata-mata'}
          </DialogDescription>
        </DialogHeader>

        {/* Pool Limit Warning */}
        {!loadingSubscription && !canCreateNewPool && canCreateResult && (
          <Alert className="border-destructive/50 bg-destructive/10">
            <Lock className="h-4 w-4 text-destructive" />
            <AlertDescription className="ml-2">
              <div className="space-y-3">
                <p className="font-medium text-destructive">
                  {canCreateResult.reason}
                </p>
                {canCreateResult.poolLimit !== null && (
                  <p className="text-sm text-muted-foreground">
                    Bolões ativos: <strong>{canCreateResult.currentPools}</strong> / {canCreateResult.poolLimit}
                  </p>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleBecomeMestre}
                  className="border-primary text-primary hover:bg-primary/10"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  {canCreateResult.planType ? 'Fazer Upgrade' : 'Tornar-se Mestre do Bolão'}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Subscription Info */}
        {!loadingSubscription && canCreateNewPool && canCreateResult && canCreateResult.poolLimit !== null && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            <Trophy className="h-4 w-4 text-primary" />
            <span>
              Bolões: <strong>{canCreateResult.currentPools}</strong> / {canCreateResult.poolLimit}
              {canCreateResult.poolLimit - canCreateResult.currentPools > 0 && (
                <span className="text-green-600 dark:text-green-400 ml-1">
                  ({canCreateResult.poolLimit - canCreateResult.currentPools} disponível{canCreateResult.poolLimit - canCreateResult.currentPools > 1 ? 's' : ''})
                </span>
              )}
            </span>
          </div>
        )}

        {/* Progress Bar */}
        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Passo {step} de {totalSteps}</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && canCreateNewPool && (
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Bolão *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Brasileirão 2026"
                maxLength={100}
              />
              {name.length > 0 && name.length < 3 && (
                <p className="text-xs text-destructive">Mínimo de 3 caracteres</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva seu bolão..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rules">Regras</Label>
              <Textarea
                id="rules"
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                placeholder="Defina as regras do seu bolão..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entryFee">Taxa de Entrada (R$)</Label>
                <Input
                  id="entryFee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={entryFee}
                  onChange={(e) => setEntryFee(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="initialPrize">Premiação Inicial (R$)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Valor garantido pelo organizador que será somado ao total arrecadado com as taxas de inscrição. Útil para atrair participantes com um prêmio inicial atrativo.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="initialPrize"
                  type="number"
                  min="0"
                  step="0.01"
                  value={initialPrize}
                  onChange={(e) => setInitialPrize(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Valor garantido pelo organizador
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxParticipants">Máx. Participantes</Label>
              <Input
                id="maxParticipants"
                type="number"
                min="2"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(e.target.value)}
                placeholder="Ilimitado"
              />
            </div>

            {/* Admin Fee - Only visible when entry fee > 0 */}
            {parseFloat(entryFee) > 0 && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="adminFeePercent" className="font-medium">
                      Taxa Administrativa (%)
                    </Label>
                    <span className="text-sm font-semibold text-primary">{adminFeePercent}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Porcentagem do prêmio que ficará com o organizador (0% a 50%)
                  </p>
                  <input
                    type="range"
                    id="adminFeePercent"
                    min="0"
                    max="50"
                    step="1"
                    value={adminFeePercent}
                    onChange={(e) => setAdminFeePercent(parseInt(e.target.value))}
                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                  </div>
                </div>
                
                {/* Prize Preview */}
                <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">Prêmio estimado (10 participantes):</span>
                    <span className="font-bold text-accent">
                      R$ {((parseFloat(initialPrize) || 0) + (parseFloat(entryFee) * 10) * (1 - adminFeePercent / 100)).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Fórmula: Premiação Inicial + (Taxa × Participantes) - {adminFeePercent}% taxa administrativa
                  </p>
                </div>

                <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-700 dark:text-amber-300 text-xs">
                    Bolões com taxa de inscrição requerem <strong>aprovação obrigatória</strong> de novos participantes, mesmo sendo públicos.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <Label htmlFor="isPublic" className="font-medium">Bolão Público</Label>
                <p className="text-xs text-muted-foreground">
                  Bolões públicos aparecem na lista para todos
                </p>
              </div>
              <Switch
                id="isPublic"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <Label htmlFor="allowMultipleTickets" className="font-medium">Permitir Múltiplos Palpites</Label>
                <p className="text-xs text-muted-foreground">
                  Participantes podem comprar vários tickets no mesmo bolão
                </p>
              </div>
              <Switch
                id="allowMultipleTickets"
                checked={allowMultipleTickets}
                onCheckedChange={setAllowMultipleTickets}
              />
            </div>
          </div>
        )}

        {/* Step 2: Format Selection */}
        {step === 2 && (
          <div className="space-y-6 mt-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-foreground">Escolha o Formato do Bolão</h3>
              <p className="text-sm text-muted-foreground">
                Selecione o tipo de competição que deseja criar
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
                  className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all h-full"
                >
                  <Layers className="h-8 w-8 mb-2 text-primary" />
                  <div className="text-center">
                    <div className="font-semibold">Formato Padrão</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Rodadas sequenciais
                    </p>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Brasileirão, La Liga
                  </div>
                </Label>
              </div>

              <div>
                <RadioGroupItem value="knockout" id="format-knockout" className="peer sr-only" />
                <Label
                  htmlFor="format-knockout"
                  className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all h-full"
                >
                  <Swords className="h-8 w-8 mb-2 text-red-500" />
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

              <div>
                <RadioGroupItem value="cup" id="format-cup" className="peer sr-only" />
                <Label
                  htmlFor="format-cup"
                  className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all h-full"
                >
                  <Award className="h-8 w-8 mb-2 text-yellow-500" />
                  <div className="text-center">
                    <div className="font-semibold">Formato Copa</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Grupos + mata-mata
                    </p>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Champions, Copa do Mundo
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>
        )}

        {/* Step 3: Structure */}
        {step === 3 && format === 'standard' && (
          <div className="mt-4 space-y-4">
            <PoolStructureStep
              totalRounds={totalRounds}
              matchesPerRound={matchesPerRound}
              onTotalRoundsChange={setTotalRounds}
              onMatchesPerRoundChange={setMatchesPerRound}
              maxMatches={isPrivilegedUser ? undefined : MEMBER_LIMITS.maxMatches}
            />
          </div>
        )}

        {step === 3 && format === 'cup' && (
          <div className="mt-4 space-y-4">
            <CupFormatStep
              config={cupConfig}
              onChange={setCupConfig}
              maxTeams={isPrivilegedUser ? undefined : MEMBER_LIMITS.maxTeams}
              maxGroups={isPrivilegedUser ? undefined : MEMBER_LIMITS.maxGroups}
              maxMatches={isPrivilegedUser ? undefined : MEMBER_LIMITS.maxMatches}
            />
          </div>
        )}

        {step === 3 && format === 'knockout' && (
          <div className="mt-4 space-y-4">
            <KnockoutOnlyStep
              config={knockoutConfig}
              onChange={setKnockoutConfig}
              maxTeams={isPrivilegedUser ? undefined : MEMBER_LIMITS.maxTeams}
              maxMatches={isPrivilegedUser ? undefined : MEMBER_LIMITS.maxMatches}
            />
          </div>
        )}

        {/* Limit Violation Alert */}
        {step === 3 && hasLimitViolations && !isPrivilegedUser && (
          <Alert className="mt-4 border-amber-500/50 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="ml-2">
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-amber-700 dark:text-amber-400">
                    Limites excedidos para membros comuns:
                  </p>
                  <ul className="list-disc list-inside mt-1 text-sm text-amber-600 dark:text-amber-400/80">
                    {limitViolations.map((violation, i) => (
                      <li key={i}>{violation}</li>
                    ))}
                  </ul>
                </div>
                <p className="text-sm text-muted-foreground">
                  Competições maiores estão disponíveis apenas para <strong>Mestres do Bolão</strong>.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleBecomeMestre}
                  className="border-amber-500 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Tornar-se Mestre do Bolão
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6 pt-4 border-t">
          <Button
            variant="outline"
            onClick={step === 1 ? handleClose : handleBack}
            disabled={loading}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {step === 1 ? 'Cancelar' : 'Voltar'}
          </Button>

          {!canCreateNewPool ? (
            <Button
              variant="outline"
              onClick={handleClose}
            >
              Fechar
            </Button>
          ) : step < totalSteps ? (
            <Button
              onClick={handleNext}
              disabled={(step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2)}
            >
              Próximo
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleCreate}
              disabled={!canProceedStep3 || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Trophy className="h-4 w-4 mr-2" />
                  Criar Bolão
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
