import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Search, Plus, Shield, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Club {
  id: string;
  name: string;
  logo_url: string | null;
}

interface ClubAutocompleteProps {
  value: string;
  logoValue?: string;
  onSelect: (club: Club) => void;
  onCreate: (name: string) => void;
  placeholder?: string;
  className?: string;
  poolId?: string;
}

export function ClubAutocomplete({
  value,
  logoValue,
  onSelect,
  onCreate,
  placeholder = 'Digite o nome do time...',
  className,
  poolId,
}: ClubAutocompleteProps) {
  const [search, setSearch] = useState(value);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Sync external value with internal state
  useEffect(() => {
    if (value !== search && !isOpen) {
      setSearch(value);
    }
  }, [value]);

  // Fetch overrides for pool
  useEffect(() => {
    if (poolId) {
      fetchOverrides();
    }
  }, [poolId]);

  const fetchOverrides = async () => {
    if (!poolId) return;
    
    const { data } = await supabase
      .from('match_team_overrides' as any)
      .select('club_id, custom_logo_url')
      .eq('pool_id', poolId);
    
    if (data) {
      const overridesMap: Record<string, string> = {};
      (data as any[]).forEach(o => {
        overridesMap[o.club_id] = o.custom_logo_url;
      });
      setOverrides(overridesMap);
    }
  };

  const fetchClubs = useCallback(async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setClubs([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('clubs')
        .select('id, name, image_url')
        .ilike('name', `%${searchTerm}%`)
        .order('name')
        .limit(10);

      if (error) throw error;
      setClubs((data || []).map(c => ({ id: c.id, name: c.name, logo_url: c.image_url })));
    } catch (error) {
      console.error('Error fetching clubs:', error);
      setClubs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchClubs(search);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [search, fetchClubs]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearch(newValue);
    setSelectedClub(null);
    setIsOpen(true);
  };

  const handleSelectClub = (club: Club) => {
    // Apply override if exists
    const effectiveLogo = poolId && overrides[club.id] ? overrides[club.id] : club.logo_url;
    const clubWithOverride = { ...club, logo_url: effectiveLogo };
    
    setSearch(club.name);
    setSelectedClub(clubWithOverride);
    setIsOpen(false);
    onSelect(clubWithOverride);
  };

  const handleCreateNew = () => {
    if (search.trim().length >= 2) {
      onCreate(search.trim());
      setIsOpen(false);
    }
  };

  const getClubLogo = (club: Club) => {
    if (poolId && overrides[club.id]) {
      return overrides[club.id];
    }
    return club.logo_url;
  };

  const exactMatch = clubs.find(c => c.name.toLowerCase() === search.toLowerCase());
  const showCreateOption = search.trim().length >= 2 && !exactMatch;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={search}
          onChange={handleInputChange}
          onFocus={() => {
            if (search.length >= 2) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          className="pl-9 pr-10"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {selectedClub && !isLoading && (
          <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-success" />
        )}
      </div>

      {isOpen && (search.length >= 2 || clubs.length > 0) && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg overflow-hidden">
          <ScrollArea className="max-h-60">
            {clubs.length > 0 && (
              <div className="p-1">
                {clubs.map((club) => {
                  const logo = getClubLogo(club);
                  return (
                    <button
                      key={club.id}
                      type="button"
                      onClick={() => handleSelectClub(club)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                        'hover:bg-accent hover:text-accent-foreground',
                        'focus:bg-accent focus:text-accent-foreground focus:outline-none'
                      )}
                    >
                      {logo ? (
                        <img
                          src={logo}
                          alt={club.name}
                          className="w-8 h-8 object-contain rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                          <Shield className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <span className="font-medium text-left flex-1">{club.name}</span>
                      {poolId && overrides[club.id] && (
                        <span className="text-xs text-muted-foreground">(logo personalizado)</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {showCreateOption && (
              <div className="border-t border-border p-1">
                <button
                  type="button"
                  onClick={handleCreateNew}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                    'hover:bg-primary/10 text-primary',
                    'focus:bg-primary/10 focus:outline-none'
                  )}
                >
                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-medium">
                    Criar "{search.trim()}"
                  </span>
                </button>
              </div>
            )}

            {clubs.length === 0 && !showCreateOption && search.length >= 2 && !isLoading && (
              <div className="p-4 text-center text-muted-foreground text-sm">
                Nenhum clube encontrado
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
