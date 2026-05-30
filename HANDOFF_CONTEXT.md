# HANDOFF_CONTEXT.md
# Memória permanente do projeto — Catálogo de Moda SaaS
# Última atualização: 2026-05-30
# Leia este arquivo INTEIRO antes de fazer qualquer alteração no projeto.

---

## 1. VISÃO GERAL DO PROJETO

**Nome:** Catálogo de Moda SaaS  
**Repositório:** https://github.com/augustocross87/catalogo-moda  
**Site ao vivo:** https://catalogo-moda.vercel.app  
**Pasta local:** `C:\catalogo-moda-final`  
**Proprietário:** Augusto — Santa Cruz do Capibaribe, PE

### Objetivo
Sistema SaaS multi-marcas para lojistas de moda criarem catálogos públicos de produtos, receberem pedidos/orçamentos via WhatsApp e gerenciarem estoque pelo painel admin.

### Tipo de SaaS
- Modelo B2B: Augusto vende o serviço para lojistas
- Cobrança: Setup R$ 1.500–3.000 + mensalidade R$ 150–400/mês
- Fase atual: produto em construção, sem cliente pagante ainda

### Público-alvo
Lojistas do Moda Center Santa Cruz do Capibaribe (polo de moda atacadista do Nordeste). Vendem roupas no atacado. O catálogo serve como vitrine para compradores enviarem orçamentos via WhatsApp.

### Fluxo principal
1. Augusto (super_admin) cria uma marca no painel admin
2. Augusto cria um usuário brand_admin e vincula à marca
3. Brand_admin faz login e cadastra produtos com fotos, variantes, preços
4. Comprador acessa `/catalogo/{slug}` — URL pública da marca
5. Comprador navega pelos produtos, clica para ver detalhes
6. Seleciona tamanho/cor/quantidade → "Adicionar ao pedido"
7. Ao finalizar, informa nome e telefone → abre WhatsApp com mensagem formatada
8. Pedido é salvo automaticamente no Firestore com status "novo"
9. Brand_admin acompanha pedidos em `/admin/pedidos`

### Importante: NÃO é e-commerce
O sistema é um **catálogo de orçamento atacadista**, não um e-commerce com pagamento online. Não há carrinho de compras no sentido tradicional, não há checkout com pagamento, não há wishlist (desativada). O fluxo termina no WhatsApp. O "carrinho" é apenas uma lista de itens para montar o orçamento.

---

## 2. STACK COMPLETA

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework | React | 19.x |
| Linguagem | TypeScript | 5.8 |
| Build | Vite | 7.x |
| Roteamento | TanStack React Router | v1 (file-based) |
| Estilos | Tailwind CSS | 4.x |
| Componentes UI | shadcn/ui + Radix UI | — |
| Ícones | Lucide React | 0.575 |
| Forms | React Hook Form + Zod | — |
| Server state | TanStack React Query | v5 |
| Autenticação | Firebase Auth | 12.x |
| Banco de dados | Firebase Firestore | 12.x |
| Imagens | Cloudinary | (API direta, sem SDK) |
| Deploy frontend | Vercel | (auto-deploy via GitHub) |
| Deploy Firestore rules | Firebase CLI | 15.x |

### Libs adicionais relevantes
- `date-fns` — formatação de datas
- `embla-carousel-react` — galeria de imagens
- `recharts` — gráficos (disponível, não usado ainda)
- `sonner` — toasts (disponível, não integrado ao catálogo)
- `vaul` — drawer (base do Radix)

---

## 3. ARQUITETURA

### SPA puro (sem SSR)
O projeto usa TanStack React Router no modo client-side. **NÃO usa TanStack Start** (SSR). A Vercel serve apenas o `index.html` com rewrite para todas as rotas:

