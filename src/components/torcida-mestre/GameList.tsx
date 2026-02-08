import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GameCard } from './GameCard';
import { Trophy, History } from 'lucide-react';
import type { TorcidaMestreGameWithRounds } from '@/types/torcida-mestre';

interface GameListProps {
  games: TorcidaMestreGameWithRounds[];
  selectedGameId?: string;
  onGameSelect: (game: TorcidaMestreGameWithRounds) => void;
}

export function GameList({ games, selectedGameId, onGameSelect }: GameListProps) {
  const activeGames = games.filter(g => !g.is_finished);
  const finishedGames = games.filter(g => g.is_finished);

  if (games.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum jogo criado ainda</p>
          <p className="text-sm text-muted-foreground mt-1">
            Crie o primeiro jogo para começar a adicionar rodadas
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="active" className="w-full">
      <TabsList className="w-full grid grid-cols-2">
        <TabsTrigger value="active" className="flex items-center gap-2">
          <Trophy className="h-4 w-4" />
          Ativos ({activeGames.length})
        </TabsTrigger>
        <TabsTrigger value="history" className="flex items-center gap-2">
          <History className="h-4 w-4" />
          Histórico ({finishedGames.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="active" className="mt-4">
        {activeGames.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Nenhum jogo ativo</p>
              <p className="text-sm text-muted-foreground mt-1">
                Crie um novo jogo para iniciar
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeGames.map(game => (
              <GameCard
                key={game.id}
                game={game}
                isSelected={selectedGameId === game.id}
                onClick={() => onGameSelect(game)}
              />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="history" className="mt-4">
        {finishedGames.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <History className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-muted-foreground">Nenhum jogo finalizado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {finishedGames.map(game => (
              <GameCard
                key={game.id}
                game={game}
                isSelected={selectedGameId === game.id}
                onClick={() => onGameSelect(game)}
              />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
