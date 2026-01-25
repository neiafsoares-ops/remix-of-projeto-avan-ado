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
  Loader2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Save,
  Sparkles,
  Trash2
} from 'lucide-react';
import type { 
  SuggestedPool, 
  SuggestedPoolRound, 
  SuggestedPoolMatch 
} from '@/types/suggested-pools';

interface MatchSlot {
  index: number;
  match?: SuggestedPoolMatch;
  home_team: string;
  away_team: string;
  home_club_id: string;
  away_club_id: string;
  match_date: string;
  prediction_deadline: string;
  isSaved: boolean;
  isModified: boolean;
}

interface SuggestedPoolMatchesScreenProps {
  pool: SuggestedPool;
  onBack: () => void;
}

export function SuggestedPoolMatchesScreen({ pool, onBack }: SuggestedPoolMatchesScreenProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [rounds, setRounds] = useState<SuggestedPoolRound[]>([]);
  const [matches, setMatches] = useState<SuggestedPoolMatch[]>([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [matchSlots, setMatchSlots] = useState<MatchSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  
  // Default date/time state
  const [defaultMatchDate, setDefaultMatchDate] = useState('');
  const [defaultPredictionDeadline, setDefaultPredictionDeadline] = useState('');
  
  // Create club dialog state
  const [createClubDialogOpen, setCreateClubDialogOpen] = useState(false);
  const [newClubName, setNewClubName] = useState('');
  const [newClubTarget, setNewClubTarget] = useState<{ slotIndex: number; team: 'home' | 'away' } | null>(null);

  const currentRound = rounds[currentRoundIndex];

  useEffect(() => {
    fetchRoundsAndMatches();
  }, [pool.id]);

  useEffect(() => {
    if (currentRound) {
      initializeSlots();
    }
  }, [currentRound?.id, matches]);

  const fetchRoundsAndMatches = async () => {
    try {
      // Fetch rounds
      const { data: roundsData, error: roundsError } = await supabase
        .from('suggested_pool_rounds' as any)
        .select('*')
        .eq('suggested_pool_id', pool.id)
        .order('round_number');

      if (roundsError) throw roundsError;

      // Fetch matches
      const { data: matchesData, error: matchesError } = await supabase
        .from('suggested_pool_matches' as any)
        .select('*')
        .eq('suggested_pool_id', pool.id);

      if (matchesError) throw matchesError;

      setRounds((roundsData || []) as unknown as SuggestedPoolRound[]);
      setMatches((matchesData || []) as unknown as SuggestedPoolMatch[]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeSlots = () => {
    if (!currentRound) return;

    const roundMatches = matches.filter(m => m.round_id === currentRound.id);
    const totalSlots = pool.matches_per_round;

    const slots: MatchSlot[] = [];

    for (let i = 0; i < totalSlots; i++) {
      const existingMatch = roundMatches[i];

      if (existingMatch) {
        slots.push({
          index: i,
          match: existingMatch,
          home_team: existingMatch.home_team,
          away_team: existingMatch.away_team,
          home_club_id: existingMatch.home_club_id || '',
          away_club_id: existingMatch.away_club_id || '',
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
  };

  const formatDateTimeLocalFromISO = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toISOString().slice(0, 16);
  };

  const handleClubSelect = (index: number, team: 'home' | 'away', club: Club) => {
    setMatchSlots(prev => prev.map((slot, i) => {
      if (i !== index) return slot;

      if (team === 'home') {
        return {
          ...slot,
          home_team: club.name,
          home_club_id: club.id,
          isModified: true,
        };
      } else {
        return {
          ...slot,
          away_team: club.name,
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

  const updateSlot = (index: number, field: keyof MatchSlot, value: string) => {
    setMatchSlots(prev => prev.map((slot, i) =>
      i === index ? { ...slot, [field]: value, isModified: true } : slot
    ));
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
        suggested_pool_id: pool.id,
        round_id: currentRound.id,
        home_team: slot.home_team,
        away_team: slot.away_team,
        home_club_id: slot.home_club_id || null,
        away_club_id: slot.away_club_id || null,
        match_date: new Date(slot.match_date).toISOString(),
        prediction_deadline: new Date(slot.prediction_deadline).toISOString(),
      };

      if (slot.match?.id) {
        // Update existing match
        const { error } = await supabase
          .from('suggested_pool_matches' as any)
          .update({
            home_team: matchData.home_team,
            away_team: matchData.away_team,
            home_club_id: matchData.home_club_id,
            away_club_id: matchData.away_club_id,
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
          .from('suggested_pool_matches' as any)
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

      await fetchRoundsAndMatches();
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

  const deleteMatch = async (index: number) => {
    const slot = matchSlots[index];
    if (!slot.match?.id) return;

    setSavingIndex(index);

    try {
      const { error } = await supabase
        .from('suggested_pool_matches' as any)
        .delete()
        .eq('id', slot.match.id);

      if (error) throw error;

      toast({
        title: 'Jogo removido',
        description: `${slot.home_team} x ${slot.away_team}`,
      });

      await fetchRoundsAndMatches();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível remover o jogo.',
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
    if (currentRoundIndex < rounds.length - 1) {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (rounds.length === 0) {
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
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhuma rodada encontrada</h3>
            <p className="text-muted-foreground">
              Este bolão não possui rodadas configuradas.
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
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              {pool.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              Gerencie os jogos das rodadas
            </p>
          </div>
        </div>

        {modifiedCount > 0 && (
          <Button
            variant="default"
            onClick={saveAllSlots}
            disabled={saving}
            className="bg-primary"
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
                {currentRound?.name || `Rodada ${currentRound?.round_number}`}
              </h3>
              <div className="flex items-center justify-center gap-2 mt-1">
                <Badge variant="outline">
                  {savedCount}/{totalSlots} jogos preenchidos
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Rodada {currentRoundIndex + 1} de {rounds.length}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={goToNextRound}
              disabled={currentRoundIndex >= rounds.length - 1}
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
              <Button variant="secondary" onClick={applyDefaultsToAll}>
                Aplicar a Todos
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
            className={`transition-all ${slot.isModified ? 'ring-2 ring-accent' : ''} ${slot.isSaved ? 'bg-muted/30' : ''}`}
          >
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Jogo {index + 1}</span>
                <div className="flex items-center gap-2">
                  {slot.isModified && (
                    <Badge variant="outline" className="text-accent border-accent">
                      Modificado
                    </Badge>
                  )}
                  {slot.isSaved && !slot.isModified && (
                    <Badge variant="secondary">Salvo</Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="py-3 px-4 space-y-4">
              {/* Teams */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Time Mandante</Label>
                  <ClubAutocomplete
                    value={slot.home_team}
                    onSelect={(club) => handleClubSelect(index, 'home', club)}
                    onCreate={(name) => handleCreateClub(name, index, 'home')}
                    placeholder="Buscar time mandante..."
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Time Visitante</Label>
                  <ClubAutocomplete
                    value={slot.away_team}
                    onSelect={(club) => handleClubSelect(index, 'away', club)}
                    onCreate={(name) => handleCreateClub(name, index, 'away')}
                    placeholder="Buscar time visitante..."
                  />
                </div>
              </div>

              {/* Date/Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 inline mr-1" />
                    Data/Hora do Jogo
                  </Label>
                  <Input
                    type="datetime-local"
                    value={slot.match_date}
                    onChange={(e) => updateSlot(index, 'match_date', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
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

              {/* Actions */}
              <div className="flex justify-end gap-2">
                {slot.match?.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMatch(index)}
                    disabled={savingIndex === index}
                    className="text-destructive hover:text-destructive"
                  >
                    {savingIndex === index ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <Button
                  variant={slot.isModified ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => saveSlot(index)}
                  disabled={savingIndex === index || (!slot.isModified && slot.isSaved)}
                >
                  {savingIndex === index ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {slot.match?.id ? 'Atualizar' : 'Salvar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
