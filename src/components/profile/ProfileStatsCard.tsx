import { Trophy, Medal, Award, Users, Crown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ProductStats {
  administered: number;
  participated: number;
  first: number;
  second: number;
  third: number;
}

interface ProfileStatsCardProps {
  title: string;
  icon: React.ReactNode;
  stats: ProductStats;
  accentColor?: string;
}

export function ProfileStatsCard({ title, icon, stats, accentColor = 'bg-accent' }: ProfileStatsCardProps) {
  const hasAnyData = stats.administered > 0 || stats.participated > 0 || 
                     stats.first > 0 || stats.second > 0 || stats.third > 0;
  
  if (!hasAnyData) return null;

  const statItems = [
    { label: 'Administrou', value: stats.administered, icon: <Crown className="w-4 h-4 text-primary" /> },
    { label: 'Participou', value: stats.participated, icon: <Users className="w-4 h-4 text-muted-foreground" /> },
    { label: '1º Lugar', value: stats.first, icon: <Trophy className="w-4 h-4 text-accent" /> },
    { label: '2º Lugar', value: stats.second, icon: <Medal className="w-4 h-4 text-muted-foreground" /> },
    { label: '3º Lugar', value: stats.third, icon: <Award className="w-4 h-4 text-primary/70" /> },
  ].filter(item => item.value > 0);

  return (
    <Card className="overflow-hidden">
      <CardHeader className={cn("py-3 px-4", accentColor)}>
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-accent-foreground">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-3">
          {statItems.map((item) => (
            <div 
              key={item.label}
              className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2"
            >
              {item.icon}
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className="font-bold text-foreground">{item.value}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
