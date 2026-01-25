import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Link2, Copy, Check, Loader2, RefreshCw } from 'lucide-react';
import { usePoolInvitations } from '@/hooks/use-pool-invitations';
import { toast } from 'sonner';

interface ShareInviteLinkProps {
  poolId: string;
}

export function ShareInviteLink({ poolId }: ShareInviteLinkProps) {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const { generateShareableLink } = usePoolInvitations(poolId);

  const handleGenerateLink = async () => {
    setGenerating(true);
    const generatedLink = await generateShareableLink();
    setLink(generatedLink);
    setGenerating(false);
  };

  const handleCopy = async () => {
    if (!link) return;
    
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Erro ao copiar link');
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Reset state when closing
      setLink(null);
      setCopied(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Link2 className="h-4 w-4 mr-2" />
          Link de Convite
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Link de Convite</h4>
            <p className="text-sm text-muted-foreground">
              Gere um link para compartilhar e convidar pessoas para o bolão.
            </p>
          </div>

          {!link ? (
            <Button 
              onClick={handleGenerateLink} 
              className="w-full"
              disabled={generating}
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4 mr-2" />
                  Gerar Link
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input 
                  value={link} 
                  readOnly 
                  className="text-xs"
                />
                <Button 
                  size="icon" 
                  variant="outline"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Válido por 7 dias</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleGenerateLink}
                  disabled={generating}
                  className="h-auto p-1"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${generating ? 'animate-spin' : ''}`} />
                  Gerar novo
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
