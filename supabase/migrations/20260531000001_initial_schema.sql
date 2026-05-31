-- =============================================================================
-- Catálogo de Moda — Schema inicial Supabase
-- =============================================================================
-- Tabelas, índices, triggers, funções auxiliares e RLS policies.
--
-- Ordem de execução (importante por dependências):
--   1. Funções auxiliares (set_updated_at, is_super_admin, is_brand_admin_of)
--   2. Tabela profiles (referencia auth.users)
--   3. Tabela brands
--   4. FK profiles.brand_id → brands.id (agora que brands existe)
--   5. Tabela categories (referencia brands)
--   6. Tabela products (referencia brands + categories)
--   7. Tabela orders (referencia brands)
--   8. Tabela configs (referencia brands)
--   9. Trigger on_auth_user_created (auto-cria profile no signup)
--  10. RLS enable + policies
--
-- Roles:
--   super_admin → augustocross87@gmail.com (identificado pelo email no signup)
--   brand_admin → vinculado a uma marca via profiles.brand_id
--   anon        → visitante público (lê catálogo, cria pedido)
--
-- Tudo é idempotente (CREATE IF NOT EXISTS / CREATE OR REPLACE) onde possível.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. EXTENSÕES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- para gen_random_uuid()


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. FUNÇÕES AUXILIARES
-- ─────────────────────────────────────────────────────────────────────────────

-- Trigger genérico para atualizar updated_at em qualquer tabela
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Verifica se o usuário atual é super_admin
-- SECURITY DEFINER ignora RLS — evita recursão infinita nas policies de profiles
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'super_admin'
      AND active = true
  );
$$;

-- Verifica se o usuário atual é brand_admin ATIVO da marca informada
CREATE OR REPLACE FUNCTION public.is_brand_admin_of(target_brand_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'brand_admin'
      AND brand_id = target_brand_id
      AND active = true
  );
$$;

-- Retorna o brand_id do usuário atual (NULL se super_admin, anon ou sem marca)
CREATE OR REPLACE FUNCTION public.current_brand_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT brand_id FROM public.profiles WHERE id = auth.uid();
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. TABELA: profiles
-- ─────────────────────────────────────────────────────────────────────────────
-- profiles.id = auth.users.id (UUID do Supabase Auth)
-- brand_id é nullable: super_admin não tem marca

CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL,
  name        text,
  role        text NOT NULL DEFAULT 'brand_admin'
              CHECK (role IN ('super_admin','brand_admin')),
  brand_id    uuid,  -- FK adicionada abaixo após brands existir
  active      boolean NOT NULL DEFAULT true,
  phone       text,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email    ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role     ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_brand_id ON public.profiles(brand_id) WHERE brand_id IS NOT NULL;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger que protege campos sensíveis em self-update
-- Impede que um brand_admin altere o próprio role/brand_id/active/email
CREATE OR REPLACE FUNCTION public.profiles_protect_sensitive()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    IF  NEW.role     IS DISTINCT FROM OLD.role
     OR NEW.brand_id IS DISTINCT FROM OLD.brand_id
     OR NEW.active   IS DISTINCT FROM OLD.active
     OR NEW.email    IS DISTINCT FROM OLD.email
     OR NEW.id       IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Não autorizado a alterar role/brand_id/active/email/id do próprio profile';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_sensitive_trg ON public.profiles;
