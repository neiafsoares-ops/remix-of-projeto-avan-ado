import { format, formatDistanceToNow, isAfter, isBefore, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';

// Fuso horário do Brasil (São Paulo)
export const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

/**
 * Converte uma data UTC para o horário de Brasília
 */
export function toBrazilTime(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return toZonedTime(dateObj, BRAZIL_TIMEZONE);
}

/**
 * Formata uma data no padrão brasileiro (dd/MM/yyyy)
 */
export function formatDateBR(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(dateObj, BRAZIL_TIMEZONE, 'dd/MM/yyyy', { locale: ptBR });
}

/**
 * Formata uma data e hora no padrão brasileiro (dd/MM/yyyy às HH:mm)
 */
export function formatDateTimeBR(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(dateObj, BRAZIL_TIMEZONE, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

/**
 * Formata uma data por extenso em português (ex: 10 de janeiro de 2025)
 */
export function formatDateLongBR(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(dateObj, BRAZIL_TIMEZONE, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

/**
 * Formata uma data por extenso curta em português (ex: 10 de janeiro)
 */
export function formatDateShortBR(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(dateObj, BRAZIL_TIMEZONE, "dd 'de' MMMM", { locale: ptBR });
}

/**
 * Formata apenas o mês e ano em português (ex: janeiro de 2025)
 */
export function formatMonthYearBR(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(dateObj, BRAZIL_TIMEZONE, "MMMM 'de' yyyy", { locale: ptBR });
}

/**
 * Formata hora apenas (HH:mm)
 */
export function formatTimeBR(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(dateObj, BRAZIL_TIMEZONE, 'HH:mm', { locale: ptBR });
}

/**
 * Retorna texto relativo (ex: "há 2 horas", "em 3 dias")
 */
export function formatRelativeTimeBR(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const brazilDate = toBrazilTime(dateObj);
  return formatDistanceToNow(brazilDate, { addSuffix: true, locale: ptBR });
}

/**
 * Verifica se a data está antes do prazo (deadline não passou)
 */
export function isBeforeDeadline(deadline: Date | string): boolean {
  const deadlineDate = typeof deadline === 'string' ? parseISO(deadline) : deadline;
  const now = new Date();
  return isBefore(now, deadlineDate);
}

/**
 * Verifica se a data está após o prazo (deadline passou)
 */
export function isAfterDeadline(deadline: Date | string): boolean {
  const deadlineDate = typeof deadline === 'string' ? parseISO(deadline) : deadline;
  const now = new Date();
  return isAfter(now, deadlineDate);
}

/**
 * Obtém a data atual no horário de Brasília
 */
export function getNowBrazil(): Date {
  return toBrazilTime(new Date());
}

/**
 * Formata uma data para o formato datetime-local (YYYY-MM-DDTHH:mm)
 * usando horário LOCAL (não UTC) - para uso em inputs datetime-local
 */
export function formatToDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