```json
// vercel.json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

### Estrutura de pastas

```
C:\catalogo-moda-final\
├── src/
│   ├── components/
│   │   ├── admin/
│   │   │   └── ProductForm.tsx        # Formulário completo de produto (variantes, imagens)
│   │   ├── store/
│   │   │   ├── CartDrawer.tsx         # Drawer 2-step: itens → checkout → WhatsApp
│   │   │   ├── LoginModal.tsx         # Modal login na store pública
│   │   │   ├── ProductCard.tsx        # Card para rotas _store.* (tem wishlist — NÃO usar no catálogo)
│   │   │   ├── SearchModal.tsx        # Modal busca global
│   │   │   └── StoreChrome.tsx        # Header + footer das rotas _store.*
│   │   ├── ui/                        # 30+ componentes shadcn/Radix (não editar diretamente)
│   │   ├── SlideOver.tsx              # Painel lateral genérico (admin)
│   │   └── ui-prim.tsx                # Btn, Field, TextInput, TextArea, Select (primitivos admin)
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx            # Provider Firebase Auth — CRÍTICO, nunca sobrescrever
│   │
│   ├── hooks/
│   │   ├── use-cart.ts                # Carrinho por marca (localStorage: "cart:{brandSlug}")
│   │   ├── use-wishlist.ts            # Wishlist (desativada no catálogo, não usar)
│   │   └── use-mobile.tsx             # Breakpoint mobile
│   │
│   ├── lib/
│   │   ├── firebase.ts                # Init Firebase — CRÍTICO, nunca sobrescrever
│   │   ├── api.ts                     # CRUD Firestore + helpers — CRÍTICO, nunca sobrescrever
│   │   ├── users.ts                   # Gerenciamento de usuários (super_admin)
│   │   └── utils.ts                   # cleanForFirestore, cn(), slugify(), formatBRL()
│   │
│   ├── routes/                        # File-based routing TanStack Router
│   │   ├── __root.tsx                 # Raiz: QueryClientProvider, 404, ErrorBoundary
│   │   ├── _store.tsx                 # Layout store pública (StoreChrome wrapping)
│   │   ├── _store.index.tsx           # Homepage /
│   │   ├── _store.lookbook.tsx        # /lookbook
│   │   ├── _store.marcas.index.tsx    # /marcas
│   │   ├── _store.marcas.$slug.tsx    # /marcas/{slug}
│   │   ├── _store.produtos.index.tsx  # /produtos
│   │   ├── _store.produtos.$slug.tsx  # /produtos/{slug} ← TEM WISHLIST
│   │   ├── admin.tsx                  # Layout admin (sidebar + proteção de rota)
│   │   ├── admin.login.tsx            # /admin/login
│   │   ├── admin.index.tsx            # /admin (dashboard)
│   │   ├── admin.marcas.tsx           # /admin/marcas — CRUD marcas (super_admin)
│   │   ├── admin.categorias.tsx       # /admin/categorias
│   │   ├── admin.produtos.index.tsx   # /admin/produtos
│   │   ├── admin.produtos.novo.tsx    # /admin/produtos/novo
│   │   ├── admin.produtos.$id.editar.tsx  # /admin/produtos/{id}/editar
│   │   ├── admin.pedidos.tsx          # /admin/pedidos — listagem de pedidos ✅ implementado
│   │   ├── admin.usuarios.tsx         # /admin/usuarios — gestão de brand_admins (super_admin)
│   │   ├── admin.configuracoes.tsx    # /admin/configuracoes (4 abas)
│   │   └── catalogo.$slug.tsx         # /catalogo/{slug} — CATÁLOGO PÚBLICO DA MARCA ← PRINCIPAL
│   │
│   ├── services/
│   │   ├── cloudinaryService.ts       # Upload unsigned + URL otimizada
│   │   └── orderService.ts            # CRUD pedidos + geração WhatsApp
│   │
│   ├── main.tsx                       # Entry point — CRÍTICO, nunca sobrescrever
│   ├── router.tsx                     # createRouter com routeTree
│   └── styles.css                     # Tailwind + design tokens
│
├── firebase.json                      # Config Firebase CLI (Firestore rules)
├── .firebaserc                        # Aponta para projeto catalogo-69b3a
├── firestore.rules                    # Regras de segurança — DEPLOIAR com Firebase CLI
├── index.html                         # Entry HTML — CRÍTICO, nunca sobrescrever
├── vite.config.ts                     # Build sem SSR — CRÍTICO, nunca sobrescrever
├── vercel.json                        # SPA rewrite — CRÍTICO, nunca sobrescrever
├── .env                               # Variáveis locais (não commitado)
├── PROJECT_CONTEXT.md                 # Contexto alto nível
├── ARCHITECTURE.md                    # Arquitetura técnica detalhada
├── TASKS_NEXT.md                      # Backlog de tarefas
└── HANDOFF_CONTEXT.md                 # Este arquivo
```

### Layouts e rotas

**Layout `_store.tsx`** — envolve todas as rotas com prefixo `_store.`:
- `/` → homepage
- `/produtos` → catálogo geral
- `/produtos/{slug}` → detalhe do produto (tem wishlist!)
- `/marcas` → lista de marcas
- `/marcas/{slug}` → página da marca
- `/lookbook` → editorial

**Layout `admin.tsx`** — sidebar com proteção de rota:
- Redireciona para `/admin/login` se não autenticado
- Brand_admin NÃO vê: Marcas, Usuários
- Super_admin vê tudo

**Rota standalone `catalogo.$slug.tsx`** — catálogo público por marca:
- `/catalogo/{slug}` — NÃO usa layout _store, tem header próprio
- É aqui que o fluxo de pedidos acontece
- Não tem wishlist, tem "Adicionar ao pedido"

### Contexts

**`AuthContext.tsx`** — único context global:
```typescript
type AuthUser = { uid, email, role: "admin"|"client", name?, brandId? }
type AuthContextValue = { user, loading, login, logout, isAdmin, isBrandAdmin }

