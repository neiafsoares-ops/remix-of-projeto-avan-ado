import { supabase } from '@/integrations/supabase/client';

/**
 * Notifica todos os participantes ativos de um bolão sobre uma nova rodada
 */
export async function notifyNewRoundCreated(
  poolId: string,
  poolName: string,
  roundName: string,
  excludeUserId?: string // Para não notificar o criador
): Promise<{ success: boolean; notifiedCount: number }> {
  try {
    // Buscar participantes ativos do bolão
    const { data: participants, error: participantsError } = await supabase
      .from('pool_participants')
      .select('user_id')
      .eq('pool_id', poolId)
      .eq('status', 'active');

    if (participantsError) {
      console.error('Error fetching participants:', participantsError);
      return { success: false, notifiedCount: 0 };
    }

    if (!participants || participants.length === 0) {
      return { success: true, notifiedCount: 0 };
    }

    // Filtrar o criador se especificado
    const userIds = participants
      .map(p => p.user_id)
      .filter(id => id !== excludeUserId);

    if (userIds.length === 0) {
      return { success: true, notifiedCount: 0 };
    }

    // Criar notificações em lote
    const notifications = userIds.map(userId => ({
      user_id: userId,
      type: 'new_round',
      title: 'Nova rodada disponível!',
      message: `${roundName} foi criada no bolão "${poolName}". Faça seus palpites!`,
      data: { pool_id: poolId, round_name: roundName },
    }));

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (insertError) {
      console.error('Error inserting notifications:', insertError);
      return { success: false, notifiedCount: 0 };
    }

    return { success: true, notifiedCount: userIds.length };
  } catch (error) {
    console.error('Error in notifyNewRoundCreated:', error);
    return { success: false, notifiedCount: 0 };
  }
}

/**
 * Notifica todos os participantes de um Quiz sobre uma nova rodada
 */
export async function notifyNewQuizRoundCreated(
  quizId: string,
  quizName: string,
  roundName: string,
  excludeUserId?: string
): Promise<{ success: boolean; notifiedCount: number }> {
  try {
    // Buscar participantes do quiz
    const { data: participants, error: participantsError } = await supabase
      .from('quiz_participants')
      .select('user_id')
      .eq('quiz_id', quizId)
      .eq('status', 'active');

    if (participantsError) {
      console.error('Error fetching quiz participants:', participantsError);
      return { success: false, notifiedCount: 0 };
    }

    if (!participants || participants.length === 0) {
      return { success: true, notifiedCount: 0 };
    }

    const userIds = participants
      .map(p => p.user_id)
      .filter(id => id !== excludeUserId);

    if (userIds.length === 0) {
      return { success: true, notifiedCount: 0 };
    }

    const notifications = userIds.map(userId => ({
      user_id: userId,
      type: 'new_round',
      title: 'Nova rodada do Quiz!',
      message: `${roundName} está disponível no "${quizName}". Responda as perguntas!`,
      data: { quiz_id: quizId, round_name: roundName },
    }));

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (insertError) {
      console.error('Error inserting quiz notifications:', insertError);
      return { success: false, notifiedCount: 0 };
    }

    return { success: true, notifiedCount: userIds.length };
  } catch (error) {
    console.error('Error in notifyNewQuizRoundCreated:', error);
    return { success: false, notifiedCount: 0 };
  }
}

/**
 * Notifica todos os participantes do Time Mestre sobre uma nova rodada
 */
export async function notifyNewTorcidaMestreRoundCreated(
  poolId: string,
  poolName: string,
  roundName: string,
  opponentName: string,
  excludeUserId?: string
): Promise<{ success: boolean; notifiedCount: number }> {
  try {
    // Buscar participantes ativos do Time Mestre (qualquer rodada anterior)
    const { data: participants, error: participantsError } = await supabase
      .from('torcida_mestre_participants')
      .select('user_id')
      .eq('pool_id', poolId)
      .eq('status', 'active');

    if (participantsError) {
      console.error('Error fetching torcida mestre participants:', participantsError);
      return { success: false, notifiedCount: 0 };
    }

    if (!participants || participants.length === 0) {
      return { success: true, notifiedCount: 0 };
    }

    // Remover duplicatas e excluir criador
    const userIds = [...new Set(participants.map(p => p.user_id))]
      .filter(id => id !== excludeUserId);

    if (userIds.length === 0) {
      return { success: true, notifiedCount: 0 };
    }

    const notifications = userIds.map(userId => ({
      user_id: userId,
      type: 'new_round',
      title: 'Novo jogo no Time Mestre!',
      message: `${roundName} contra ${opponentName} foi criada no "${poolName}". Solicite participação!`,
      data: { pool_id: poolId, round_name: roundName, opponent: opponentName },
    }));

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (insertError) {
      console.error('Error inserting torcida mestre notifications:', insertError);
      return { success: false, notifiedCount: 0 };
    }

    return { success: true, notifiedCount: userIds.length };
  } catch (error) {
    console.error('Error in notifyNewTorcidaMestreRoundCreated:', error);
    return { success: false, notifiedCount: 0 };
  }
}
