import { useState, useEffect, useMemo } from 'react';
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
  Trash2,
  Users,
  AlertCircle,
  Shield
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
  home_team_image: string;
  away_team_image: string;
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

// Helper function to calculate matches per round for group stage
function calculateMatchesPerRound(teamCount: number): number {
  if (teamCount <= 2) return 1;
  return Math.floor(teamCount / 2);
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
  const [savingSlotKey, setSavingSlotKey] = useState<string | null>(null);
  
  // Default date/time state
  const [defaultMatchDate, setDefaultMatchDate] = useState('');
  const [defaultPredictionDeadline, setDefaultPredictionDeadline] = useState('');
  
  // Create club dialog state
  const [createClubDialogOpen, setCreateClubDialogOpen] = useState(false);
  const [newClubName, setNewClubName] = useState('');
  const [newClubTarget, setNewClubTarget] = useState<{ slotIndex: number; team: 'home' | 'away'; groupName?: string; roundId?: string } | null>(null);

  // Cup format detection - identify group rounds
  const groupRounds = useMemo(() => 
    rounds.filter(r => r.name?.startsWith('Grupo')),
    [rounds]
  );

  // Get unique groups (e.g., "Grupo A", "Grupo B")
  const uniqueGroups = useMemo(() => {
    const groups = new Set<string>();
    groupRounds.forEach(r => {
      if (r.name) {
        const groupMatch = r.name.match(/^Grupo\s+[A-Za-z]/);
        if (groupMatch) {
          groups.add(groupMatch[0]);
        }
      }
    });
    return Array.from(groups).sort();
  }, [groupRounds]);

  const isCupFormat = uniqueGroups.length > 0;

  // Non-group rounds (knockout phases)
  const nonGroupRounds = useMemo(() => 
    rounds.filter(r => !r.name?.startsWith('Grupo')),
    [rounds]
  );

  // Group round selection state (per-group navigation)
  const [groupRoundSelection, setGroupRoundSelection] = useState<Record<string, number>>({});

  const getSelectedRound = (groupName: string) => groupRoundSelection[groupName] || 0;
  const setSelectedRound = (groupName: string, roundIndex: number) => {
    setGroupRoundSelection(prev => ({ ...prev, [groupName]: roundIndex }));
  };

  // Organize data by group
  const matchesByGroup = useMemo(() => {
    const byGroup: Record<string, { 
      rounds: SuggestedPoolRound[]; 
      matchesByRound: Record<string, SuggestedPoolMatch[]>;
      teamCount: number;
      matchesPerRound: number;
      totalRoundsNeeded: number; // n-1 rounds for n teams (round robin)
    }> = {};
    
    uniqueGroups.forEach(groupName => {
      // Filter rounds for this group
      const groupRoundsList = groupRounds
        .filter(r => r.name?.startsWith(groupName))
        .sort((a, b) => a.round_number - b.round_number);
      
      // Map matches by round and count teams
      const matchesByRoundMap: Record<string, SuggestedPoolMatch[]> = {};
      const teamsInGroup = new Set<string>();
      
      groupRoundsList.forEach(round => {
        const roundMatches = matches.filter(m => m.round_id === round.id);
        matchesByRoundMap[round.id] = roundMatches;
        roundMatches.forEach(m => {
          if (m.home_team) teamsInGroup.add(m.home_team);
          if (m.away_team) teamsInGroup.add(m.away_team);
        });
      });
      
      const teamCount = Math.max(teamsInGroup.size, 4); // Minimum 4 teams
      // For round robin: n teams need n-1 rounds (each team plays every other team once)
      const totalRoundsNeeded = teamCount - 1;
      
      byGroup[groupName] = {
        rounds: groupRoundsList,
        matchesByRound: matchesByRoundMap,
        teamCount,
        matchesPerRound: calculateMatchesPerRound(teamCount),
        totalRoundsNeeded
      };
    });
    
    return byGroup;
  }, [uniqueGroups, groupRounds, matches]);

  // Group match slots (for cup format)
  const [groupMatchSlots, setGroupMatchSlots] = useState<Record<string, MatchSlot[]>>({});

  const currentRound = nonGroupRounds[currentRoundIndex];

  useEffect(() => {
    fetchRoundsAndMatches();
  }, [pool.id]);

  // Initialize group slots when cup format is detected
  useEffect(() => {
    if (!isCupFormat) return;

    const newGroupSlots: Record<string, MatchSlot[]> = {};

    uniqueGroups.forEach(groupName => {
      const groupData = matchesByGroup[groupName];
      const selectedRoundIndex = getSelectedRound(groupName);
      const currentRound = groupData.rounds[selectedRoundIndex];
      
      if (!currentRound) return;

      const roundMatches = groupData.matchesByRound[currentRound.id] || [];
      const slots: MatchSlot[] = [];
      const slotsToShow = groupData.matchesPerRound;

      for (let i = 0; i < slotsToShow; i++) {
        const existingMatch = roundMatches[i];

        if (existingMatch) {
          slots.push({
            index: i,
            match: existingMatch,
            home_team: existingMatch.home_team,
            away_team: existingMatch.away_team,
            home_team_image: '',
            away_team_image: '',
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

      newGroupSlots[`${groupName}-${currentRound.id}`] = slots;
    });

    setGroupMatchSlots(newGroupSlots);
  }, [isCupFormat, uniqueGroups, matchesByGroup, groupRoundSelection, matches]);

  useEffect(() => {
    if (currentRound && !isCupFormat) {
      initializeSlots();
    }
  }, [currentRound?.id, matches, isCupFormat]);

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
          home_team_image: '',
          away_team_image: '',
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

  const handleGroupClubSelect = (groupName: string, roundId: string, index: number, team: 'home' | 'away', club: Club) => {
    const key = `${groupName}-${roundId}`;
    setGroupMatchSlots(prev => ({
      ...prev,
      [key]: (prev[key] || []).map((slot, i) => {
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
      })
    }));
  };

  const handleCreateClub = (name: string, slotIndex: number, team: 'home' | 'away', groupName?: string, roundId?: string) => {
    setNewClubName(name);
    setNewClubTarget({ slotIndex, team, groupName, roundId });
    setCreateClubDialogOpen(true);
  };

  const handleClubCreated = (club: Club) => {
    if (newClubTarget) {
      if (newClubTarget.groupName && newClubTarget.roundId) {
        handleGroupClubSelect(newClubTarget.groupName, newClubTarget.roundId, newClubTarget.slotIndex, newClubTarget.team, club);
      } else {
        handleClubSelect(newClubTarget.slotIndex, newClubTarget.team, club);
      }
    }
    setCreateClubDialogOpen(false);
    setNewClubTarget(null);
  };

  const updateSlot = (index: number, field: keyof MatchSlot, value: string) => {
    setMatchSlots(prev => prev.map((slot, i) =>
      i === index ? { ...slot, [field]: value, isModified: true } : slot
    ));
  };

  const updateGroupSlot = (groupName: string, roundId: string, index: number, field: keyof MatchSlot, value: string) => {
    const key = `${groupName}-${roundId}`;
    setGroupMatchSlots(prev => ({
      ...prev,
      [key]: (prev[key] || []).map((slot, i) =>
        i === index ? { ...slot, [field]: value, isModified: true } : slot
      )
    }));
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

  const saveGroupSlot = async (groupName: string, roundId: string, index: number) => {
    if (!user) return;
    
    const key = `${groupName}-${roundId}`;
    const slots = groupMatchSlots[key] || [];
    const slot = slots[index];
    
    if (!slot) return;
    
    const error = validateSlot(slot);
    
    if (error) {
      toast({
        title: 'Erro',
        description: error,
        variant: 'destructive',
      });
      return;
    }
    
    setSavingSlotKey(`${key}-${index}`);
    
    try {
      const matchData = {
        suggested_pool_id: pool.id,
        round_id: roundId,
        home_team: slot.home_team,
        away_team: slot.away_team,
        home_club_id: slot.home_club_id || null,
        away_club_id: slot.away_club_id || null,
        match_date: new Date(slot.match_date).toISOString(),
        prediction_deadline: new Date(slot.prediction_deadline).toISOString(),
      };
      
      if (slot.match?.id) {
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
        const { error } = await supabase
          .from('suggested_pool_matches' as any)
          .insert(matchData);
          
        if (error) throw error;
        
        toast({
          title: 'Jogo adicionado!',
          description: `${slot.home_team} x ${slot.away_team}`,
        });
      }
      
      setGroupMatchSlots(prev => ({
        ...prev,
        [key]: (prev[key] || []).map((s, i) => 
          i === index ? { ...s, isSaved: true, isModified: false } : s
        )
      }));
      
      await fetchRoundsAndMatches();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível salvar o jogo.',
        variant: 'destructive',
      });
    } finally {
      setSavingSlotKey(null);
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

  const deleteGroupMatch = async (groupName: string, roundId: string, index: number) => {
    const key = `${groupName}-${roundId}`;
    const slots = groupMatchSlots[key] || [];
    const slot = slots[index];
    
    if (!slot?.match?.id) return;

    setSavingSlotKey(`${key}-${index}`);

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
      setSavingSlotKey(null);
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
    if (currentRoundIndex < nonGroupRounds.length - 1) {
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

  // Calculate total modified count for cup format
  const totalGroupModifiedCount = useMemo(() => {
    let count = 0;
    Object.values(groupMatchSlots).forEach(slots => {
      count += slots.filter(s => s.isModified).length;
    });
    return count;
  }, [groupMatchSlots]);

  // Render match slot for group stage
  const renderGroupMatchSlot = (groupName: string, roundId: string, slot: MatchSlot, index: number) => {
    const key = `${groupName}-${roundId}`;
    const slotKey = `${key}-${index}`;
    const isSaving = savingSlotKey === slotKey;

    return (
      <div
        key={slotKey}
        className={`p-4 rounded-lg border transition-colors ${
          slot.isModified ? 'border-amber-500/50 bg-amber-50/30 dark:bg-amber-950/10' :
          slot.isSaved ? 'border-green-500/30 bg-green-50/20 dark:bg-green-950/10' : 'border-border'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-muted-foreground">
            Jogo {index + 1}
          </span>
          <div className="flex items-center gap-2">
            {slot.isModified && (
              <Badge variant="outline" className="text-amber-600 border-amber-500 text-xs">
                Modificado
              </Badge>
            )}
            {slot.isSaved && !slot.isModified && (
              <Badge variant="outline" className="text-green-600 border-green-500 text-xs">
                Salvo
              </Badge>
            )}
          </div>
        </div>

        {/* Teams Row */}
        <div className="grid grid-cols-[1fr,auto,1fr] gap-3 items-center mb-4">
          {/* Home Team */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Mandante</Label>
            <ClubAutocomplete
              value={slot.home_team}
              onSelect={(club) => handleGroupClubSelect(groupName, roundId, index, 'home', club)}
              onCreate={(name) => handleCreateClub(name, index, 'home', groupName, roundId)}
              placeholder="Buscar mandante..."
            />
          </div>

          <span className="text-muted-foreground font-bold text-lg mt-6">x</span>

          {/* Away Team */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Visitante</Label>
            <ClubAutocomplete
              value={slot.away_team}
              onSelect={(club) => handleGroupClubSelect(groupName, roundId, index, 'away', club)}
              onCreate={(name) => handleCreateClub(name, index, 'away', groupName, roundId)}
              placeholder="Buscar visitante..."
            />
          </div>
        </div>

        {/* Date/Time Row */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              <Clock className="h-3 w-3 inline mr-1" />
              Data/Hora do Jogo
            </Label>
            <Input
              type="datetime-local"
              value={slot.match_date}
              onChange={(e) => updateGroupSlot(groupName, roundId, index, 'match_date', e.target.value)}
              className="text-sm h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              <Clock className="h-3 w-3 inline mr-1" />
              Prazo Palpites
            </Label>
            <Input
              type="datetime-local"
              value={slot.prediction_deadline}
              onChange={(e) => updateGroupSlot(groupName, roundId, index, 'prediction_deadline', e.target.value)}
              className="text-sm h-9"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          {slot.match?.id && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteGroupMatch(groupName, roundId, index)}
              disabled={isSaving}
              className="text-destructive hover:text-destructive"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          )}
          <Button
            size="sm"
            variant={slot.isModified ? 'default' : 'outline'}
            onClick={() => saveGroupSlot(groupName, roundId, index)}
            disabled={isSaving || (!slot.isModified && slot.isSaved)}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            {slot.match?.id ? 'Atualizar' : 'Salvar'}
          </Button>
        </div>
      </div>
    );
  };

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

  // Cup Format Layout
  if (isCupFormat) {
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
                {pool.name} - Fase de Grupos
              </h2>
              <p className="text-sm text-muted-foreground">
                Gerencie os jogos de cada grupo
              </p>
            </div>
          </div>
          
          {totalGroupModifiedCount > 0 && (
            <Badge variant="outline" className="text-amber-600 border-amber-500">
              {totalGroupModifiedCount} modificação(ões) pendente(s)
            </Badge>
          )}
        </div>

        {/* Groups Layout */}
        <div className="space-y-6">
          {uniqueGroups.map(groupName => {
            const groupData = matchesByGroup[groupName];
            const selectedRoundIndex = getSelectedRound(groupName);
            const currentGroupRound = groupData.rounds[selectedRoundIndex];
            // Use calculated rounds needed (n-1 for n teams) instead of existing rounds count
            const totalGroupRounds = groupData.totalRoundsNeeded;
            const existingRoundsCount = groupData.rounds.length;
            const matchesPerRoundGroup = groupData.matchesPerRound;
            
            const key = currentGroupRound ? `${groupName}-${currentGroupRound.id}` : '';
            const currentSlots = groupMatchSlots[key] || [];
            const savedCount = currentSlots.filter(s => s.isSaved).length;
            
            return (
              <Card key={groupName}>
                {/* Group Header with Navigation */}
                <CardHeader className="py-3 px-4 border-b bg-muted/30">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    {/* Group Name */}
                    <CardTitle className="text-base font-semibold uppercase tracking-wide">
                      {groupName}
                    </CardTitle>
                    
                    {/* Round Navigation */}
                    {totalGroupRounds > 0 && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setSelectedRound(groupName, selectedRoundIndex - 1)}
                          disabled={selectedRoundIndex <= 0}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium min-w-[100px] text-center">
                          Rodada {selectedRoundIndex + 1} de {totalGroupRounds}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setSelectedRound(groupName, selectedRoundIndex + 1)}
                          disabled={selectedRoundIndex >= existingRoundsCount - 1}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* Info Badges */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      <Users className="h-3 w-3 mr-1" />
                      {groupData.teamCount} equipes
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {matchesPerRoundGroup} jogos por rodada
                    </Badge>
                    <Badge 
                      variant={savedCount >= matchesPerRoundGroup ? "default" : "outline"}
                      className="text-xs"
                    >
                      {savedCount}/{matchesPerRoundGroup} preenchidos
                    </Badge>
                  </div>
                </CardHeader>
                
                {/* Match Slots */}
                <CardContent className="p-4">
                  {currentGroupRound ? (
                    <div className="space-y-4">
                      {currentSlots.map((slot, index) => 
                        renderGroupMatchSlot(groupName, currentGroupRound.id, slot, index)
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                      <p>Nenhuma rodada disponível para este grupo</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Knockout Rounds Section (if any) */}
        {nonGroupRounds.length > 0 && (
          <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-semibold mb-4">Fase Eliminatória</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Gerencie as rodadas eliminatórias separadamente
            </p>
            <div className="flex flex-wrap gap-2">
              {nonGroupRounds.map((round, index) => (
                <Button
                  key={round.id}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentRoundIndex(index);
                    // Switch to non-cup format view for knockout
                  }}
                >
                  {round.name || `Rodada ${round.round_number}`}
                </Button>
              ))}
            </div>
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
                  Rodada {currentRoundIndex + 1} de {nonGroupRounds.length}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={goToNextRound}
              disabled={currentRoundIndex >= nonGroupRounds.length - 1}
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
