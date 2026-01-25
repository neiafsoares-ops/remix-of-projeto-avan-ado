-- Criar bucket público para imagens de times
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-images', 'team-images', true);

-- Política: Qualquer pessoa pode visualizar as imagens
CREATE POLICY "Imagens de times são públicas"
ON storage.objects FOR SELECT
USING (bucket_id = 'team-images');

-- Política: Usuários autenticados podem fazer upload
CREATE POLICY "Usuários autenticados podem fazer upload de imagens"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'team-images');

-- Política: Usuários autenticados podem atualizar suas imagens
CREATE POLICY "Usuários autenticados podem atualizar imagens"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'team-images');

-- Política: Apenas admins podem deletar imagens
CREATE POLICY "Apenas admins podem deletar imagens"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'team-images' 
  AND public.has_role(auth.uid(), 'admin')
);