import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuizQuestion {
  id: string;
  question_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string | null;
  option_d: string | null;
  option_e: string | null;
  correct_answer: string | null;
  is_hidden?: boolean;
}

interface QuizAnswer {
  question_id: string;
  selected_answer: string;
  is_correct: boolean | null;
}

interface QuizCarouselViewProps {
  questions: QuizQuestion[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  answers?: Record<string, string>;
  savedAnswers?: QuizAnswer[];
  onAnswerChange?: (questionId: string, answer: string) => void;
  disabled?: boolean;
  previewMode?: boolean;
  showResults?: boolean;
  onComplete?: () => void;
  completeCTA?: string;
}

export function QuizCarouselView({
  questions,
  currentIndex,
  onIndexChange,
  answers = {},
  savedAnswers = [],
  onAnswerChange,
  disabled = false,
  previewMode = false,
  showResults = false,
  onComplete,
  completeCTA = 'Finalizar',
}: QuizCarouselViewProps) {
  const question = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const isFirstQuestion = currentIndex === 0;

  const handleNext = () => {
    if (!isLastQuestion) {
      onIndexChange(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstQuestion) {
      onIndexChange(currentIndex - 1);
    }
  };

  if (!question) return null;

  const savedAnswer = savedAnswers.find(a => a.question_id === question.id);
  const isCorrect = savedAnswer?.is_correct;
  const showResultForQuestion = showResults && question.correct_answer;

  return (
    <div className="space-y-4">
      {/* Progress Dots */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-sm text-muted-foreground">
          Pergunta {currentIndex + 1} de {questions.length}
        </span>
      </div>
      <div className="flex gap-1 justify-center">
        {questions.map((q, idx) => (
          <button
            key={q.id}
            onClick={() => onIndexChange(idx)}
            className={cn(
              "w-2.5 h-2.5 rounded-full transition-all",
              idx === currentIndex
                ? "bg-primary w-6"
                : answers[q.id]
                ? "bg-primary/50"
                : "bg-muted hover:bg-muted-foreground/30"
            )}
            aria-label={`Ir para pergunta ${idx + 1}`}
          />
        ))}
      </div>

      {/* Question Card */}
      <Card className={cn(
        "transition-all",
        showResultForQuestion && (isCorrect ? 'border-green-500/50' : 'border-destructive/50')
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className={cn(
              "text-base md:text-lg font-medium",
              previewMode && question.is_hidden && "blur-sm select-none"
            )}>
              {currentIndex + 1}. {question.question_text}
            </CardTitle>
            {showResultForQuestion && (
              isCorrect ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive shrink-0" />
              )
            )}
          </div>
          {previewMode && question.is_hidden && (
            <p className="text-center text-sm text-muted-foreground mt-2">
              Esta pergunta está oculta. Participe do quiz para visualizá-la!
            </p>
          )}
        </CardHeader>
        <CardContent>
        {previewMode && question.is_hidden ? (
            // Preview mode with hidden question - show blurred options
            <div className="space-y-2">
              {['a', 'b', 'c', 'd', 'e'].map((option) => {
                const optionText = question[`option_${option}` as keyof QuizQuestion] as string | null;
                if (!optionText) return null;

                return (
                  <div
                    key={option}
                    className="p-3 rounded-lg border bg-muted/30"
                  >
                    <span className="font-medium mr-2">{option.toUpperCase()})</span>
                    <span className="blur-sm select-none">{optionText}</span>
                  </div>
                );
              })}
              <p className="text-center text-sm text-muted-foreground mt-4">
                As opções estão ocultas. Participe do quiz para responder!
              </p>
            </div>
          ) : (
            // Normal mode - show radio options
            <RadioGroup
              value={answers[question.id] || ''}
              onValueChange={(value) => onAnswerChange?.(question.id, value)}
              disabled={disabled}
              className="space-y-2"
            >
              {['a', 'b', 'c', 'd', 'e'].map((option) => {
                const optionText = question[`option_${option}` as keyof QuizQuestion] as string | null;
                if (!optionText) return null;

                const isCorrectOption = showResultForQuestion && question.correct_answer === option;
                const isSelectedWrong = showResultForQuestion && savedAnswer?.selected_answer === option && !isCorrect;

                return (
                  <div
                    key={option}
                    className={cn(
                      "flex items-center space-x-3 p-3 rounded-lg border transition-colors",
                      isCorrectOption
                        ? 'bg-green-500/10 border-green-500/50'
                        : isSelectedWrong
                        ? 'bg-destructive/10 border-destructive/50'
                        : answers[question.id] === option
                        ? 'bg-primary/10 border-primary/50'
                        : 'hover:bg-muted/50'
                    )}
                  >
                    <RadioGroupItem value={option} id={`carousel-${question.id}-${option}`} />
                    <Label
                      htmlFor={`carousel-${question.id}-${option}`}
                      className="flex-1 cursor-pointer"
                    >
                      <span className="font-medium mr-2">{option.toUpperCase()})</span>
                      {optionText}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={isFirstQuestion}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Anterior
        </Button>

        {isLastQuestion && onComplete ? (
          <Button variant="hero" onClick={onComplete}>
            {completeCTA}
          </Button>
        ) : (
          <Button
            variant="default"
            onClick={handleNext}
            disabled={isLastQuestion}
          >
            Próxima
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