const SUPER_ADMIN_EMAIL = "augustocross87@gmail.com"
// isAdmin = role === "admin"
// isBrandAdmin = role === "client" && !!brandId
```

Ao logar: busca perfil em `users/{uid}`. Se não encontrado, fallback por email (super_admin identificado pelo email hardcoded).

### Services

**`cloudinaryService.ts`** — upload unsigned para Cloudinary
**`orderService.ts`** — criação de pedidos, geração de mensagem WhatsApp, atualização de status

### Hooks

**`use-cart.ts`** — carrinho por marca:
- Chave localStorage: `cart:{brandSlug}`
- Escopo por marca (isolado por slug)
- `CartItem`: productId, productName, productSlug, image, selectedSize, selectedColor, selectedColorName, quantity, unitPrice, sku

---

## 4. SISTEMA MULTI-MARCAS

### Como funciona
Cada lojista tem uma **marca** com:
- `id` — gerado pelo Firestore (também o `brandId`)
- `slug` — ex: `vide-art`, `atelier-branco` (URL-friendly, deve ser único)
- `name`, `tagline`, `description`
- `primaryColor`, `secondaryColor` — tema visual do catálogo
- `logoUrl`, `bannerUrl` — imagens no Cloudinary (secure_url)
- `whatsapp` — número para pedidos (ex: `5581999999999` com DDI, sem +)
- `instagram`, `website`
- `active: boolean` — se false, catálogo fica offline

### URL pública
```
https://catalogo-moda.vercel.app/catalogo/{slug}
```
Ex: `https://catalogo-moda.vercel.app/catalogo/vide-art`

### Separação de dados no Firestore
- **Produtos**: campo `brandId` referencia a marca
- **Categorias**: campo `brandId` (opcional — categorias globais não têm brandId)
- **Pedidos**: campo `brandId` filtra por marca
- **Banners**: campo `brandId` (opcional)
- **StoreSettings**: docId `store-{brandId}` no Firestore path `config/store-{brandId}`

### Isolamento no admin
- **Super_admin**: vê tudo (todos os produtos de todas as marcas)
- **Brand_admin**: `getProducts({ brandId: user.brandId })` — só vê sua marca
- A sidebar do admin filtra por `adminOnly` — itens com `adminOnly: true` só aparecem para `isAdmin === true`

### Como criar uma marca
1. Super_admin acessa `/admin/marcas` → Nova marca
2. Preenche nome, slug, cores, logo, banner, WhatsApp
3. `saveBrand()` em `api.ts` salva no Firestore com `active: true`
4. Super_admin vai em `/admin/usuarios` → Novo cliente
5. Informa email, senha, nome e **vincula à marca** (`brandId`)
6. Brand_admin recebe acesso ao painel

---

## 5. ROLES E PERMISSÕES

### super_admin
- **Email:** `augustocross87@gmail.com` (hardcoded em `AuthContext.tsx` e `firestore.rules`)
- **Role no Firestore:** `role: "admin"` no documento `users/{uid}`
- **Permissões totais:**
  - Criar/editar/deletar marcas
  - Criar/editar/desativar usuários brand_admin
  - Ver TODOS os produtos de TODAS as marcas
  - Ver TODOS os pedidos
  - Gerenciar vendedores, banners, configurações globais
  - Deploy de Firestore rules
- **Menu admin:** Dashboard, Marcas, Categorias, Produtos, Pedidos, Usuários, Configurações

### brand_admin (role = "client")
- Documento `users/{uid}` com `role: "client"`, `brandId: "<id>"`, `active: true`
- **Permissões restritas:**
  - Ver/editar apenas produtos da SUA marca (`brandId`)
  - Ver/editar categorias da sua marca
  - Ver/atualizar pedidos da sua marca
  - Editar configurações da sua marca (`config/store-{brandId}`)
  - NÃO pode: criar marcas, criar outros usuários, ver outras marcas
- **Menu admin:** Dashboard, Categorias, Produtos, Pedidos, Configurações
- **NÃO vê:** Marcas, Usuários

### Identificação de roles no código

**`AuthContext.tsx`:**
```typescript
const SUPER_ADMIN_EMAIL = "augustocross87@gmail.com"
const isAdmin = user?.role === "admin"
const isBrandAdmin = user?.role === "client" && !!user?.brandId
```

**`firestore.rules`:**
```
function isSuperAdmin() { return request.auth.token.email == "augustocross87@gmail.com" }
function isAdminRole() { return getUserData().role == "admin" }
function isBrandAdmin(brandId) { return getUserData().role == "client" && getUserData().brandId == brandId && getUserData().active == true }
```

### Como criar brand_admin
Em `/admin/usuarios`, o super_admin usa `createClientUser()` em `src/lib/users.ts`:
1. Cria usuário no Firebase Auth via REST API (sem deslogar o admin atual)
2. Salva metadados em `users/{uid}` com `role: "client"`, `brandId`, `active: true`
3. Brand_admin faz login com email + senha definidos pelo admin

---

## 6. FLUXO DO CATÁLOGO PÚBLICO

### Rota: `/catalogo/{slug}`
**Arquivo:** `src/routes/catalogo.$slug.tsx`

Este arquivo é standalone — **NÃO usa o layout `_store.tsx`**. Tem header próprio com logo, nome, botão WhatsApp e ícone de carrinho.

### Sequência de carregamento
```typescript
// 1. Busca marca pelo slug
const brand = await getBrandBySlug(slug)
// getBrandBySlug usa: query(collection(db,"brands"), where("slug","==",slug))
// Normaliza: { active: true, id: d.id, ...d.data() }

// 2. Verifica se está ativa
if (!brand || brand.active === false) → "Catálogo não encontrado"
// ATENÇÃO: checar brand.active === false, NÃO !brand.active
// undefined deve ser tratado como ativo (marcas antigas sem o campo)

// 3. Carrega produtos e categorias em paralelo
const [products, categories] = await Promise.all([
  getProducts({ brandId: brand.id, status: "publicado" }),
  getCategories(brand.id)
])
```

