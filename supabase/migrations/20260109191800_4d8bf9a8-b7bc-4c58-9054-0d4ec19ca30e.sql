-- 1. Adicionar novo role 'mestre_bolao' ao enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'mestre_bolao';