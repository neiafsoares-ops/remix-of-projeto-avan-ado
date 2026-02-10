import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  AlertCircle,
  Users
} from 'lucide-react';
import { formatDateTimeBR, isBeforeDeadline, formatToDateTimeLocal } from '@/lib/date-utils';

// Types for auto-save tracking
interface SavedSlotData {
  home_team: string;
  away_team: string;
  match_date: string;
  prediction_deadline: string;
}

type SlotSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

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

// Helper function to calculate matches per round for group stage
function calculateMatchesPerRound(teamCount: number): number {
  if (teamCount <= 2) return 1;
  return Math.floor(teamCount / 2);
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
  
  // Cup format detection - identify group rounds
  const groupRounds = useMemo(() => 
    availableRounds.filter(r => r.name?.startsWith('Grupo')),
    [availableRounds]
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
    availableRounds.filter(r => !r.name?.startsWith('Grupo')),
    [availableRounds]
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
      rounds: Round[]; 
      matchesByRound: Record<string, Match[]>;
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
      const matchesByRoundMap: Record<string, Match[]> = {};
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
  
  // Find initial index based on initialRoundId or default to first non-finalized
  const getInitialIndex = () => {
    if (initialRoundId) {
      const index = nonGroupRounds.findIndex(r => r.id === initialRoundId);
      return index >= 0 ? index : 0;
    }
    return 0;
  };
  
  const [currentRoundIndex, setCurrentRoundIndex] = useState(getInitialIndex);
  const [matchSlots, setMatchSlots] = useState<MatchSlot[]>([]);
  const [saving, setSaving] = useState(false);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [savingSlotKey, setSavingSlotKey] = useState<string | null>(null);
  
  // Group match slots (for cup format)
  const [groupMatchSlots, setGroupMatchSlots] = useState<Record<string, MatchSlot[]>>({});
  
  // Default date/time state
  const [defaultMatchDate, setDefaultMatchDate] = useState('');
  const [defaultPredictionDeadline, setDefaultPredictionDeadline] = useState('');
  
  // Create club dialog state
  const [createClubDialogOpen, setCreateClubDialogOpen] = useState(false);
  const [newClubName, setNewClubName] = useState('');
  const [newClubTarget, setNewClubTarget] = useState<{ slotIndex: number; team: 'home' | 'away'; groupName?: string; roundId?: string } | null>(null);
  
  // Auto-save tracking refs and state
  const lastSavedSlots = useRef<Record<number, SavedSlotData>>({});
  const lastSavedGroupSlots = useRef<Record<string, SavedSlotData>>({});
  const autoSaveTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  const savingInProgress = useRef<Record<string, boolean>>({});
  const [slotSaveStatus, setSlotSaveStatus] = useState<Record<string, SlotSaveStatus>>({});
  
  const currentRound = nonGroupRounds[currentRoundIndex];

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

      newGroupSlots[`${groupName}-${currentRound.id}`] = slots;
      
      // Initialize tracking for existing matches in this group
      slots.forEach((slot, index) => {
        if (slot.isSaved && slot.home_team && slot.away_team) {
          const slotKey = `${groupName}-${currentRound.id}-${index}`;
          lastSavedGroupSlots.current[slotKey] = {
            home_team: slot.home_team,
            away_team: slot.away_team,
            match_date: slot.match_date,
            prediction_deadline: slot.prediction_deadline,
          };
        }
      });
    });

    setGroupMatchSlots(newGroupSlots);
  }, [isCupFormat, uniqueGroups, matchesByGroup, groupRoundSelection, matches]);
  
  // Helper: find the corresponding "Ida" round for a "Volta" round
  const findIdaRoundForVolta = (voltaRound: Round): Round | undefined => {
    if (!voltaRound.name) return undefined;
    const voltaName = voltaRound.name.toLowerCase();
    if (!voltaName.includes('volta')) return undefined;
    
    // Map volta names to ida names
    const idaName = voltaRound.name
      .replace(/- Volta$/i, '- Ida')
      .replace(/Jogo de Volta$/i, 'Jogo de Ida');
    
    return nonGroupRounds.find(r => r.name === idaName);
  };

  // Track last round ID to detect actual round changes vs just data refreshes
  const lastInitializedRoundId = useRef<string | null>(null);
  const hasUnsavedChanges = useRef(false);

  // Track unsaved changes
  useEffect(() => {
    hasUnsavedChanges.current = matchSlots.some(s => s.isModified || (!s.isSaved && (s.home_team || s.away_team)));
  }, [matchSlots]);

  // Initialize slots when round changes (for non-group rounds)
  useEffect(() => {
    if (!currentRound || isCupFormat) return;
    
    const roundMatches = matches.filter(m => m.round_id === currentRound.id);
    const maxMatches = currentRound.match_limit + (currentRound.extra_matches_allowed || 0);
    const totalSlots = maxMatches;
    
    // If same round and there are unsaved changes, only update saved slots (don't overwrite user edits)
    const isSameRound = lastInitializedRoundId.current === currentRound.id;
    if (isSameRound && hasUnsavedChanges.current) {
      // Only update slots that have corresponding matches in DB (newly saved)
      setMatchSlots(prev => {
        const updated = [...prev];
        roundMatches.forEach(match => {
          const existingIdx = updated.findIndex(s => s.match?.id === match.id);
          if (existingIdx >= 0) {
            // Update existing saved slot with latest DB data
            updated[existingIdx] = {
              ...updated[existingIdx],
              match,
              home_team: match.home_team,
              away_team: match.away_team,
              home_team_image: match.home_team_image || '',
              away_team_image: match.away_team_image || '',
              match_date: formatDateTimeLocalFromISO(match.match_date),
              prediction_deadline: formatDateTimeLocalFromISO(match.prediction_deadline),
              isSaved: true,
              isModified: false,
            };
          } else {
            // Find first unsaved slot without match ID to assign the newly saved match
            const emptyIdx = updated.findIndex(s => !s.match?.id && s.home_team === match.home_team && s.away_team === match.away_team);
            if (emptyIdx >= 0) {
              updated[emptyIdx] = {
                ...updated[emptyIdx],
                match,
                home_team_image: match.home_team_image || updated[emptyIdx].home_team_image,
                away_team_image: match.away_team_image || updated[emptyIdx].away_team_image,
                isSaved: true,
                isModified: false,
              };
            }
          }
        });
        return updated;
      });
      return;
    }
    
    lastInitializedRoundId.current = currentRound.id;
    
    // Check if this is a "Volta" round with no matches yet, and if corresponding "Ida" has matches
    const idaRound = findIdaRoundForVolta(currentRound);
    const idaMatches = idaRound ? matches.filter(m => m.round_id === idaRound.id) : [];
    const shouldAutoPopulateFromIda = roundMatches.length === 0 && idaMatches.length > 0;
    
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
      } else if (shouldAutoPopulateFromIda && idaMatches[i]) {
        // Pre-populate from Ida match with teams INVERTED (home becomes away, away becomes home)
        const idaMatch = idaMatches[i];
        slots.push({
          index: i,
          home_team: idaMatch.away_team,        // Invert: away becomes home
          away_team: idaMatch.home_team,        // Invert: home becomes away
          home_team_image: idaMatch.away_team_image || '',
          away_team_image: idaMatch.home_team_image || '',
          home_club_id: '',
          away_club_id: '',
          match_date: '',              // Leave blank for admin to fill
          prediction_deadline: '',     // Leave blank for admin to fill
          isSaved: false,
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
    
    // Initialize tracking with existing match values to prevent unnecessary auto-saves
    const initialSavedValues: Record<number, SavedSlotData> = {};
    slots.forEach((slot, index) => {
      if (slot.isSaved && slot.home_team && slot.away_team) {
        initialSavedValues[index] = {
          home_team: slot.home_team,
          away_team: slot.away_team,
          match_date: slot.match_date,
          prediction_deadline: slot.prediction_deadline,
        };
      }
    });
    lastSavedSlots.current = initialSavedValues;
  }, [currentRound?.id, matches, matchesPerRound, isCupFormat, nonGroupRounds]);
  
  // Cleanup auto-save timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(autoSaveTimeouts.current).forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  // Auto-save callback for standard slots
  const performAutoSave = useCallback(async (index: number, slot: MatchSlot) => {
    if (!user || !currentRound) return;
    
    const slotKey = `standard-${index}`;
    
    // Guard: prevent concurrent saves for the same slot
    if (savingInProgress.current[slotKey]) return;
    savingInProgress.current[slotKey] = true;
    
    setSlotSaveStatus(prev => ({ ...prev, [slotKey]: 'saving' }));
    
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
      };
      
      if (slot.match?.id) {
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
      } else {
        const { data: insertedData, error } = await supabase
          .from('matches')
          .insert(matchData)
          .select()
          .single();
          
        if (error) throw error;
        
        // Store the match object with ID so future saves do UPDATE instead of INSERT
        if (insertedData) {
          setMatchSlots(prev => prev.map((s, i) => 
            i === index ? { ...s, match: insertedData as unknown as Match } : s
          ));
        }
      }
      
      // Update last saved values
      lastSavedSlots.current[index] = {
        home_team: slot.home_team,
        away_team: slot.away_team,
        match_date: slot.match_date,
        prediction_deadline: slot.prediction_deadline,
      };
      
      setMatchSlots(prev => prev.map((s, i) => 
        i === index ? { ...s, isSaved: true, isModified: false } : s
      ));
      
      setSlotSaveStatus(prev => ({ ...prev, [slotKey]: 'saved' }));
      setTimeout(() => {
        setSlotSaveStatus(prev => ({ ...prev, [slotKey]: 'idle' }));
      }, 2000);
      
      onMatchesUpdate();
    } catch (error: any) {
      setSlotSaveStatus(prev => ({ ...prev, [slotKey]: 'error' }));
      toast({
        title: 'Erro ao salvar automaticamente',
        description: error.message || 'Não foi possível salvar o jogo.',
        variant: 'destructive',
      });
    } finally {
      savingInProgress.current[slotKey] = false;
    }
  }, [user, currentRound, poolId, onMatchesUpdate, toast]);

  // Auto-save callback for group slots
  const performGroupAutoSave = useCallback(async (groupName: string, roundId: string, index: number, slot: MatchSlot) => {
    if (!user) return;
    
    const slotKey = `${groupName}-${roundId}-${index}`;
    
    // Guard: prevent concurrent saves for the same slot
    if (savingInProgress.current[slotKey]) return;
    savingInProgress.current[slotKey] = true;
    
    setSlotSaveStatus(prev => ({ ...prev, [slotKey]: 'saving' }));
    
    try {
      const matchData = {
        pool_id: poolId,
        round_id: roundId,
        home_team: slot.home_team,
        away_team: slot.away_team,
        home_team_image: slot.home_team_image || null,
        away_team_image: slot.away_team_image || null,
        match_date: new Date(slot.match_date).toISOString(),
        prediction_deadline: new Date(slot.prediction_deadline).toISOString(),
      };
      
      if (slot.match?.id) {
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
      } else {
        const { data: insertedData, error } = await supabase
          .from('matches')
          .insert(matchData)
          .select()
          .single();
          
        if (error) throw error;
        
        // Store match object with ID for future updates
        if (insertedData) {
          const key = `${groupName}-${roundId}`;
          setGroupMatchSlots(prev => ({
            ...prev,
            [key]: (prev[key] || []).map((s, i) => 
              i === index ? { ...s, match: insertedData as unknown as Match } : s
            )
          }));
        }
      }
      
      // Update last saved values
      lastSavedGroupSlots.current[slotKey] = {
        home_team: slot.home_team,
        away_team: slot.away_team,
        match_date: slot.match_date,
        prediction_deadline: slot.prediction_deadline,
      };
      
      const key = `${groupName}-${roundId}`;
      setGroupMatchSlots(prev => ({
        ...prev,
        [key]: (prev[key] || []).map((s, i) => 
          i === index ? { ...s, isSaved: true, isModified: false } : s
        )
      }));
      
      setSlotSaveStatus(prev => ({ ...prev, [slotKey]: 'saved' }));
      setTimeout(() => {
        setSlotSaveStatus(prev => ({ ...prev, [slotKey]: 'idle' }));
      }, 2000);
      
      onMatchesUpdate();
    } catch (error: any) {
      setSlotSaveStatus(prev => ({ ...prev, [slotKey]: 'error' }));
      toast({
        title: 'Erro ao salvar automaticamente',
        description: error.message || 'Não foi possível salvar o jogo.',
        variant: 'destructive',
      });
    } finally {
      savingInProgress.current[slotKey] = false;
    }
  }, [user, poolId, onMatchesUpdate, toast]);

  // Auto-save effect for standard match slots
  useEffect(() => {
    if (!user || !currentRound || isCupFormat) return;
    
    matchSlots.forEach((slot, index) => {
      // Skip if slot is saved and not modified by user
      if (slot.isSaved && !slot.isModified) return;
      
      // Only save if both teams are filled
      if (!slot.home_team || !slot.away_team) return;
      
      // Skip if dates are not filled
      if (!slot.match_date || !slot.prediction_deadline) return;
      
      // Skip if already saved with same values
      const lastSaved = lastSavedSlots.current[index];
      const hasChanged = !lastSaved ||
        lastSaved.home_team !== slot.home_team ||
        lastSaved.away_team !== slot.away_team ||
        lastSaved.match_date !== slot.match_date ||
        lastSaved.prediction_deadline !== slot.prediction_deadline;
      
      if (!hasChanged) return;
      
      // Validate dates
      if (new Date(slot.prediction_deadline) >= new Date(slot.match_date)) return;
      
      // Clear existing timeout for this slot
      const timeoutKey = `standard-${index}`;
      if (autoSaveTimeouts.current[timeoutKey]) {
        clearTimeout(autoSaveTimeouts.current[timeoutKey]);
      }
      
      // Set new timeout with 1000ms debounce
      autoSaveTimeouts.current[timeoutKey] = setTimeout(() => {
        performAutoSave(index, slot);
      }, 1000);
    });
  }, [matchSlots, currentRound, user, isCupFormat, performAutoSave]);

  // Auto-save effect for group match slots
  useEffect(() => {
    if (!user || !isCupFormat) return;
    
    Object.entries(groupMatchSlots).forEach(([key, slots]) => {
      const [groupName, roundId] = key.split('-');
      
      slots.forEach((slot, index) => {
        // Skip if slot is saved and not modified by user
        if (slot.isSaved && !slot.isModified) return;
        
        // Only save if both teams are filled
        if (!slot.home_team || !slot.away_team) return;
        
        // Skip if dates are not filled
        if (!slot.match_date || !slot.prediction_deadline) return;
        
        // Skip if already saved with same values
        const slotKey = `${groupName}-${roundId}-${index}`;
        const lastSaved = lastSavedGroupSlots.current[slotKey];
        const hasChanged = !lastSaved ||
          lastSaved.home_team !== slot.home_team ||
          lastSaved.away_team !== slot.away_team ||
          lastSaved.match_date !== slot.match_date ||
          lastSaved.prediction_deadline !== slot.prediction_deadline;
        
        if (!hasChanged) return;
        
        // Validate dates
        if (new Date(slot.prediction_deadline) >= new Date(slot.match_date)) return;
        
        // Clear existing timeout for this slot
        if (autoSaveTimeouts.current[slotKey]) {
          clearTimeout(autoSaveTimeouts.current[slotKey]);
        }
        
        // Set new timeout with 1000ms debounce
        autoSaveTimeouts.current[slotKey] = setTimeout(() => {
          performGroupAutoSave(groupName, roundId, index, slot);
        }, 1000);
      });
    });
  }, [groupMatchSlots, user, isCupFormat, performGroupAutoSave]);
  
  const formatDateTimeLocalFromISO = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toISOString().slice(0, 16);
  };
  
  const updateSlot = (index: number, field: keyof MatchSlot, value: string) => {
    setMatchSlots(prev => prev.map((slot, i) => {
      if (i !== index) return slot;
      
      const updated = { ...slot, [field]: value, isModified: true };
      
      // Auto-fill deadline to 1 minute before match when match_date changes
      if (field === 'match_date' && value) {
        const matchTime = new Date(value);
        matchTime.setMinutes(matchTime.getMinutes() - 1);
        updated.prediction_deadline = formatToDateTimeLocal(matchTime);
      }
      
      return updated;
    }));
  };

  const updateGroupSlot = (groupName: string, roundId: string, index: number, field: keyof MatchSlot, value: string) => {
    const key = `${groupName}-${roundId}`;
    setGroupMatchSlots(prev => ({
      ...prev,
      [key]: (prev[key] || []).map((slot, i) => {
        if (i !== index) return slot;
        
        const updated = { ...slot, [field]: value, isModified: true };
        
        // Auto-fill deadline to 1 minute before match when match_date changes
        if (field === 'match_date' && value) {
          const matchTime = new Date(value);
          matchTime.setMinutes(matchTime.getMinutes() - 1);
          updated.prediction_deadline = formatToDateTimeLocal(matchTime);
        }
        
        return updated;
      })
    }));
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
    
    const slotKey = `standard-${index}`;
    
    // Guard: prevent concurrent saves for the same slot
    if (savingInProgress.current[slotKey]) return;
    
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
    
    // Cancel any pending auto-save for this slot
    if (autoSaveTimeouts.current[slotKey]) {
      clearTimeout(autoSaveTimeouts.current[slotKey]);
      delete autoSaveTimeouts.current[slotKey];
    }
    
    savingInProgress.current[slotKey] = true;
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
        const { data: insertedData, error } = await supabase
          .from('matches')
          .insert(matchData)
          .select()
          .single();
          
        if (error) throw error;
        
        // Store match object with ID for future updates
        if (insertedData) {
          setMatchSlots(prev => prev.map((s, i) => 
            i === index ? { ...s, match: insertedData as unknown as Match, isSaved: true, isModified: false } : s
          ));
        }
        
        toast({
          title: 'Jogo adicionado!',
          description: `${slot.home_team} x ${slot.away_team}`,
        });
      }
      
      if (slot.match?.id) {
        setMatchSlots(prev => prev.map((s, i) => 
          i === index ? { ...s, isSaved: true, isModified: false } : s
        ));
      }
      
      onMatchesUpdate();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível salvar o jogo.',
        variant: 'destructive',
      });
    } finally {
      setSavingIndex(null);
      savingInProgress.current[slotKey] = false;
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
        pool_id: poolId,
        round_id: roundId,
        home_team: slot.home_team,
        away_team: slot.away_team,
        home_team_image: slot.home_team_image || null,
        away_team_image: slot.away_team_image || null,
        match_date: new Date(slot.match_date).toISOString(),
        prediction_deadline: new Date(slot.prediction_deadline).toISOString(),
      };
      
      if (slot.match?.id) {
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
        const { data: insertedData, error } = await supabase
          .from('matches')
          .insert(matchData)
          .select()
          .single();
          
        if (error) throw error;
        
        // Store match with ID for future updates
        if (insertedData) {
          setGroupMatchSlots(prev => ({
            ...prev,
            [key]: (prev[key] || []).map((s, i) => 
              i === index ? { ...s, match: insertedData as unknown as Match, isSaved: true, isModified: false } : s
            )
          }));
        }
        
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
      
      onMatchesUpdate();
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
    
    // If match date is provided but no deadline, auto-calculate deadline
    let deadlineToApply = defaultPredictionDeadline;
    if (defaultMatchDate && !defaultPredictionDeadline) {
      const matchTime = new Date(defaultMatchDate);
      matchTime.setMinutes(matchTime.getMinutes() - 1);
      deadlineToApply = formatToDateTimeLocal(matchTime);
    }
    
    setMatchSlots(prev => prev.map(slot => ({
      ...slot,
      ...(defaultMatchDate && { match_date: defaultMatchDate }),
      ...(deadlineToApply && { prediction_deadline: deadlineToApply }),
      isModified: true,
    })));
    
    const applied = [];
    if (defaultMatchDate) applied.push('data/hora do jogo');
    if (deadlineToApply) applied.push('prazo para palpites');
    
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
    const statusKey = `${groupName}-${roundId}-${index}`;
    const isSaving = savingSlotKey === slotKey;
    const autoSaveStatus = slotSaveStatus[statusKey] || 'idle';

    // Render save status indicator
    const renderSaveStatus = () => {
      if (autoSaveStatus === 'saving') {
        return (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="text-xs">Salvando...</span>
          </div>
        );
      }
      if (autoSaveStatus === 'saved') {
        return (
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle2 className="w-3 h-3" />
            <span className="text-xs">Salvo automaticamente</span>
          </div>
        );
      }
      if (autoSaveStatus === 'error') {
        return (
          <div className="flex items-center gap-1 text-destructive">
            <AlertCircle className="w-3 h-3" />
            <span className="text-xs">Erro ao salvar</span>
          </div>
        );
      }
      return null;
    };

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
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              Jogo {index + 1}
            </span>
            {renderSaveStatus()}
          </div>
          <div className="flex items-center gap-2">
            {slot.isModified && !autoSaveStatus && (
              <Badge variant="outline" className="text-amber-600 border-amber-500 text-xs">
                Modificado
              </Badge>
            )}
            {slot.isSaved && !slot.isModified && autoSaveStatus !== 'saving' && (
              <Badge variant="outline" className="text-green-600 border-green-500 text-xs">
                Salvo
              </Badge>
            )}
          </div>
        </div>

        {/* Teams Row */}
        <div className="grid grid-cols-[1fr,auto,1fr] gap-3 items-center mb-4">
          {/* Home Team */}
          <div className="flex items-center gap-2">
            {slot.home_team_image ? (
              <img 
                src={slot.home_team_image} 
                alt={slot.home_team}
                className="w-8 h-8 object-contain rounded bg-muted p-0.5 flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <ClubAutocomplete
                value={slot.home_team}
                logoValue={slot.home_team_image}
                poolId={poolId}
                placeholder="Mandante..."
                onSelect={(club) => handleGroupClubSelect(groupName, roundId, index, 'home', club)}
                onCreate={(name) => handleCreateClub(name, index, 'home', groupName, roundId)}
              />
            </div>
          </div>

          <span className="text-muted-foreground font-bold text-lg">x</span>

          {/* Away Team */}
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <ClubAutocomplete
                value={slot.away_team}
                logoValue={slot.away_team_image}
                poolId={poolId}
                placeholder="Visitante..."
                onSelect={(club) => handleGroupClubSelect(groupName, roundId, index, 'away', club)}
                onCreate={(name) => handleCreateClub(name, index, 'away', groupName, roundId)}
              />
            </div>
            {slot.away_team_image ? (
              <img 
                src={slot.away_team_image} 
                alt={slot.away_team}
                className="w-8 h-8 object-contain rounded bg-muted p-0.5 flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
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

        {/* Save Button */}
        <div className="flex justify-end">
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
  
  if (!currentRound && !isCupFormat) {
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
              <h2 className="text-xl font-semibold">Adicionar Jogos - Fase de Grupos</h2>
              <p className="text-sm text-muted-foreground">
                Preencha os jogos de cada grupo
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
                  onClick={() => setCurrentRoundIndex(index)}
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
        {matchSlots.map((slot, index) => {
          const slotStatusKey = `standard-${index}`;
          const autoSaveStatus = slotSaveStatus[slotStatusKey] || 'idle';
          
          return (
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
                    {/* Auto-save status indicator */}
                    {autoSaveStatus === 'saving' && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span className="text-xs">Salvando...</span>
                      </div>
                    )}
                    {autoSaveStatus === 'saved' && (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="w-3 h-3" />
                        <span className="text-xs">Salvo automaticamente</span>
                      </div>
                    )}
                    {autoSaveStatus === 'error' && (
                      <div className="flex items-center gap-1 text-destructive">
                        <AlertCircle className="w-3 h-3" />
                        <span className="text-xs">Erro ao salvar</span>
                      </div>
                    )}
                    {slot.isSaved && !slot.isModified && slot.match?.is_finished && autoSaveStatus !== 'saving' && (
                      <Badge variant="default" className="bg-green-600 text-white text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Finalizado
                      </Badge>
                    )}
                    {slot.isSaved && !slot.isModified && !slot.match?.is_finished && autoSaveStatus !== 'saving' && autoSaveStatus !== 'saved' && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                    {slot.isModified && autoSaveStatus !== 'saving' && (
                      <Badge variant="outline" className="text-amber-600 border-amber-600">
                        Modificado
                      </Badge>
                    )}
                    {/* Badge de status para jogos salvos */}
                    {slot.isSaved && slot.match && !slot.match.is_finished && !isBeforeDeadline(slot.match.prediction_deadline) && autoSaveStatus !== 'saving' && (
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
                        disabled={savingIndex === index || autoSaveStatus === 'saving'}
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
          );
        })}
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