### Tema visual da marca
```tsx
const style = {
  "--brand-primary": brand.primaryColor ?? "#0f0f0f",
  "--brand-secondary": brand.secondaryColor ?? "#e6e4dd",
} as React.CSSProperties
```

As cores são CSS custom properties injetadas na div raiz. O catálogo aplica as cores da marca automaticamente.

### Filtros no catálogo
- Por categoria (client-side)
- Por busca textual no nome do produto (client-side)
- Apenas produtos com `status: "publicado"` são exibidos

### Modal de detalhe do produto (ProductDetailModal)
- Inline em `catalogo.$slug.tsx`
- Galeria de imagens com prev/next + thumbnails
- Seletor de tamanho (de `variants`)
- Seletor de cor (filtrado pelo tamanho selecionado)
- Estoque disponível para a combinação
- Quantidade
- Botão **"Adicionar ao pedido"** (NÃO "adicionar ao carrinho" nem "wishlist")

---

## 7. CLOUDINARY — CONFIGURAÇÃO COMPLETA

### ⚠️ LEIA ISSO ANTES DE QUALQUER UPLOAD

**Variáveis de ambiente corretas (Vercel + .env):**
```
VITE_CLOUDINARY_CLOUD_NAME=doitolog3
VITE_CLOUDINARY_UPLOAD_PRESET=catalogo_moda_unsigned
```

**NÃO existe mais `VITE_CLOUDINARY_API_KEY`.** Remover se aparecer.

### Como o upload funciona (upload UNSIGNED)

```typescript
// src/services/cloudinaryService.ts
const formData = new FormData()
formData.append("file", file)
formData.append("upload_preset", UPLOAD_PRESET)
// NADA MAIS — sem api_key, sem signature, sem timestamp, sem folder

fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
  method: "POST",
  body: formData
})
// Retorna: { secure_url, public_id, width, height, format, resource_type }
```

### O que NUNCA fazer no upload
- ❌ Nunca adicionar `api_key` ao FormData
- ❌ Nunca adicionar `signature` ao FormData
- ❌ Nunca adicionar `timestamp` ao FormData
- ❌ Nunca adicionar o parâmetro `folder` (foi removido — causava rejeição em presets com restrições)
- ❌ Nunca salvar `blob:` URL no Firestore (apenas `secure_url` do Cloudinary)

### O que salvar no Firestore
Apenas a `secure_url` que vem na resposta do Cloudinary:
```
https://res.cloudinary.com/doitolog3/image/upload/v1234567/public_id.jpg
```

### Blob URL
- Blob URL (`blob:http://...`) é criada pelo browser para preview LOCAL
- É usada APENAS para mostrar preview antes do upload completar
- NUNCA deve ser persistida no Firestore
- `sanitizeImageUrl()` em `api.ts` rejeita qualquer blob: URL automaticamente

### Configuração no painel Cloudinary
O preset `catalogo_moda_unsigned` DEVE estar em modo **Unsigned** no dashboard:
```
Cloudinary Dashboard → Settings → Upload → Upload presets
→ catalogo_moda_unsigned → Signing mode: Unsigned
```
Se estiver como "Signed", o upload retorna 401 "Upload preset must be whitelisted for unsigned uploads".

### Histórico de erros Cloudinary (para referência)
| Erro | Causa | Solução |
|---|---|---|
| `401 Unknown API key` | Cloud name errado (`doitoloq3` com 'q' era o antigo) | Usar `doitolog3` |
| `Upload preset must be whitelisted` | Preset em modo Signed | Mudar para Unsigned no dashboard |
| `Blob salvo no Firestore` | Preview local sendo salvo | Usar apenas `secure_url` |
| `Upload preset not found` | Preset não existe no cloud | Criar preset no dashboard |

### Onde o upload é chamado
- `admin.marcas.tsx` → logo e banner da marca (`uploadImage(file, "logos")`)
- `admin.configuracoes.tsx` → logo e favicon da loja
- `admin.produtos.$id.editar.tsx` e `novo.tsx` → imagens do produto
- Todos usam `uploadImage` de `@/lib/api` que re-exporta de `cloudinaryService.ts`

---

## 8. FIRESTORE — ESTRUTURA COMPLETA

### Projeto Firebase
- **Project ID:** `catalogo-69b3a`
- **Auth Domain:** `catalogo-69b3a.firebaseapp.com`
- **Região:** `sa-east-1` (São Paulo)
- **Firebase Storage:** NÃO ativado (imagens no Cloudinary)

### Collections

#### `brands/{id}`
```typescript
{
  id: string              // gerado pelo Firestore
  name: string            // "Vide Art"
  slug: string            // "vide-art" — URL-friendly único
  tagline: string         // frase curta
  description?: string
  logoUrl?: string        // secure_url Cloudinary
  bannerUrl?: string      // secure_url Cloudinary
  primaryColor: string    // "#F5B800"
  secondaryColor?: string // "#1A6DC8"
  website?: string
  instagram?: string      // "@videartw"
  whatsapp?: string       // "5581994989544" — com DDI, sem +, só dígitos
  active: boolean         // true = visível no catálogo
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy?: string      // uid do admin que criou
}
```

