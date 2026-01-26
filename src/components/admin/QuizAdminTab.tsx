import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { useToast } from '@/hooks/use-toast';
import { CreateQuizDialog } from './CreateQuizDialog';
import { formatBRL } from '@/lib/prize-utils';
import { formatDateBR } from '@/lib/date-utils';
import { 
  Target, 
  Plus, 
  Settings, 
  Trash2, 
  Power, 
  PowerOff,
  Loader2,
  Users
} from 'lucide-react';

interface QuizWithDetails {
  id: string;
  name: string;
  description: string | null;
  entry_fee: number;
  admin_fee_percent: number | null;
  accumulated_prize: number;
  is_active: boolean;
  is_public: boolean;
  created_at: string;
  participant_count: number;
  creator_public_id?: string;
}

export function QuizAdminTab() {
  const { toast } = useToast();
  const [quizzes, setQuizzes] = useState<QuizWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);

      const { data: quizzesData, error } = await supabase
        .from('quizzes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enriquecer com contagem de participantes e criador
      const enriched = await Promise.all((quizzesData || []).map(async (quiz) => {
        const { count } = await supabase
          .from('quiz_participants')
          .select('*', { count: 'exact', head: true })
          .eq('quiz_id', quiz.id);

        let creatorPublicId = null;
        if (quiz.created_by) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('public_id')
            .eq('id', quiz.created_by)
            .maybeSingle();
          creatorPublicId = profile?.public_id;
        }

        return {
          ...quiz,
          participant_count: count || 0,
          creator_public_id: creatorPublicId,
        };
      }));

      setQuizzes(enriched);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (quizId: string, currentStatus: boolean) => {
    setActionLoading(`toggle-${quizId}`);
    try {
      const { error } = await supabase
        .from('quizzes')
        .update({ is_active: !currentStatus })
        .eq('id', quizId);

      if (error) throw error;

      toast({
        title: 'Status atualizado!',
        description: `O quiz foi ${!currentStatus ? 'ativado' : 'desativado'}.`,
      });

      await fetchQuizzes();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar o status.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    setActionLoading(`delete-${quizId}`);
    try {
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', quizId);

      if (error) throw error;

      toast({
        title: 'Quiz excluído!',
        description: 'O quiz foi removido com sucesso.',
      });

      await fetchQuizzes();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível excluir o quiz.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-accent" />
              Gestão de Quizzes
            </CardTitle>
            <CardDescription>
              Crie e gerencie os quizzes do sistema
            </CardDescription>
          </div>
          <CreateQuizDialog onSuccess={fetchQuizzes}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Criar Quiz
            </Button>
          </CreateQuizDialog>
        </div>
      </CardHeader>
      <CardContent>
        {quizzes.length === 0 ? (
          <div className="text-center py-12">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum quiz criado</h3>
            <p className="text-muted-foreground mb-4">
              Clique no botão acima para criar o primeiro quiz.
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quiz</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Taxa</TableHead>
                  <TableHead>Participantes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quizzes.map((quiz) => (
                  <TableRow key={quiz.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{quiz.name}</p>
                        {quiz.creator_public_id && (
                          <p className="text-sm text-muted-foreground">
                            por @{quiz.creator_public_id}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {quiz.entry_fee > 0 ? formatBRL(quiz.entry_fee) : 'Grátis'}
                    </TableCell>
                    <TableCell>
                      {quiz.admin_fee_percent || 0}%
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {quiz.participant_count}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={quiz.is_active ? 'default' : 'secondary'}>
                        {quiz.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatDateBR(quiz.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/quiz/${quiz.id}/manage`}>
                            <Settings className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(quiz.id, quiz.is_active)}
                          disabled={actionLoading === `toggle-${quiz.id}`}
                        >
                          {actionLoading === `toggle-${quiz.id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : quiz.is_active ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir Quiz</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir "{quiz.name}"? 
                                Esta ação é irreversível e removerá todas as rodadas, perguntas e respostas.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteQuiz(quiz.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {actionLoading === `delete-${quiz.id}` ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : null}
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
    </Card>
  );
}