CREATE TRIGGER profiles_protect_sensitive_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_protect_sensitive();


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. TABELA: brands
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.brands (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  slug             text NOT NULL UNIQUE,
  tagline          text,
  description      text,
  logo_url         text,
  banner_url       text,
  primary_color    text DEFAULT '#0f0f0f',
  secondary_color  text DEFAULT '#e6e4dd',
  whatsapp         text,
  instagram        text,
  website          text,
  active           boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brands_slug   ON public.brands(slug);
CREATE INDEX IF NOT EXISTS idx_brands_active ON public.brands(active) WHERE active = true;

DROP TRIGGER IF EXISTS set_brands_updated_at ON public.brands;
CREATE TRIGGER set_brands_updated_at
  BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Agora que brands existe, adicionar FK profiles.brand_id → brands.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_brand_id_fkey' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_brand_id_fkey
      FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE SET NULL;
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. TABELA: categories
-- ─────────────────────────────────────────────────────────────────────────────
-- Categorias são SEMPRE vinculadas a uma marca (decisão arquitetural)
-- Slug é único POR marca (marcas diferentes podem ter mesmo slug)

CREATE TABLE IF NOT EXISTS public.categories (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id     uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name         text NOT NULL,
  slug         text NOT NULL,
  icon         text DEFAULT '🏷️',
  order_index  integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_categories_brand_id    ON public.categories(brand_id);
CREATE INDEX IF NOT EXISTS idx_categories_brand_order ON public.categories(brand_id, order_index);

DROP TRIGGER IF EXISTS set_categories_updated_at ON public.categories;
CREATE TRIGGER set_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. TABELA: products
-- ─────────────────────────────────────────────────────────────────────────────
-- variants e images são JSONB para flexibilidade (espelho da estrutura Firestore)
-- Slug único por marca

CREATE TABLE IF NOT EXISTS public.products (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id     uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  category_id  uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name         text NOT NULL,
  slug         text NOT NULL,
  description  text,
  base_price   numeric(10,2) NOT NULL DEFAULT 0 CHECK (base_price >= 0),
  sale_price   numeric(10,2) CHECK (sale_price IS NULL OR sale_price >= 0),
  status       text NOT NULL DEFAULT 'rascunho'
               CHECK (status IN ('rascunho','publicado','esgotado')),
  gender       text DEFAULT 'unissex'
               CHECK (gender IN ('masculino','feminino','unissex','infantil')),
  is_new       boolean NOT NULL DEFAULT false,
  is_featured  boolean NOT NULL DEFAULT false,
  tags         text[] NOT NULL DEFAULT '{}',
  images       jsonb NOT NULL DEFAULT '[]'::jsonb,
  variants     jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_products_brand_id      ON public.products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_brand_status  ON public.products(brand_id, status);
CREATE INDEX IF NOT EXISTS idx_products_category_id   ON public.products(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_status        ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_featured      ON public.products(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_products_created_at    ON public.products(created_at DESC);

DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. TABELA: orders
-- ─────────────────────────────────────────────────────────────────────────────
-- brand_name é snapshot (caso a marca mude de nome depois do pedido)

CREATE TABLE IF NOT EXISTS public.orders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id          uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  brand_name        text,
  customer_name     text NOT NULL,
  customer_phone    text NOT NULL,
  observations      text,
  items             jsonb NOT NULL DEFAULT '[]'::jsonb,
  total             numeric(10,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  status            text NOT NULL DEFAULT 'novo'
                    CHECK (status IN (
                      'novo','em_atendimento','aguardando_pagamento',
                      'pago','enviado','concluido','cancelado'
                    )),
  source            text NOT NULL DEFAULT 'catalog',
  catalog_url       text,
  whatsapp_message  text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_brand_id      ON public.orders(brand_id);
CREATE INDEX IF NOT EXISTS idx_orders_brand_created ON public.orders(brand_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status        ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at    ON public.orders(created_at DESC);

DROP TRIGGER IF EXISTS set_orders_updated_at ON public.orders;
CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. TABELA: configs
-- ─────────────────────────────────────────────────────────────────────────────
-- brand_id NULL = config global (só super_admin)
-- 1 config por marca via UNIQUE(brand_id)

CREATE TABLE IF NOT EXISTS public.configs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id    uuid UNIQUE REFERENCES public.brands(id) ON DELETE CASCADE,
  settings    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Permite no máximo 1 config global (brand_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS configs_global_unique
  ON public.configs ((brand_id IS NULL)) WHERE brand_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_configs_brand_id ON public.configs(brand_id);

DROP TRIGGER IF EXISTS set_configs_updated_at ON public.configs;
CREATE TRIGGER set_configs_updated_at
  BEFORE UPDATE ON public.configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. TRIGGER: auto-criar profile no signup
-- ─────────────────────────────────────────────────────────────────────────────
-- Quando alguém faz signup em auth.users, cria automaticamente em profiles
-- O role é decidido pelo email: augustocross87@gmail.com → super_admin

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigned_role text;
BEGIN
  assigned_role := CASE
    WHEN NEW.email = 'augustocross87@gmail.com' THEN 'super_admin'
    ELSE 'brand_admin'
  END;

  INSERT INTO public.profiles (id, email, role, active)
  VALUES (NEW.id, NEW.email, assigned_role, true)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =============================================================================
-- 10. RLS — ROW LEVEL SECURITY
-- =============================================================================

-- Ativa RLS em todas as tabelas públicas
ALTER TABLE public.profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configs    ENABLE ROW LEVEL SECURITY;


-- ─── PROFILES ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "profiles_select_self_or_super" ON public.profiles;
CREATE POLICY "profiles_select_self_or_super"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR public.is_super_admin()
  );

-- Update: próprio user (trigger protege campos sensíveis) ou super_admin
DROP POLICY IF EXISTS "profiles_update_self_or_super" ON public.profiles;
CREATE POLICY "profiles_update_self_or_super"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid() OR public.is_super_admin())
  WITH CHECK (id = auth.uid() OR public.is_super_admin());

-- Insert: super_admin (criar outros usuários) ou trigger handle_new_user
-- (trigger é SECURITY DEFINER, ignora RLS)
DROP POLICY IF EXISTS "profiles_insert_super" ON public.profiles;
CREATE POLICY "profiles_insert_super"
  ON public.profiles FOR INSERT
  WITH CHECK (public.is_super_admin());

-- Delete: apenas super_admin
DROP POLICY IF EXISTS "profiles_delete_super" ON public.profiles;
CREATE POLICY "profiles_delete_super"
  ON public.profiles FOR DELETE
  USING (public.is_super_admin());


-- ─── BRANDS ──────────────────────────────────────────────────────────────────

-- SELECT: público lê marcas ATIVAS; super_admin e brand_admin da marca leem tudo
DROP POLICY IF EXISTS "brands_select_all" ON public.brands;
CREATE POLICY "brands_select_all"
  ON public.brands FOR SELECT
  USING (
    active = true
    OR public.is_super_admin()
    OR public.is_brand_admin_of(id)
  );

-- INSERT: apenas super_admin cria marcas
DROP POLICY IF EXISTS "brands_insert_super" ON public.brands;
CREATE POLICY "brands_insert_super"
  ON public.brands FOR INSERT
  WITH CHECK (public.is_super_admin());

-- UPDATE: super_admin tudo, brand_admin sua marca
DROP POLICY IF EXISTS "brands_update_super_or_own" ON public.brands;
CREATE POLICY "brands_update_super_or_own"
  ON public.brands FOR UPDATE
  USING (public.is_super_admin() OR public.is_brand_admin_of(id))
  WITH CHECK (public.is_super_admin() OR public.is_brand_admin_of(id));

-- DELETE: apenas super_admin
DROP POLICY IF EXISTS "brands_delete_super" ON public.brands;
CREATE POLICY "brands_delete_super"
  ON public.brands FOR DELETE
  USING (public.is_super_admin());


-- ─── CATEGORIES ──────────────────────────────────────────────────────────────

-- SELECT: público lê categorias de marcas ativas; admins veem tudo da sua marca
DROP POLICY IF EXISTS "categories_select_all" ON public.categories;
CREATE POLICY "categories_select_all"
  ON public.categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.brands b
      WHERE b.id = categories.brand_id AND b.active = true
    )
    OR public.is_super_admin()
    OR public.is_brand_admin_of(brand_id)
  );

-- INSERT/UPDATE/DELETE: super_admin ou brand_admin da própria marca
DROP POLICY IF EXISTS "categories_insert_admin" ON public.categories;
CREATE POLICY "categories_insert_admin"
  ON public.categories FOR INSERT
  WITH CHECK (public.is_super_admin() OR public.is_brand_admin_of(brand_id));

DROP POLICY IF EXISTS "categories_update_admin" ON public.categories;
CREATE POLICY "categories_update_admin"
  ON public.categories FOR UPDATE
  USING (public.is_super_admin() OR public.is_brand_admin_of(brand_id))
  WITH CHECK (public.is_super_admin() OR public.is_brand_admin_of(brand_id));

DROP POLICY IF EXISTS "categories_delete_admin" ON public.categories;
CREATE POLICY "categories_delete_admin"
  ON public.categories FOR DELETE
  USING (public.is_super_admin() OR public.is_brand_admin_of(brand_id));


-- ─── PRODUCTS ────────────────────────────────────────────────────────────────

-- SELECT: público lê APENAS publicados de marcas ativas; admins veem tudo
DROP POLICY IF EXISTS "products_select_all" ON public.products;
CREATE POLICY "products_select_all"
  ON public.products FOR SELECT
  USING (
    (
      status = 'publicado'
      AND EXISTS (
        SELECT 1 FROM public.brands b
        WHERE b.id = products.brand_id AND b.active = true
      )
    )
    OR public.is_super_admin()
    OR public.is_brand_admin_of(brand_id)
  );

DROP POLICY IF EXISTS "products_insert_admin" ON public.products;
CREATE POLICY "products_insert_admin"
  ON public.products FOR INSERT
  WITH CHECK (public.is_super_admin() OR public.is_brand_admin_of(brand_id));

DROP POLICY IF EXISTS "products_update_admin" ON public.products;
CREATE POLICY "products_update_admin"
  ON public.products FOR UPDATE
  USING (public.is_super_admin() OR public.is_brand_admin_of(brand_id))
  WITH CHECK (public.is_super_admin() OR public.is_brand_admin_of(brand_id));

DROP POLICY IF EXISTS "products_delete_admin" ON public.products;
CREATE POLICY "products_delete_admin"
  ON public.products FOR DELETE
  USING (public.is_super_admin() OR public.is_brand_admin_of(brand_id));


-- ─── ORDERS ──────────────────────────────────────────────────────────────────

-- SELECT: apenas super_admin ou brand_admin da marca (visitante NÃO lê)
DROP POLICY IF EXISTS "orders_select_admin" ON public.orders;
CREATE POLICY "orders_select_admin"
  ON public.orders FOR SELECT
  USING (public.is_super_admin() OR public.is_brand_admin_of(brand_id));

-- INSERT: QUALQUER UM (anon incluído) pode criar pedido
-- Restrição: marca tem que estar ativa, status inicial 'novo', source 'catalog'
DROP POLICY IF EXISTS "orders_insert_public" ON public.orders;
CREATE POLICY "orders_insert_public"
  ON public.orders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.brands b
      WHERE b.id = orders.brand_id AND b.active = true
    )
    AND status = 'novo'
    AND source = 'catalog'
  );

-- UPDATE: super_admin ou brand_admin da marca (mudar status, etc.)
DROP POLICY IF EXISTS "orders_update_admin" ON public.orders;
CREATE POLICY "orders_update_admin"
  ON public.orders FOR UPDATE
  USING (public.is_super_admin() OR public.is_brand_admin_of(brand_id))
  WITH CHECK (public.is_super_admin() OR public.is_brand_admin_of(brand_id));

-- DELETE: apenas super_admin
DROP POLICY IF EXISTS "orders_delete_super" ON public.orders;
CREATE POLICY "orders_delete_super"
  ON public.orders FOR DELETE
  USING (public.is_super_admin());


-- ─── CONFIGS ─────────────────────────────────────────────────────────────────

-- SELECT: público lê configs de marcas ativas + configs globais;
--          super_admin e brand_admin (da marca) leem tudo
DROP POLICY IF EXISTS "configs_select_all" ON public.configs;
CREATE POLICY "configs_select_all"
  ON public.configs FOR SELECT
  USING (
    brand_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.brands b
      WHERE b.id = configs.brand_id AND b.active = true
    )
    OR public.is_super_admin()
    OR public.is_brand_admin_of(brand_id)
  );

-- INSERT: super_admin (configs globais ou de qualquer marca) ou brand_admin (sua marca)
DROP POLICY IF EXISTS "configs_insert_admin" ON public.configs;
CREATE POLICY "configs_insert_admin"
  ON public.configs FOR INSERT
  WITH CHECK (
    public.is_super_admin()
    OR (brand_id IS NOT NULL AND public.is_brand_admin_of(brand_id))
  );

DROP POLICY IF EXISTS "configs_update_admin" ON public.configs;
CREATE POLICY "configs_update_admin"
  ON public.configs FOR UPDATE
  USING (
    public.is_super_admin()
    OR (brand_id IS NOT NULL AND public.is_brand_admin_of(brand_id))
  )
  WITH CHECK (
    public.is_super_admin()
    OR (brand_id IS NOT NULL AND public.is_brand_admin_of(brand_id))
  );

DROP POLICY IF EXISTS "configs_delete_super" ON public.configs;
CREATE POLICY "configs_delete_super"
  ON public.configs FOR DELETE
  USING (public.is_super_admin());


-- =============================================================================
-- 11. GRANTS — permissões mínimas para roles anon/authenticated
-- =============================================================================
-- RLS faz o trabalho pesado, mas precisamos garantir que anon possa fazer
-- INSERT em orders e SELECT em brands/products/categories/configs.

-- anon: leitura pública + criar pedido
GRANT SELECT ON public.brands     TO anon;
GRANT SELECT ON public.products   TO anon;
GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.configs    TO anon;
GRANT INSERT ON public.orders     TO anon;

-- authenticated: tudo (RLS filtra)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brands     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.configs    TO authenticated;


-- =============================================================================
-- FIM
-- =============================================================================
-- Próximos passos (não executados ainda):
--   1. Fazer signup de augustocross87@gmail.com via Supabase Auth →
--      trigger handle_new_user cria profile com role='super_admin'
--   2. Criar marcas via super_admin
--   3. Criar brand_admins (via super_admin invocando admin API)
--   4. Frontend: ainda não tocado — Etapa 2+
-- =============================================================================