#### `products/{id}`
```typescript
{
  id: string
  name: string
  slug: string            // único — busca por slug na store
  brandId: string         // referencia brands/{id}
  basePrice: number       // R$ como número (ex: 89.90)
  salePrice: number|null  // null = sem promoção
  status: "publicado"|"rascunho"|"esgotado"  // auto-computado por computeProductStatus()
  isNew: boolean
  isFeatured?: boolean
  gender: "masculino"|"feminino"|"unissex"|"infantil"
  tags: string[]
  description?: string
  images?: string[]       // array de secure_url Cloudinary
  variants?: Variant[]    // ver abaixo
  categoryId?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

type Variant = {
  size: string        // "P", "M", "G", "42", etc.
  colorName: string   // "Preto"
  color: string       // "#000000"
  sku: string
  stock: number       // 0 = esgotado para esta variante
}
```

**Status automático:** `computeProductStatus(variants)` — se totalStock === 0, retorna "esgotado". Chamado em `saveProduct()` antes de persistir.

#### `categories/{id}`
```typescript
{
  id: string
  name: string
  slug: string
  icon: string        // emoji ou string
  parentId: string|null
  order: number
  brandId?: string    // null = categoria global
  updatedAt: Timestamp
}
```

#### `orders/{id}`
```typescript
{
  id: string
  brandId: string           // marca que recebe o pedido
  brandName: string
  customerName: string
  customerPhone: string
  observations?: string
  items: OrderItem[]        // CartItem + subtotal
  total: number
  status: OrderStatus       // "novo"|"em_atendimento"|"aguardando_pagamento"|"pago"|"enviado"|"concluido"|"cancelado"
  source: "catalog"
  catalogUrl: string        // URL onde o pedido foi feito
  whatsappMessage: string   // mensagem já formatada
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

#### `users/{uid}`
```typescript
{
  uid: string           // igual ao Firebase Auth UID
  email: string
  name: string
  role: "admin"|"client"
  brandId?: string      // só para role "client"
  active: boolean
  phone?: string
  notes?: string        // notas internas do admin
  createdAt: Timestamp
  createdBy?: string    // uid do admin que criou
  updatedAt?: Timestamp
}
```

#### `config/{docId}`
```typescript
// docId: "store" (global) ou "store-{brandId}" (por marca)
{
  name: string
  tagline: string
  description: string
  logoUrl?: string
  faviconUrl?: string
  primaryColor: string
  secondaryColor: string
  whatsapp?: string
  updatedAt: Timestamp
}

// docId: "notifications"
{
  onNewOrder: boolean
  onOutOfStock: boolean
  onLowStock: boolean
  lowStockThreshold: number
  email: string
}
```

#### `banners/{id}`
```typescript
{
  id: string
  brandId?: string
  title: string
  subtitle?: string
  imageUrl?: string     // secure_url Cloudinary
  buttonText?: string
  buttonLink?: string
  position: "hero"|"novidades"|"entre-categorias"|"rodape"|"lateral"
  order: number
  active: boolean
}
```

#### `vendors/{id}`
```typescript
{
  id: string
  name: string
  email: string
  phone: string
  role: "vendedor"|"gerente"|"admin"
  commission?: number
  active: boolean
  avatarUrl?: string
}
```

### Regras de Segurança (firestore.rules)
**IMPORTANTE: As regras PRECISAM ser deploiadas via Firebase CLI após qualquer mudança.**

```bash
# Na pasta C:\catalogo-moda-final
firebase deploy --only firestore:rules
```

**Resumo das permissões:**
| Collection | Leitura pública | Escrita |
|---|---|---|
| `brands` | ✅ Sim | super_admin, admin_role, brand_admin (só sua marca) |
| `products` | ✅ Sim | super_admin, admin_role, brand_admin (só sua marca) |
| `categories` | ✅ Sim | super_admin, admin_role, brand_admin (só sua marca) |
| `banners` | ✅ Sim | super_admin, admin_role, brand_admin (só sua marca) |
| `config` | ✅ Sim | super_admin, admin_role APENAS |
| `vendors` | ❌ Auth | super_admin, admin_role APENAS |
| `users` | ❌ Auth | próprio user (update), super_admin, admin_role |
| `orders` | ❌ Auth | create: qualquer um; read/update: admin ou brand_admin da marca |

---

## 9. CARRINHO E PEDIDOS

### CartDrawer (`src/components/store/CartDrawer.tsx`)
Drawer lateral com **2 passos**:

**Passo 1 — Lista de itens:**
- Lista produtos adicionados com thumb, nome, variantes, quantidade, preço
- Botões +/- para ajustar quantidade
- Botão remover item
- Total estimado
- Botão "Fazer pedido via WhatsApp" → vai para Passo 2

**Passo 2 — Dados do cliente (checkout):**
- Campo nome completo (obrigatório)
- Campo WhatsApp/telefone (obrigatório)
- Campo observações (opcional)
- Resumo do pedido com subtotais
- Botão "Confirmar e abrir WhatsApp"

**Ao confirmar:**
```typescript
// 1. Gera mensagem WhatsApp
const message = generateWhatsAppMessage(orderData)

