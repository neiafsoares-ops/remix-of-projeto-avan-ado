import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { ClubAutocomplete, Club } from '@/components/ClubAutocomplete';
import { CreateClubDialog } from '@/components/CreateClubDialog';
import { 
  ArrowLeft, 
  ArrowRight,
  Plus, 
  Loader2,
  Shield,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Save,
  Lock,
  AlertCircle
} from 'lucide-react';
import { formatDateTimeBR, isBeforeDeadline } from '@/lib/date-utils';

interface Round {
  id: string;
  pool_id: string;
  round_number: number;
  name: string | null;
  match_limit: number;
  extra_matches_allowed: number;
  is_finalized: boolean | null;
  finalized_at: string | null;
}

interface Match {
  id: string;
  home_team: string;
  away_team: string;
  home_team_image: string | null;
  away_team_image: string | null;
  home_score: number | null;
  away_score: number | null;
  match_date: string;
  prediction_deadline: string;
  is_finished: boolean;
  round_id: string | null;
}

interface MatchSlot {
  index: number;
  match?: Match;
  home_team: string;
  away_team: string;
  home_team_image: string;
  away_team_image: string;
  home_club_id: string;
  away_club_id: string;
  match_date: string;
  prediction_deadline: string;
  isSaved: boolean;
  isModified: boolean;
}

interface AddGamesScreenProps {
  poolId: string;
  rounds: Round[];
  matches: Match[];
  matchesPerRound: number;
  onBack: () => void;
  onMatchesUpdate: () => void;
  initialRoundId?: string;
  canManagePool?: boolean;
  onLaunchScore?: (match: Match) => void;
}

