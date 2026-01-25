-- =============================================================================
-- MIGRATION: Create Mestre Plans and Subscriptions System
-- =============================================================================
-- This migration creates the infrastructure for the tiered Mestre subscription system.
-- Run this SQL in your Supabase SQL Editor to set up the tables and functions.
-- =============================================================================

-- 1. Create enum for mestre plan types
CREATE TYPE public.mestre_plan_type AS ENUM ('iniciante', 'intermediario', 'supremo');

-- 2. Create mestre_plans table with plan configurations
CREATE TABLE public.mestre_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_type mestre_plan_type NOT NULL UNIQUE,
    name TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    duration_days INTEGER NOT NULL,
    pool_limit INTEGER, -- NULL means unlimited
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Insert the three plans
INSERT INTO public.mestre_plans (plan_type, name, price, duration_days, pool_limit) VALUES
    ('iniciante', 'Mestre Iniciante', 14.90, 90, 3),
    ('intermediario', 'Mestre Intermediário', 29.80, 180, 8),
    ('supremo', 'Mestre Supremo', 47.90, 365, NULL);

-- 4. Create mestre_subscriptions table
CREATE TABLE public.mestre_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.mestre_plans(id),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN GENERATED ALWAYS AS (expires_at > now()) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Create indexes for faster lookups
CREATE INDEX idx_mestre_subscriptions_user_id ON public.mestre_subscriptions(user_id);
CREATE INDEX idx_mestre_subscriptions_expires_at ON public.mestre_subscriptions(expires_at);

-- 6. Enable RLS on both tables
ALTER TABLE public.mestre_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mestre_subscriptions ENABLE ROW LEVEL SECURITY;

-- 7. RLS policies for mestre_plans (everyone can read plans)
CREATE POLICY "Everyone can view plans"
ON public.mestre_plans FOR SELECT
USING (true);

-- Only admins can manage plans
CREATE POLICY "Admins can manage plans"
ON public.mestre_plans FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 8. RLS policies for mestre_subscriptions
CREATE POLICY "Users can view their own subscriptions"
ON public.mestre_subscriptions FOR SELECT
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage subscriptions"
ON public.mestre_subscriptions FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 9. Function to count user's active pools
CREATE OR REPLACE FUNCTION public.count_user_active_pools(_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(COUNT(*)::INTEGER, 0)
    FROM public.pools
    WHERE created_by = _user_id;
$$;

-- 10. Function to get user's active subscription with plan details
CREATE OR REPLACE FUNCTION public.get_user_mestre_subscription(_user_id UUID)
RETURNS TABLE (
    subscription_id UUID,
    plan_type mestre_plan_type,
    plan_name TEXT,
    pool_limit INTEGER,
    started_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        s.id as subscription_id,
        p.plan_type,
        p.name as plan_name,
        p.pool_limit,
        s.started_at,
        s.expires_at,
        s.is_active
    FROM public.mestre_subscriptions s
    JOIN public.mestre_plans p ON s.plan_id = p.id
    WHERE s.user_id = _user_id
    AND s.expires_at > now()
    ORDER BY s.expires_at DESC
    LIMIT 1;
$$;

-- 11. Function to check if user can create a new pool
CREATE OR REPLACE FUNCTION public.can_user_create_pool(_user_id UUID)
RETURNS TABLE (
    can_create BOOLEAN,
    reason TEXT,
    current_pools INTEGER,
    pool_limit INTEGER,
    plan_type mestre_plan_type,
    plan_expired BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_is_mestre BOOLEAN;
    v_subscription RECORD;
    v_active_pools INTEGER;
BEGIN
    -- Check if user is admin (admins have unlimited access)
    v_is_admin := public.has_role(_user_id, 'admin');
    
    IF v_is_admin THEN
        RETURN QUERY SELECT 
            TRUE,
            'Administrador tem acesso ilimitado'::TEXT,
            0,
            NULL::INTEGER,
            NULL::mestre_plan_type,
            FALSE;
        RETURN;
    END IF;
    
    -- Check if user has mestre_bolao role
    v_is_mestre := public.has_role(_user_id, 'mestre_bolao');
    
    -- Get user's active subscription
    SELECT * INTO v_subscription 
    FROM public.get_user_mestre_subscription(_user_id);
    
    -- Count active pools
    v_active_pools := public.count_user_active_pools(_user_id);
    
    -- If has mestre role but no subscription (legacy or pending setup)
    IF v_is_mestre AND v_subscription.subscription_id IS NULL THEN
        RETURN QUERY SELECT 
            TRUE,
            'Mestre do Bolão - permissão concedida'::TEXT,
            v_active_pools,
            NULL::INTEGER,
            NULL::mestre_plan_type,
            FALSE;
        RETURN;
    END IF;
    
    -- If no active subscription and not mestre, deny
    IF v_subscription.subscription_id IS NULL THEN
        RETURN QUERY SELECT 
            FALSE,
            'Você precisa de um plano Mestre para criar bolões'::TEXT,
            v_active_pools,
            0,
            NULL::mestre_plan_type,
            FALSE;
        RETURN;
    END IF;
    
    -- If plan has no limit (supremo), allow
    IF v_subscription.pool_limit IS NULL THEN
        RETURN QUERY SELECT 
            TRUE,
            'Plano Supremo: bolões ilimitados'::TEXT,
            v_active_pools,
            NULL::INTEGER,
            v_subscription.plan_type,
            FALSE;
        RETURN;
    END IF;
    
    -- Check if under the limit
    IF v_active_pools < v_subscription.pool_limit THEN
        RETURN QUERY SELECT 
            TRUE,
            format('Você pode criar mais %s bolão(ões)', v_subscription.pool_limit - v_active_pools)::TEXT,
            v_active_pools,
            v_subscription.pool_limit,
            v_subscription.plan_type,
            FALSE;
    ELSE
        RETURN QUERY SELECT 
            FALSE,
            format('Limite de %s bolões atingido. Faça upgrade para criar mais.', v_subscription.pool_limit)::TEXT,
            v_active_pools,
            v_subscription.pool_limit,
            v_subscription.plan_type,
            FALSE;
    END IF;
    
    RETURN;
END;
$$;

-- 12. Helper function to grant mestre subscription (for admin use)
CREATE OR REPLACE FUNCTION public.grant_mestre_subscription(
    _user_id UUID,
    _plan_type mestre_plan_type
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_plan_id UUID;
    v_duration_days INTEGER;
    v_subscription_id UUID;
BEGIN
    -- Get plan details
    SELECT id, duration_days INTO v_plan_id, v_duration_days
    FROM public.mestre_plans
    WHERE plan_type = _plan_type;
    
    IF v_plan_id IS NULL THEN
        RAISE EXCEPTION 'Plan type % not found', _plan_type;
    END IF;
    
    -- Insert subscription
    INSERT INTO public.mestre_subscriptions (user_id, plan_id, expires_at)
    VALUES (_user_id, v_plan_id, now() + (v_duration_days || ' days')::INTERVAL)
    RETURNING id INTO v_subscription_id;
    
    -- Also grant mestre_bolao role if not already present
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'mestre_bolao')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RETURN v_subscription_id;
END;
$$;

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