// 2. Salva no Firestore
await createOrder({ ...orderData, status: "novo", source: "catalog", whatsappMessage: message })

// 3. Abre WhatsApp
window.open(buildWhatsAppLink(brand.whatsapp, message), "_blank")

// 4. Limpa carrinho
cart.clearCart()
cart.setOpen(false)
```

### useCart (`src/hooks/use-cart.ts`)
```typescript
const cart = useCart(brandSlug)  // brandSlug = slug da URL

// Chave localStorage: "cart:{brandSlug}"
// Cada marca tem seu próprio carrinho isolado

// Métodos:
cart.addItem(item)              // adiciona ou incrementa quantidade
cart.removeItem(index)          // remove por índice
cart.updateQuantity(index, qty) // atualiza quantidade
cart.clearCart()                // limpa tudo
cart.setOpen(true/false)        // controla CartDrawer

// Propriedades:
cart.items                      // CartItem[]
cart.count                      // total de itens (sum quantities)
cart.total                      // valor total em R$
cart.open                       // bool — se drawer está aberto
```

### Geração da mensagem WhatsApp
`generateWhatsAppMessage()` em `orderService.ts` monta texto com:
- Nome e telefone do cliente
- Lista de itens com tamanho, cor, quantidade, preço unitário e subtotal
- Total geral
- Observações se houver
- Link do catálogo

`buildWhatsAppLink(phone, message)` converte para `https://wa.me/{phone}?text={encoded}`.

O número é formatado por `formatWhatsAppPhone()` que adiciona `55` se necessário.

### Pedidos no admin (`/admin/pedidos`)
- Arquivo: `src/routes/admin.pedidos.tsx`
- Super_admin: vê pedidos de todas as marcas
- Brand_admin: vê apenas pedidos da sua marca (`getOrders(user.brandId)`)
- Tabela desktop + cards mobile responsivos
- Status editável inline via select
- Botão "WhatsApp" reabre conversa com a mensagem original

---

## 10. BUGS JÁ CORRIGIDOS

### Corrigidos e deploiados

| Bug | Causa | Correção |
|---|---|---|
| Blob URL salva no Firestore | Preview local sendo persistido | `sanitizeImageUrl()` em `api.ts` rejeita blob: |
| `undefined` no Firestore (notes, phone, brandId) | `updateDoc` com campos undefined | `cleanForFirestore()` em `updateClientUser()` |
| Catálogo não aparecia (`!b.active`) | Campo `active` undefined em marcas antigas | Check mudado para `b.active === false`; `getBrandBySlug` normaliza `active: true` |
| Cloudinary cloud name errado | `doitoloq3` (com 'q') era o antigo | Atualizado para `doitolog3` em `.env` e Vercel |
| Upload com `api_key` em unsigned | Tentativa de upload signed | Removido — upload usa só `file` + `upload_preset` |
| Parâmetro `folder` no upload | Presets com restrição de pasta rejeitavam | `folder` removido do FormData |
| Firestore rules não deploiadas | Sem `firebase.json` no projeto | `firebase.json` criado, rules deploiadas via CLI |
| Wishlist no catálogo público | `ProductCard.tsx` (store) com coração | Catálogo usa `CatalogProductCard` separado, sem wishlist |
| Slug não salvo na marca | Formulário não incluía slug | `admin.marcas.tsx` tem campo slug com geração automática |
| WhatsApp nunca aparecia no catálogo | Campo `whatsapp` ausente no form de marcas | Campo adicionado ao formulário em `admin.marcas.tsx` |
| CartDrawer UX ruim mobile | Form cramped no footer | 2-step: lista → formulário separados |
| Pedidos sem página admin | `getOrders()` existia sem UI | Página `/admin/pedidos` implementada |
| Modal de produto sem detalhe | `CatalogProductCard` era só card | `ProductDetailModal` implementado inline em `catalogo.$slug.tsx` |

---

## 11. BUGS AINDA EXISTENTES / PENDÊNCIAS

### ⚠️ Ação manual obrigatória (não pode ser resolvida em código)

1. **Cloudinary preset não está em modo Unsigned**
   - Sintoma: `401 Upload preset must be whitelisted for unsigned uploads`
   - Solução: Cloudinary Dashboard → Settings → Upload presets → `catalogo_moda_unsigned` → Signing mode: **Unsigned**
   - Sem isso: upload de imagens falha

2. **Usuário admin no Firebase Auth não criado**
   - Se `augustocross87@gmail.com` não tiver conta no Firebase Auth do projeto `catalogo-69b3a`, o login falha
   - Solução: Firebase Console → Authentication → Users → Add user → email + senha

### ⚠️ Funcionalidades incompletas

3. **Store pública (`_store.*`) com dados reais**
   - Rotas `/`, `/produtos`, `/marcas` existem mas não estão integradas com dados reais de forma completa
   - `_store.produtos.$slug.tsx` tem wishlist — se manter store pública, remover wishlist ou substituir por "Adicionar ao pedido"
   - Status: baixa prioridade (catálogo `/catalogo/{slug}` é o foco)

4. **Dashboard com dados reais**
   - `/admin` (dashboard) mostra cards mas pode precisar de dados reais de pedidos pendentes
   - Status: média prioridade