export function AddGamesScreen({ 
  poolId, 
  rounds, 
  matches, 
  matchesPerRound, 
  onBack,
  onMatchesUpdate,
  initialRoundId,
  canManagePool = false,
  onLaunchScore
}: AddGamesScreenProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Get non-finalized rounds only for navigation
  const availableRounds = rounds.filter(r => !r.is_finalized);
  
  // Find initial index based on initialRoundId or default to first non-finalized
  const getInitialIndex = () => {
    if (initialRoundId) {
      const index = availableRounds.findIndex(r => r.id === initialRoundId);
      return index >= 0 ? index : 0;
    }
    return 0;
  };
  
  const [currentRoundIndex, setCurrentRoundIndex] = useState(getInitialIndex);
  const [matchSlots, setMatchSlots] = useState<MatchSlot[]>([]);
  const [saving, setSaving] = useState(false);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  
  // Default date/time state
  const [defaultMatchDate, setDefaultMatchDate] = useState('');
  const [defaultPredictionDeadline, setDefaultPredictionDeadline] = useState('');
  
  // Create club dialog state
  const [createClubDialogOpen, setCreateClubDialogOpen] = useState(false);
  const [newClubName, setNewClubName] = useState('');
  const [newClubTarget, setNewClubTarget] = useState<{ slotIndex: number; team: 'home' | 'away' } | null>(null);
  
  const currentRound = availableRounds[currentRoundIndex];
  
  // Initialize slots when round changes
  useEffect(() => {
    if (!currentRound) return;
    
    const roundMatches = matches.filter(m => m.round_id === currentRound.id);
    const maxMatches = currentRound.match_limit + (currentRound.extra_matches_allowed || 0);
    const totalSlots = Math.max(matchesPerRound, maxMatches);
    
    const slots: MatchSlot[] = [];
    
    for (let i = 0; i < totalSlots; i++) {
      const existingMatch = roundMatches[i];
      
      if (existingMatch) {
        slots.push({
          index: i,
          match: existingMatch,
          home_team: existingMatch.home_team,
          away_team: existingMatch.away_team,
          home_team_image: existingMatch.home_team_image || '',
          away_team_image: existingMatch.away_team_image || '',
          home_club_id: '',
          away_club_id: '',
          match_date: formatDateTimeLocalFromISO(existingMatch.match_date),
          prediction_deadline: formatDateTimeLocalFromISO(existingMatch.prediction_deadline),
          isSaved: true,
          isModified: false,
        });
      } else {
        slots.push({
          index: i,
          home_team: '',
          away_team: '',
          home_team_image: '',
          away_team_image: '',
          home_club_id: '',
          away_club_id: '',
          match_date: '',
          prediction_deadline: '',
          isSaved: false,
          isModified: false,
        });
      }
    }
    
    setMatchSlots(slots);
  }, [currentRound?.id, matches, matchesPerRound]);
  
  const formatDateTimeLocalFromISO = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toISOString().slice(0, 16);
  };
  
  const updateSlot = (index: number, field: keyof MatchSlot, value: string) => {
    setMatchSlots(prev => prev.map((slot, i) => 
      i === index ? { ...slot, [field]: value, isModified: true } : slot
    ));
  };
  
  const handleClubSelect = (index: number, team: 'home' | 'away', club: Club) => {
    setMatchSlots(prev => prev.map((slot, i) => {
      if (i !== index) return slot;
      
      if (team === 'home') {
        return {
          ...slot,
          home_team: club.name,
          home_team_image: club.logo_url || '',
          home_club_id: club.id,
          isModified: true,
        };
      } else {
        return {
          ...slot,
          away_team: club.name,
          away_team_image: club.logo_url || '',
          away_club_id: club.id,
          isModified: true,
        };
      }
    }));
  };
  
  const handleCreateClub = (name: string, slotIndex: number, team: 'home' | 'away') => {
    setNewClubName(name);
    setNewClubTarget({ slotIndex, team });
    setCreateClubDialogOpen(true);
  };
  
  const handleClubCreated = (club: Club) => {
    if (newClubTarget) {
      handleClubSelect(newClubTarget.slotIndex, newClubTarget.team, club);
    }
    setCreateClubDialogOpen(false);
    setNewClubTarget(null);
  };
  
  const validateSlot = (slot: MatchSlot): string | null => {
    if (!slot.home_team) return 'Time mandante é obrigatório';
    if (!slot.away_team) return 'Time visitante é obrigatório';
    if (!slot.match_date) return 'Data do jogo é obrigatória';
    if (!slot.prediction_deadline) return 'Prazo para palpites é obrigatório';
    
    if (new Date(slot.prediction_deadline) >= new Date(slot.match_date)) {
      return 'O prazo para palpites deve ser anterior ao horário do jogo';
    }
    
    return null;
  };
  
  const saveSlot = async (index: number) => {
    if (!user || !currentRound) return;
    
    const slot = matchSlots[index];
    const error = validateSlot(slot);
    
    if (error) {
      toast({
        title: 'Erro',
        description: error,
        variant: 'destructive',
      });
      return;
    }
    
    setSavingIndex(index);
    
    try {
      const matchData = {
        pool_id: poolId,
        round_id: currentRound.id,
        home_team: slot.home_team,
        away_team: slot.away_team,
        home_team_image: slot.home_team_image || null,
        away_team_image: slot.away_team_image || null,
        match_date: new Date(slot.match_date).toISOString(),
        prediction_deadline: new Date(slot.prediction_deadline).toISOString(),
        created_by: user.id,
      };
      
      if (slot.match?.id) {
        // Update existing match
        const { error } = await supabase
          .from('matches')
          .update({
            home_team: matchData.home_team,
            away_team: matchData.away_team,
            home_team_image: matchData.home_team_image,
            away_team_image: matchData.away_team_image,
            match_date: matchData.match_date,
            prediction_deadline: matchData.prediction_deadline,
          })
          .eq('id', slot.match.id);
          
        if (error) throw error;
        
        toast({
          title: 'Jogo atualizado!',
          description: `${slot.home_team} x ${slot.away_team}`,
        });
      } else {
        // Insert new match
        const { error } = await supabase
          .from('matches')
          .insert(matchData);
          
        if (error) throw error;
        
        toast({
          title: 'Jogo adicionado!',
          description: `${slot.home_team} x ${slot.away_team}`,
        });
      }
      
      setMatchSlots(prev => prev.map((s, i) => 
        i === index ? { ...s, isSaved: true, isModified: false } : s
      ));
      
      onMatchesUpdate();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível salvar o jogo.',
        variant: 'destructive',
      });
    } finally {
      setSavingIndex(null);
    }
  };
  
  const saveAllSlots = async () => {
    if (!user || !currentRound) return;
    
    const modifiedSlots = matchSlots.filter(s => s.isModified && s.home_team && s.away_team);
    
    if (modifiedSlots.length === 0) {
      toast({
        title: 'Nenhuma alteração',
        description: 'Não há jogos modificados para salvar.',
      });
      return;
    }
    
    // Validate all slots first
    for (const slot of modifiedSlots) {
      const error = validateSlot(slot);
      if (error) {
        toast({
          title: `Erro no Jogo ${slot.index + 1}`,
          description: error,
          variant: 'destructive',
        });
        return;
      }
    }
    
    setSaving(true);
    
    try {
      for (const slot of modifiedSlots) {
        await saveSlot(slot.index);
      }
      
      toast({
        title: 'Jogos salvos!',
        description: `${modifiedSlots.length} jogo(s) salvo(s) com sucesso.`,
      });
    } finally {
      setSaving(false);
    }
  };
  
  const goToPreviousRound = () => {
    if (currentRoundIndex > 0) {
      setCurrentRoundIndex(prev => prev - 1);
    }
  };
  
  const goToNextRound = () => {
    if (currentRoundIndex < availableRounds.length - 1) {
      setCurrentRoundIndex(prev => prev + 1);
    }
  };
  
  const applyDefaultsToAll = () => {
    if (!defaultMatchDate && !defaultPredictionDeadline) {
      toast({
        title: 'Atenção',
        description: 'Preencha pelo menos uma data/hora para aplicar.',
        variant: 'destructive',
      });
      return;
    }
    
    setMatchSlots(prev => prev.map(slot => ({
      ...slot,
      ...(defaultMatchDate && { match_date: defaultMatchDate }),
      ...(defaultPredictionDeadline && { prediction_deadline: defaultPredictionDeadline }),
      isModified: true,
    })));
    
    const applied = [];
    if (defaultMatchDate) applied.push('data/hora do jogo');
    if (defaultPredictionDeadline) applied.push('prazo para palpites');
    
    toast({
      title: 'Horários aplicados',
      description: `${applied.join(' e ')} aplicado(s) a todos os jogos.`,
    });
  };
  
  const savedCount = matchSlots.filter(s => s.isSaved).length;
  const totalSlots = matchSlots.length;
  const modifiedCount = matchSlots.filter(s => s.isModified).length;
  
  if (!currentRound) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
        
        <Card className="text-center py-12">
          <CardContent>
            <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Todas as rodadas estão finalizadas</h3>
            <p className="text-muted-foreground">
              Não há rodadas disponíveis para adicionar jogos.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h2 className="text-xl font-semibold">Adicionar Jogos</h2>
            <p className="text-sm text-muted-foreground">
              Preencha os jogos para a rodada atual
            </p>
          </div>
        </div>
        
        {modifiedCount > 0 && (
          <Button 
            variant="hero" 
            onClick={saveAllSlots}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar Todos ({modifiedCount})
          </Button>
        )}
      </div>
      
      {/* Round Navigation */}
      <Card>
        <CardContent className="py-4 space-y-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              size="sm"
              onClick={goToPreviousRound}
              disabled={currentRoundIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            
            <div className="text-center">
              <h3 className="font-semibold text-lg">
                {currentRound.name || `Rodada ${currentRound.round_number}`}
              </h3>
              <div className="flex items-center justify-center gap-2 mt-1">
                <Badge variant="outline">
                  {savedCount}/{totalSlots} jogos preenchidos
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Rodada {currentRoundIndex + 1} de {availableRounds.length}
                </span>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={goToNextRound}
              disabled={currentRoundIndex >= availableRounds.length - 1}
            >
              Próxima
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          
          {/* Default Date/Time Section */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Horários Padrão da Rodada</span>
              <span className="text-xs text-muted-foreground">(aplica a todos os jogos)</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  <Clock className="h-3 w-3 inline mr-1" />
                  Data e Hora do Jogo
                </Label>
                <Input
                  type="datetime-local"
                  value={defaultMatchDate}
                  onChange={(e) => setDefaultMatchDate(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  <Clock className="h-3 w-3 inline mr-1" />
                  Prazo para Palpites
                </Label>
                <Input
                  type="datetime-local"
                  value={defaultPredictionDeadline}
                  onChange={(e) => setDefaultPredictionDeadline(e.target.value)}
                />
              </div>
              
              <Button
                variant="default"
                onClick={applyDefaultsToAll}
                disabled={!defaultMatchDate && !defaultPredictionDeadline}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Aplicar em todos os jogos
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Match Slots */}
      <div className="space-y-4">
        {matchSlots.map((slot, index) => (
          <Card 
            key={index} 
            className={`transition-colors ${
              slot.isModified ? 'border-amber-500/50 bg-amber-50/30 dark:bg-amber-950/10' : 
              slot.isSaved ? 'border-green-500/30' : ''
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  Jogo {index + 1}
                  {slot.isSaved && !slot.isModified && slot.match?.is_finished && (
                    <Badge variant="default" className="bg-green-600 text-white text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Finalizado
                    </Badge>
                  )}
                  {slot.isSaved && !slot.isModified && !slot.match?.is_finished && (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  )}
                  {slot.isModified && (
                    <Badge variant="outline" className="text-amber-600 border-amber-600">
                      Modificado
                    </Badge>
                  )}
                  {/* Badge de status para jogos salvos */}
                  {slot.isSaved && slot.match && !slot.match.is_finished && !isBeforeDeadline(slot.match.prediction_deadline) && (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-xs">
                      Aguardando Resultado
                    </Badge>
                  )}
                </CardTitle>
                
                <div className="flex items-center gap-2">
                  {/* Botão Lançar Resultado para jogos salvos elegíveis */}
                  {slot.isSaved && slot.match && canManagePool && !slot.match.is_finished && !isBeforeDeadline(slot.match.prediction_deadline) && onLaunchScore && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => onLaunchScore(slot.match!)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Lançar Resultado
                    </Button>
                  )}
                  
                  {(slot.home_team || slot.away_team) && !slot.match?.is_finished && (
                    <Button
                      variant={slot.isModified ? "default" : "outline"}
                      size="sm"
                      onClick={() => saveSlot(index)}
                      disabled={savingIndex === index}
                    >
                      {savingIndex === index ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Salvar
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Teams Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Home Team */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Time Mandante
                    </Label>
                    <div className="flex items-center gap-2">
                      {slot.home_team_image ? (
                        <img 
                          src={slot.home_team_image} 
                          alt={slot.home_team}
                          className="w-10 h-10 object-contain rounded bg-muted p-1"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                          <Shield className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <ClubAutocomplete
                          value={slot.home_team}
                          logoValue={slot.home_team_image}
                          poolId={poolId}
                          placeholder="Time mandante..."
                          onSelect={(club) => handleClubSelect(index, 'home', club)}
                          onCreate={(name) => handleCreateClub(name, index, 'home')}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Away Team */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Time Visitante
                    </Label>
                    <div className="flex items-center gap-2">
                      {slot.away_team_image ? (
                        <img 
                          src={slot.away_team_image} 
                          alt={slot.away_team}
                          className="w-10 h-10 object-contain rounded bg-muted p-1"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                          <Shield className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <ClubAutocomplete
                          value={slot.away_team}
                          logoValue={slot.away_team_image}
                          poolId={poolId}
                          placeholder="Time visitante..."
                          onSelect={(club) => handleClubSelect(index, 'away', club)}
                          onCreate={(name) => handleCreateClub(name, index, 'away')}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Date/Time Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">
                      <Clock className="h-3 w-3 inline mr-1" />
                      Data e Hora do Jogo
                    </Label>
                    <Input
                      type="datetime-local"
                      value={slot.match_date}
                      onChange={(e) => updateSlot(index, 'match_date', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">
                      <Clock className="h-3 w-3 inline mr-1" />
                      Prazo para Palpites
                    </Label>
                    <Input
                      type="datetime-local"
                      value={slot.prediction_deadline}
                      onChange={(e) => updateSlot(index, 'prediction_deadline', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Footer Actions */}
      {modifiedCount > 0 && (
        <div className="sticky bottom-4 flex justify-center">
          <Button 
            variant="hero" 
            size="lg"
            onClick={saveAllSlots}
            disabled={saving}
            className="shadow-lg"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
            Salvar Todos os Jogos ({modifiedCount})
          </Button>
        </div>
      )}
      
      {/* Create Club Dialog */}
      <CreateClubDialog
        open={createClubDialogOpen}
        onOpenChange={setCreateClubDialogOpen}
        initialName={newClubName}
        onClubCreated={handleClubCreated}
      />
    </div>
  );
}
