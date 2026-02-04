import { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { 
  Trophy, 
  Smartphone, 
  Target, 
  Flame, 
  Users, 
  User, 
  Rocket,
  Image as ImageIcon,
  Upload,
  X,
  Loader2,
  Pencil,
  Trash2
} from 'lucide-react';
import { CircularLogo } from '@/components/CircularLogo';

interface GalleryImage {
  id: string;
  position: number;
  image_url: string;
  description: string | null;
}

const sections = [
  {
    icon: Trophy,
    title: 'Quem Somos',
    content: `A/O Zapions nasceu muito antes de virar plataforma.

Nasceu da resenha, dos grupos lotados, das discussões pós-jogo e daquela rivalidade saudável entre amigos que todo apaixonado por futebol conhece bem.

Desde 2014, reunimos torcedores de todos os times para debater futebol, criar bolões, organizar competições e jogar fantasy games — sempre com o mesmo objetivo: deixar o esporte mais divertido quando é compartilhado.`
  },
  {
    icon: Smartphone,
    title: 'Nossa origem',
    content: `Tudo começou nos grupos de WhatsApp, numa época em que cada grupo suportava apenas 100 pessoas.
A comunidade cresceu tão rápido que precisávamos criar vários grupos ao mesmo tempo para dar conta de todo mundo.

Depois, levamos a resenha para o Facebook, onde ultrapassamos 25 mil participantes, conectando torcedores do Brasil inteiro.

Entre palpites, rankings, campeonatos e provocações saudáveis, uma coisa ficou clara: o futebol fica muito melhor quando é vivido em grupo.`
  },
  {
    icon: Target,
    title: 'De comunidade para plataforma',
    content: `Com o tempo, os bolões ficaram maiores, as competições mais organizadas e os participantes cada vez mais engajados.

Já foram:
• mais de 500 participantes simultâneos
• mais de 50 competições realizadas
• milhares de palpites registrados

Mas fazer tudo em planilhas, mensagens e controles manuais começou a ficar limitado. Então decidimos criar o Zapions: uma plataforma feita sob medida para organizar bolões, campeonatos, quizzes e fantasy games de forma simples, automática e divertida.`
  },
  {
    icon: Flame,
    title: 'O que acreditamos',
    content: `Acreditamos que futebol é mais do que assistir jogo.

É competir com amigos, zoar no grupo, subir no ranking, disputar até a última rodada e criar histórias para contar depois.

Nossa missão é transformar isso em uma experiência digital completa. Sem complicação. Sem barreiras. Só diversão e competição saudável.`
  },
  {
    icon: Users,
    title: 'Para todos',
    content: `A Zapions é para todo mundo.

Não importa seu time, sua cidade ou sua rivalidade. Aqui o que vale é a paixão pelo futebol, a amizade e a resenha. Porque no fim das contas, o melhor do jogo sempre foi jogar junto.`
  },
  {
    icon: User,
    title: 'Fundador',
    content: `O projeto é liderado por Lucas Mendes, criador da comunidade desde o início, com o objetivo simples e direto: construir a melhor plataforma para organizar campeonatos, bolões e reunir pessoas em torno do futebol.

Sem distinções. Sem exclusões. Só a paixão pelo esporte.`
  },
  {
    icon: Rocket,
    title: 'Hoje',
    content: `Hoje a Zapions evoluiu de grupos para uma plataforma completa onde você pode:

• Criar bolões
• Convidar amigos
• Fazer palpites
• Acompanhar rankings
• Organizar competições
• Viver o futebol de forma mais interativa

E isso é só o começo.`
  },
];

export default function QuemSomos() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [galleryImages, setGalleryImages] = useState<(GalleryImage | null)[]>(Array(12).fill(null));
  const [uploading, setUploading] = useState<number | null>(null);
  const [editingDescription, setEditingDescription] = useState<number | null>(null);
  const [tempDescription, setTempDescription] = useState('');
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      setIsAdmin(!!data);
    };
    checkAdmin();
  }, [user]);

  const handleFileUpload = async (file: File, position: number) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Arquivo inválido', description: 'Apenas imagens são permitidas.', variant: 'destructive' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'Máximo de 5MB permitido.', variant: 'destructive' });
      return;
    }

    setUploading(position);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `gallery-${position}-${Date.now()}.${fileExt}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('quem-somos-gallery')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('quem-somos-gallery')
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;
      
      // Check if position exists
      const existingImage = galleryImages[position - 1];
      
      if (existingImage) {
        // Update existing
        const { error: updateError } = await supabase
          .from('quem_somos_gallery')
          .update({ image_url: imageUrl })
          .eq('id', existingImage.id);
        
        if (updateError) throw updateError;
        
        // Delete old image from storage
        const oldFileName = existingImage.image_url.split('/').pop();
        if (oldFileName) {
          await supabase.storage.from('quem-somos-gallery').remove([oldFileName]);
        }
      } else {
        // Insert new
        const { error: insertError } = await supabase
          .from('quem_somos_gallery')
          .insert({ position, image_url: imageUrl });
        
        if (insertError) throw insertError;
      }

      // Refresh gallery
      const { data: newData } = await supabase
        .from('quem_somos_gallery')
        .select('*')
        .order('position');
      
      if (newData) {
        const images = Array(12).fill(null);
        newData.forEach((img) => {
          if (img.position >= 1 && img.position <= 12) {
            images[img.position - 1] = img;
          }
        });
        setGalleryImages(images);
      }

      toast({ title: 'Imagem enviada!', description: 'A galeria foi atualizada.' });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: 'Erro ao enviar', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(null);
    }
  };

  const handleDeleteImage = async (position: number) => {
    const image = galleryImages[position - 1];
    if (!image) return;

    try {
      // Delete from database
      const { error } = await supabase
        .from('quem_somos_gallery')
        .delete()
        .eq('id', image.id);

      if (error) throw error;

      // Delete from storage
      const fileName = image.image_url.split('/').pop();
      if (fileName) {
        await supabase.storage.from('quem-somos-gallery').remove([fileName]);
      }

      // Update state
      const newImages = [...galleryImages];
      newImages[position - 1] = null;
      setGalleryImages(newImages);

      toast({ title: 'Imagem removida!' });
    } catch (error: any) {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    }
  };

  const handleUpdateDescription = async (position: number) => {
    const image = galleryImages[position - 1];
    if (!image) return;

    const description = tempDescription.slice(0, 50);
    
    try {
      const { error } = await supabase
        .from('quem_somos_gallery')
        .update({ description })
        .eq('id', image.id);

      if (error) throw error;

      // Update state
      const newImages = [...galleryImages];
      newImages[position - 1] = { ...image, description };
      setGalleryImages(newImages);
      setEditingDescription(null);

      toast({ title: 'Descrição atualizada!' });
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    }
  };

  const handleDrop = useCallback((e: React.DragEvent, position: number) => {
    e.preventDefault();
    setDragOver(null);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0], position);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, position: number) => {
    e.preventDefault();
    setDragOver(position);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(null);
  }, []);

  return (
    <Layout>
      <div className="container py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <CircularLogo size={80} className="md:w-[100px] md:h-[100px]" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Quem Somos
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Conheça a história por trás da maior comunidade de bolões esportivos do Brasil
          </p>
        </div>

        {/* Content Sections */}
        <div className="max-w-4xl mx-auto space-y-8">
          {sections.map((section) => (
            <Card key={section.title} className="overflow-hidden">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-start gap-4">
                  <div className="shrink-0">
                    <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                      <section.icon className="h-6 w-6 text-primary-foreground" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl md:text-2xl font-bold mb-4 flex items-center gap-2">
                      {section.title}
                    </h2>
                    <div className="text-muted-foreground whitespace-pre-line leading-relaxed">
                      {section.content}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Gallery Section */}
        <div className="max-w-6xl mx-auto mt-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Nossa Galeria</h2>
            <p className="text-muted-foreground">Momentos que marcaram nossa história</p>
          </div>
          
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {galleryImages.map((image, index) => {
              const position = index + 1;
              const isUploading = uploading === position;
              const isDraggedOver = dragOver === position;
              const isEditingDesc = editingDescription === position;

              return (
                <div key={index} className="group relative">
                  <div 
                    className={`aspect-square rounded-xl overflow-hidden bg-muted border-2 transition-all duration-200 ${
                      isDraggedOver ? 'border-primary border-dashed scale-105' : 'border-dashed border-border'
                    } ${isAdmin ? 'cursor-pointer' : ''}`}
                    onDrop={isAdmin ? (e) => handleDrop(e, position) : undefined}
                    onDragOver={isAdmin ? (e) => handleDragOver(e, position) : undefined}
                    onDragLeave={isAdmin ? handleDragLeave : undefined}
                  >
                    {isUploading ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin mb-2" />
                        <span className="text-xs">Enviando...</span>
                      </div>
                    ) : image ? (
                      <>
                        <img 
                          src={image.image_url} 
                          alt={image.description || `Imagem ${position}`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        {/* Admin overlay */}
                        {isAdmin && (
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <label className="cursor-pointer">
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleFileUpload(file, position);
                                }}
                              />
                              <div className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
                                <Upload className="h-5 w-5 text-white" />
                              </div>
                            </label>
                            <button
                              onClick={() => {
                                setEditingDescription(position);
                                setTempDescription(image.description || '');
                              }}
                              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                            >
                              <Pencil className="h-5 w-5 text-white" />
                            </button>
                            <button
                              onClick={() => handleDeleteImage(position)}
                              className="p-2 bg-red-500/50 rounded-lg hover:bg-red-500/70 transition-colors"
                            >
                              <Trash2 className="h-5 w-5 text-white" />
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                        {isAdmin ? (
                          <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center hover:bg-muted/50 transition-colors">
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file, position);
                              }}
                            />
                            <Upload className="h-8 w-8 mb-2 opacity-50" />
                            <span className="text-xs opacity-50">Clique ou arraste</span>
                          </label>
                        ) : (
                          <>
                            <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
                            <span className="text-xs opacity-50">Imagem {position}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Description */}
                  {isEditingDesc && isAdmin ? (
                    <div className="mt-2 flex gap-1">
                      <Input
                        value={tempDescription}
                        onChange={(e) => setTempDescription(e.target.value.slice(0, 50))}
                        placeholder="Descrição (máx 50)"
                        className="text-xs h-8"
                        maxLength={50}
                      />
                      <Button 
                        size="sm" 
                        className="h-8 px-2"
                        onClick={() => handleUpdateDescription(position)}
                      >
                        OK
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 px-2"
                        onClick={() => setEditingDescription(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : image?.description ? (
                    <p className="mt-2 text-sm text-center text-muted-foreground line-clamp-2">
                      {image.description}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}