5. **Notificações de pedidos**
   - Ao criar pedido, não há notificação por email ao brand_admin
   - `getNotificationSettings()` existe mas sem implementação de envio
   - Status: baixa prioridade

6. **Múltiplos brand_admins por marca**
   - Atualmente: 1 usuário por marca (limitação por design)
   - Status: decisão pendente

7. **Domínio personalizado por marca**
   - Atual: `/catalogo/{slug}`
   - Futuro possível: `{slug}.catalogo.com.br` (subdomínio)
   - Status: decisão técnica pendente

### ✅ Coisas que precisam ser testadas após deploy

- Upload Cloudinary funciona end-to-end (dependente de Fix manual no preset)
- Catálogo carrega corretamente com Firestore rules ativas
- Fluxo completo: catálogo → produto → carrinho → WhatsApp → pedido salvo
- Login de brand_admin com acesso restrito à sua marca

---

## 12. UX E REGRAS DO PRODUTO

### Filosofia: Catálogo de orçamento atacadista

O catálogo NÃO é um e-commerce convencional. É uma vitrine B2B atacadista:

- ✅ **"Adicionar ao pedido"** — sempre (nunca "adicionar ao carrinho")
- ✅ **Pedido via WhatsApp** — o checkout é via mensagem WhatsApp
- ✅ **Preço visível** — mas não há "Comprar agora"
- ✅ **Orçamento** — o comprador monta o orçamento e envia via WhatsApp
- ❌ **Não usar wishlist** — removida do catálogo público
- ❌ **Não implementar pagamento online** — fora do escopo
- ❌ **Não usar linguagem de e-commerce** (ex: "Finalizar compra", "Meu carrinho")

### Design system
- Background: `#fafaf7` (off-white quente)
- Texto: `#0f0f0f`
- Muted: `#6b6b6b`
- Border: `#e6e4dd`
- **Sem border-radius** — tudo quadrado (design minimalista editorial)
- Fonte título: Playfair Display (`font-display`)
- Fonte corpo: Inter

### Mobile UX
- CartDrawer: abre pela direita, full-width no mobile
- Botão flutuante "Ver pedido · N itens" aparece no mobile quando `cart.count > 0`
- Toast de confirmação ao adicionar produto (2.5s)
- Grade de produtos: 2 colunas mobile, 3-4 desktop

---

## 13. REGRAS PARA FUTURAS SESSÕES

### Ao iniciar uma nova sessão

1. **Leia HANDOFF_CONTEXT.md inteiro** antes de qualquer ação
2. Leia também `PROJECT_CONTEXT.md` e `ARCHITECTURE.md` para contexto adicional
3. Confirme o estado atual do projeto com `git log --oneline -5`
4. Se houver dúvida sobre o código, leia o arquivo fonte — não suponha

### Regras absolutas de desenvolvimento

1. **Nunca sobrescrever** estes arquivos com versão do Lovable:
   - `src/lib/firebase.ts`
   - `src/lib/api.ts`
   - `src/lib/users.ts`
   - `src/contexts/AuthContext.tsx`
   - `src/hooks/use-cart.ts`
   - `src/services/cloudinaryService.ts`
   - `src/services/orderService.ts`
   - `src/main.tsx`
   - `index.html`
   - `vite.config.ts`
   - `vercel.json`
   - `firestore.rules`
   - `.env`

2. **Nunca salvar blob: URL no Firestore** — apenas `secure_url` do Cloudinary

3. **Nunca enviar `undefined` para Firestore** — sempre usar `cleanForFirestore()` de `@/lib/utils`

4. **Sempre usar `b.active === false`** para checar se marca está inativa (não `!b.active`)

5. **Upload Cloudinary** — FormData com apenas `file` + `upload_preset`. Nunca adicionar `api_key`.

6. **Ao alterar Firestore rules**, sempre deploiar:
   ```bash
   cd C:\catalogo-moda-final
   firebase deploy --only firestore:rules
   ```

7. **Filtrar por brandId** em todas as queries quando o usuário for brand_admin

8. **`computeProductStatus(variants)`** é chamado automaticamente em `saveProduct()` — não manipular status manualmente

9. **Não recriar a arquitetura** — o sistema está funcionando. Trabalhar em etapas pequenas e cirúrgicas.

10. **Sempre rodar `npm run build`** antes de commitar para verificar TypeScript

### Fluxo de deploy

```bash
# Código
cd C:\catalogo-moda-final
npm run build          # verificar TypeScript
git add <arquivos>     # nunca git add -A (evitar commitar .env)
git commit -m "tipo: descrição"
git push               # Vercel auto-deploy

# Firestore Rules (apenas quando mudar firestore.rules)
firebase deploy --only firestore:rules

# Vercel env vars (apenas quando mudar)
vercel env rm NOME_DA_VAR production --yes
printf "novo_valor" | vercel env add NOME_DA_VAR production
git push  # trigger rebuild com novos valores
```

### Fluxo com Lovable
Quando o usuário trouxer ZIP novo do Lovable:
1. Extrair ZIP
2. Copiar apenas os arquivos de UI/componentes novos
3. **NUNCA sobrescrever** os arquivos críticos listados acima
4. Integrar novos componentes com o sistema existente (Firebase, api.ts)
5. Testar build

