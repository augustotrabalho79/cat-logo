# Supabase — Catálogo de Moda

Migração Firebase → Supabase em etapas. Esta pasta contém **somente o backend SQL**.
O Firebase continua intacto até a Etapa 4.

## Estado atual

- **Etapa 1 (ATUAL):** schema SQL pronto, ainda não aplicado.
- Etapa 2: cliente Supabase no frontend (paralelo ao Firebase).
- Etapa 3: migrar leituras públicas (catálogo) para Supabase.
- Etapa 4: migrar auth + escritas (admin).
- Etapa 5: desligar Firebase.

## Estrutura

```
supabase/
├── migrations/
│   └── 20260531000001_initial_schema.sql   ← schema completo
└── README.md
```

## Como aplicar a migration

### Opção A — SQL Editor (recomendado para esta etapa)

1. Abrir https://supabase.com/dashboard/project/xlsujjgfvklthdwrafrx
2. Menu lateral → **SQL Editor** → **New query**
3. Copiar TODO o conteúdo de `20260531000001_initial_schema.sql`
4. Colar no editor e clicar **Run** (canto inferior direito)
5. Verificar mensagem "Success. No rows returned"
6. Navegar para **Table Editor** e conferir que existem 6 tabelas:
   - `profiles`, `brands`, `categories`, `products`, `orders`, `configs`

### Opção B — Supabase CLI

```bash
# Instalar CLI (uma vez)
npm install -g supabase

# Linkar projeto local com o projeto remoto
cd C:\catalogo-moda-final
supabase login
supabase link --project-ref xlsujjgfvklthdwrafrx

# Aplicar migrations
supabase db push
```

### Opção C — MCP `apply_migration`

Se você tem o MCP do Supabase ligado no Claude Code, basta pedir:
"aplique a migration `20260531000001_initial_schema.sql` no projeto xlsujjgfvklthdwrafrx".

## Como criar o primeiro super_admin

O trigger `on_auth_user_created` detecta o email `augustocross87@gmail.com` e cria
o profile com `role = 'super_admin'` automaticamente.

Para isso acontecer:

1. **Dashboard** → **Authentication** → **Users** → **Add user** → **Create new user**
2. Email: `augustocross87@gmail.com`
3. Password: (definir)
4. **Auto Confirm User**: marcar (para pular confirmação de email no dev)
5. Após criar, abrir `Table Editor → profiles` e confirmar que existe linha com
   `role = 'super_admin'` e `active = true`.

## Resumo das policies por tabela

| Tabela     | Anon SELECT                       | Anon INSERT | Admin actions                                        |
|------------|-----------------------------------|-------------|------------------------------------------------------|
| profiles   | ❌                                | ❌          | super_admin tudo; brand_admin lê/atualiza só o seu  |
| brands     | ✅ só `active=true`               | ❌          | super_admin tudo; brand_admin atualiza a sua       |
| categories | ✅ se marca ativa                 | ❌          | super_admin tudo; brand_admin tudo da sua marca     |
| products   | ✅ só `publicado` + marca ativa   | ❌          | super_admin tudo; brand_admin tudo da sua marca     |
| orders     | ❌                                | ✅ (marca ativa, status='novo', source='catalog') | super_admin tudo; brand_admin lê/atualiza só da marca |
| configs    | ✅ globais + de marcas ativas     | ❌          | super_admin tudo; brand_admin sua config           |

## Funções auxiliares criadas

| Função | Retorno | Uso |
|--------|---------|-----|
| `set_updated_at()` | trigger | Atualiza `updated_at` em qualquer tabela com esse trigger |
| `is_super_admin()` | boolean | `true` se `auth.uid()` é super_admin ativo |
| `is_brand_admin_of(uuid)` | boolean | `true` se o usuário atual é brand_admin ativo da marca |
| `current_brand_id()` | uuid | Retorna o `brand_id` do usuário corrente |
| `handle_new_user()` | trigger | Cria profile automaticamente quando signup em `auth.users` |
| `profiles_protect_sensitive()` | trigger | Bloqueia self-escalation (mudar role/brand_id/active sem ser super_admin) |

Todas com `SECURITY DEFINER` + `SET search_path = public` para evitar:
- Recursão de RLS em policies que precisam ler `profiles`
- Vulnerabilidade de search_path hijacking

## Verificação rápida pós-aplicação

Rode no SQL Editor:

```sql
-- 1. Confirmar que RLS está habilitado em todas as tabelas
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles','brands','categories','products','orders','configs');
-- Esperado: rowsecurity = true em todas

-- 2. Listar policies criadas (esperado: ~22 policies)
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- 3. Confirmar triggers
SELECT trigger_name, event_object_table FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 4. Confirmar funções
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'set_updated_at','is_super_admin','is_brand_admin_of',
    'current_brand_id','handle_new_user','profiles_protect_sensitive'
  );
```

## Variáveis de ambiente (para Etapa 2)

Quando partir para o frontend, adicionar ao `.env`:

```
VITE_SUPABASE_URL=https://xlsujjgfvklthdwrafrx.supabase.co
VITE_SUPABASE_ANON_KEY=<a chave anon que você já passou>
```

**Nunca colocar `service_role`** no frontend.

## Notas importantes

- `gen_random_uuid()` vem da extensão `pgcrypto` (já instalada por `CREATE EXTENSION IF NOT EXISTS`).
- IDs do Supabase são UUIDs — diferente dos IDs string do Firestore. Na migração de
  dados (etapa futura) será necessário gerar mapeamento `firestore_id → uuid`.
- `images` e `variants` ficam como `jsonb` para espelhar o formato Firestore atual e
  não exigir refatoração de tipos no frontend.
- Categorias agora são SEMPRE vinculadas a marca (`brand_id NOT NULL`). Isso já
  está alinhado com a decisão tomada na Etapa B3.

## Rollback (se precisar desfazer)

Esta migration é destrutiva se rolada de novo (drops/recreates triggers). Para
desfazer tudo:

```sql
DROP TABLE IF EXISTS public.configs    CASCADE;
DROP TABLE IF EXISTS public.orders     CASCADE;
DROP TABLE IF EXISTS public.products   CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.profiles   CASCADE;
DROP TABLE IF EXISTS public.brands     CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user            CASCADE;
DROP FUNCTION IF EXISTS public.profiles_protect_sensitive CASCADE;
DROP FUNCTION IF EXISTS public.is_super_admin             CASCADE;
DROP FUNCTION IF EXISTS public.is_brand_admin_of          CASCADE;
DROP FUNCTION IF EXISTS public.current_brand_id           CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at             CASCADE;
```
