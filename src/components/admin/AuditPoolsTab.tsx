import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, 
  ClipboardCheck, 
  Users, 
  Calendar, 
  Trophy,
  Lock,
  CheckCircle2,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { AuditPoolDetail } from './AuditPoolDetail';

interface AuditPoolInfo {
  id: string;
  name: string;
  created_by: string;
  creator_public_id: string;
  is_active: boolean;
  created_at: string;
  participant_count: number;
  rounds_count: number;
  matches_count: number;
  finalized_rounds_count: number;
  finished_matches_count: number;
  format: 'standard' | 'cup' | 'knockout';
}

export function AuditPoolsTab() {
  const [pools, setPools] = useState<AuditPoolInfo[]>([]);
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [formatFilter, setFormatFilter] = useState<'all' | 'standard' | 'cup' | 'knockout'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPools();
  }, []);

  const fetchPools = async () => {
    setLoading(true);
    try {
      // Fetch all pools with participant count
      const { data: poolsData, error: poolsError } = await supabase
        .from('pools')
        .select('*, pool_participants(count)')
        .order('created_at', { ascending: false });

      if (poolsError) throw poolsError;
      if (!poolsData) return;

      // Get creator profiles
      const creatorIds = [...new Set(poolsData.map(p => p.created_by).filter(Boolean))];
      const { data: creators } = await supabase
        .from('profiles')
        .select('id, public_id')
        .in('id', creatorIds);

      // Get rounds for each pool
      const poolIds = poolsData.map(p => p.id);
      const { data: rounds } = await supabase
        .from('rounds')
        .select('id, pool_id, is_finalized')
        .in('pool_id', poolIds);

      // Get matches for each pool
      const { data: matches } = await supabase
        .from('matches')
        .select('id, pool_id, is_finished, round_id')
        .in('pool_id', poolIds);

      // Process pools with all details
      const poolsWithDetails: AuditPoolInfo[] = poolsData.map(pool => {
        const poolRounds = rounds?.filter(r => r.pool_id === pool.id) || [];
        const poolMatches = matches?.filter(m => m.pool_id === pool.id) || [];
        
        // Detect format based on round names
        const roundNames = poolRounds.map(r => {
          const fullRound = rounds?.find(fr => fr.id === r.id);
          return fullRound;
        });
        
        // Simple format detection - this could be enhanced
        let format: 'standard' | 'cup' | 'knockout' = 'standard';
        
        // If any round has \"Grupo\" in name, it's cup format
        // If has knockout rounds but no groups, it's knockout
        // Otherwise standard
        
        return {
          id: pool.id,
          name: pool.name,
          created_by: pool.created_by || '',
          creator_public_id: creators?.find(c => c.id === pool.created_by)?.public_id || 'Desconhecido',
          is_active: pool.is_active ?? true,
          created_at: pool.created_at,
          participant_count: pool.pool_participants?.[0]?.count || 0,
          rounds_count: poolRounds.length,
          matches_count: poolMatches.length,
          finalized_rounds_count: poolRounds.filter(r => r.is_finalized).length,
          finished_matches_count: poolMatches.filter(m => m.is_finished).length,
          format,
        };
      });

      setPools(poolsWithDetails);
    } catch (error) {
      console.error('Error fetching pools for audit:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPools = pools.filter(pool => {
    const matchesSearch = 
      pool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pool.creator_public_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && pool.is_active) ||
      (statusFilter === 'inactive' && !pool.is_active);
    
    const matchesFormat = 
      formatFilter === 'all' || pool.format === formatFilter;

    return matchesSearch && matchesStatus && matchesFormat;
  });

  if (selectedPoolId) {
    return (
      <AuditPoolDetail 
        poolId={selectedPoolId} 
        onBack={() => setSelectedPoolId(null)} 
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          Auditoria de Bolões
        </CardTitle>
        <CardDescription>
          Selecione um bolão para visualizar e editar sua estrutura
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar bolão..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={formatFilter} onValueChange={(v: any) => setFormatFilter(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Formato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="standard">Padrão</SelectItem>
              <SelectItem value="cup">Copa</SelectItem>
              <SelectItem value="knockout">Mata-mata</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Pool List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredPools.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum bolão encontrado.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPools.map((pool) => (
              <div
                key={pool.id}
                className="border rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold">{pool.name}</h3>
                      <span className="text-sm text-muted-foreground">@{pool.creator_public_id}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {pool.participant_count} participantes
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {pool.rounds_count} rodadas
                      </span>
                      <span className="flex items-center gap-1">
                        <Trophy className="h-3.5 w-3.5" />
                        {pool.matches_count} jogos
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm">
                      <span className="flex items-center gap-1 text-amber-600">
                        <Lock className="h-3.5 w-3.5" />
                        {pool.finalized_rounds_count} rodadas finalizadas
                      </span>
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {pool.finished_matches_count} jogos encerrados
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Badge variant={pool.format === 'cup' ? 'default' : 'secondary'}>
                        {pool.format === 'cup' ? 'Copa' : pool.format === 'knockout' ? 'Mata-mata' : 'Padrão'}
                      </Badge>
                      <Badge variant={pool.is_active ? 'default' : 'outline'}>
                        {pool.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedPoolId(pool.id)}
                    className="shrink-0"
                  >
                    Auditar
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