---

## 14. PRÓXIMAS ETAPAS — BACKLOG PRIORIZADO

### 🔴 Alta prioridade (bloqueadores)

- [ ] **Verificar/criar usuário `augustocross87@gmail.com`** no Firebase Auth do projeto `catalogo-69b3a`
- [ ] **Configurar preset `catalogo_moda_unsigned` como Unsigned** no Cloudinary
- [ ] **Testar fluxo completo end-to-end** em produção após fixes acima
- [ ] **Criar marca e produto de teste** para validar catálogo público

### 🟡 Média prioridade (funcionalidades core)

- [ ] **Dashboard com pedidos pendentes** — `/admin/index.tsx` mostrar count de pedidos "novo"
- [ ] **Produtos sem foto** no dashboard (já existe `getLowStockCount`, adicionar sem foto)
- [ ] **Store pública** (`/`, `/produtos`, `/marcas`) — remover wishlist, integrar com dados reais
- [ ] **Detalhe de produto na store** (`/produtos/{slug}`) — remover wishlist, adicionar "Pedido via WhatsApp"
- [ ] **Campo de busca funcional** no header da store pública

### 🟢 Baixa prioridade (melhorias)

- [ ] **Notificações de pedidos** — email ao brand_admin quando chega pedido novo
- [ ] **Exportar catálogo em PDF** — lista de produtos para enviar offline
- [ ] **Analytics** — quantos acessos por marca, quais produtos mais vistos
- [ ] **Domínio personalizado** — subdomínio `{slug}.catalogo.com.br` por marca (requer Vercel rewrites avançados)
- [ ] **Múltiplos brand_admins** — mais de 1 usuário por marca
- [ ] **Calendário editorial** — integração com Social Media Pro (outro projeto do Augusto)
- [ ] **QR Code do catálogo** — botão para gerar QR do link público
- [ ] **Importar produtos por CSV** — para marcas com muitos produtos
- [ ] **Banners funcionais na homepage** — consumir `getBanners()` nas rotas `_store.*`
- [ ] **Wishlist como "lista de favoritos"** — guardar produtos de interesse para rever depois
- [ ] **Variantes em subcoleção** — mover `variants` de campo do produto para subcoleção (escala melhor)

---

## 15. REFERÊNCIAS RÁPIDAS

### Links
- **Site:** https://catalogo-moda.vercel.app
- **GitHub:** https://github.com/augustocross87/catalogo-moda
- **Firebase Console:** https://console.firebase.google.com/project/catalogo-69b3a
- **Vercel Dashboard:** https://vercel.com/m1sterata-projects/catalogo-moda
- **Cloudinary:** https://cloudinary.com/console (cloud: doitolog3)

### Credenciais Firebase
```
Project ID:      catalogo-69b3a
Auth Domain:     catalogo-69b3a.firebaseapp.com
Storage Bucket:  catalogo-69b3a.firebasestorage.app
Messaging ID:    914185303194
App ID:          1:914185303194:web:6fcc08a3e49f29ffeedb23
API Key:         AIzaSyDC6Fdxj5JGVUx4q266c65ujWPEZM2XkGI
```

### Variáveis de ambiente completas (.env e Vercel)
```
VITE_FIREBASE_API_KEY=AIzaSyDC6Fdxj5JGVUx4q266c65ujWPEZM2XkGI
VITE_FIREBASE_AUTH_DOMAIN=catalogo-69b3a.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=catalogo-69b3a
VITE_FIREBASE_STORAGE_BUCKET=catalogo-69b3a.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=914185303194
VITE_FIREBASE_APP_ID=1:914185303194:web:6fcc08a3e49f29ffeedb23
VITE_CLOUDINARY_CLOUD_NAME=doitolog3
VITE_CLOUDINARY_UPLOAD_PRESET=catalogo_moda_unsigned
```

### Comandos úteis
```bash
# Desenvolvimento local
cd C:\catalogo-moda-final
npm run dev

# Build e verificação TypeScript
npm run build

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Verificar env vars Vercel
vercel env ls

# Atualizar env var no Vercel
vercel env rm NOME production --yes
printf "valor" | vercel env add NOME production
```

### Arquivos mais editados (por funcionalidade)
| O que mudar | Arquivo |
|---|---|
| Catálogo público | `src/routes/catalogo.$slug.tsx` |
| Carrinho / checkout | `src/components/store/CartDrawer.tsx` |
| Pedidos no admin | `src/routes/admin.pedidos.tsx` |
| Formulário de marca | `src/routes/admin.marcas.tsx` |
| Formulário de produto | `src/components/admin/ProductForm.tsx` |
| Usuários (brand_admins) | `src/routes/admin.usuarios.tsx` + `src/lib/users.ts` |
| CRUD Firestore (todos) | `src/lib/api.ts` |
| Uploads de imagem | `src/services/cloudinaryService.ts` |
| Pedidos WhatsApp | `src/services/orderService.ts` |
| Autenticação | `src/contexts/AuthContext.tsx` |
| Sidebar admin | `src/routes/admin.tsx` |
| Segurança Firestore | `firestore.rules` (deploiar via CLI) |
