# ARCHITECTURE.md — Catálogo de Moda SaaS

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | React 19 + TypeScript 5.8 |
| Roteamento | TanStack React Router v1 (file-based) |
| Build | Vite 7 |
| Estilos | Tailwind CSS 4 |
| Componentes UI | shadcn/ui + Radix UI + Lucide icons |
| Forms | React Hook Form + Zod |
| Server state | TanStack React Query v5 |
| Auth | Firebase Authentication (e-mail/senha) |
| Banco de dados | Firebase Firestore |
| Imagens | Cloudinary (upload unsigned preset) |
| Deploy | Vercel (SPA rewrite) |

---

## Estrutura de pastas

```
src/
├── components/
│   ├── admin/
│   │   └── ProductForm.tsx        # Formulário completo de produto com variantes e imagens
│   ├── store/
│   │   ├── CartDrawer.tsx         # Drawer lateral do carrinho
│   │   ├── LoginModal.tsx         # Modal de login na store pública
│   │   ├── ProductCard.tsx        # Card de produto na grade
│   │   ├── SearchModal.tsx        # Modal de busca global
│   │   └── StoreChrome.tsx        # Header + footer da store pública
│   ├── ui/                        # Componentes shadcn/Radix (30+ arquivos)
│   ├── SlideOver.tsx              # Painel lateral genérico (admin)
│   └── ui-prim.tsx                # Primitivos: Btn, Field, TextInput, Select, TextArea
│
├── contexts/
│   └── AuthContext.tsx            # Provider de autenticação Firebase
│
├── hooks/
│   ├── use-cart.ts                # Carrinho por marca (localStorage: cart:{brandSlug})
│   ├── use-wishlist.ts            # Wishlist (localStorage: wishlist)
│   └── use-mobile.tsx             # Hook de breakpoint mobile
│
├── lib/
│   ├── firebase.ts                # Inicialização Firebase (auth + db)
│   ├── api.ts                     # Camada de dados: Firestore CRUD + helpers
│   ├── users.ts                   # Gerenciamento de usuários (super_admin)
│   └── utils.ts                   # cleanForFirestore, cn(), etc.
│
├── routes/                        # File-based routing (TanStack Router)
│   ├── __root.tsx                 # Raiz: QueryClientProvider, 404, ErrorBoundary
│   ├── _store.tsx                 # Layout da store pública (StoreChrome)
│   ├── _store.index.tsx           # Homepage
│   ├── _store.lookbook.tsx        # Lookbook editorial
│   ├── _store.marcas.index.tsx    # Lista de marcas
│   ├── _store.marcas.$slug.tsx    # Página da marca
│   ├── _store.produtos.index.tsx  # Catálogo geral
│   ├── _store.produtos.$slug.tsx  # Detalhe do produto
│   ├── admin.tsx                  # Layout admin (sidebar + proteção de rota)
│   ├── admin.login.tsx            # Tela de login
│   ├── admin.index.tsx            # Dashboard (stats, cards)
│   ├── admin.marcas.tsx           # CRUD de marcas (super_admin only)
│   ├── admin.categorias.tsx       # CRUD de categorias
│   ├── admin.produtos.index.tsx   # Listagem de produtos com filtros
│   ├── admin.produtos.novo.tsx    # Criar produto
│   ├── admin.produtos.$id.editar.tsx  # Editar produto
│   ├── admin.usuarios.tsx         # Gerenciar usuários (super_admin only)
│   ├── admin.configuracoes.tsx    # Configurações (4 abas)
│   ├── catalogo.$slug.tsx         # Catálogo público por marca
│   └── routeTree.gen.ts           # Gerado pelo TanStack Router (não editar)
│
└── services/
    ├── cloudinaryService.ts       # Upload, URL otimizada, validação
    └── orderService.ts            # Criação e leitura de pedidos + WhatsApp

main.tsx                           # Entry point: AuthProvider → QueryClient → Router
router.tsx                         # createRouter com routeTree.gen
vercel.json                        # SPA rewrite: source="/(.*)" → "/index.html"
firestore.rules                    # Regras de segurança do Firestore
```

---

## Firestore — coleções

| Coleção | Acesso leitura | Acesso escrita |
|---|---|---|
| `brands/{id}` | Público | super_admin, admin |
| `products/{id}` | Público | super_admin, admin, brand_admin da marca |
| `categories/{id}` | Público | super_admin, admin, brand_admin (só da sua marca) |
| `banners/{id}` | Público | super_admin, admin, brand_admin (só da sua marca) |
| `config/store` | Público | super_admin, admin |
| `config/store-{brandId}` | Público | super_admin, admin |
| `config/notifications` | Público | super_admin, admin |
| `vendors/{id}` | super_admin, admin | super_admin, admin |
| `users/{uid}` | próprio, super_admin, admin | próprio (update), super_admin, admin |
| `orders/{id}` | super_admin, admin, brand_admin | create: qualquer um; update: super_admin, admin, brand_admin |

### Schema dos documentos principais

**Brand**
```typescript
{ id, name, slug, tagline, description?, logoUrl?, bannerUrl?,
  primaryColor, secondaryColor?, website?, instagram?, whatsapp?,
  active, createdAt, updatedAt, createdBy? }
```

**Product**
```typescript
{ id, name, slug, brandId, basePrice, salePrice|null, status,
  isNew, isFeatured?, gender, tags[], description?, images[],
  variants[{ size, colorName, color, sku, stock }],
  categoryId?, createdAt, updatedAt }
```

**Category**
```typescript
{ id, name, slug, icon, parentId|null, order, brandId? }
```

**Banner**
```typescript
{ id, brandId?, title, subtitle?, imageUrl?, buttonText?, buttonLink?,
  position, order, active }
```

**Order**
```typescript
{ id, brandId, brandName, customerName, customerPhone, observations?,
  items[CartItem & { subtotal }], total, status, source: "catalog",
  catalogUrl, whatsappMessage, createdAt, updatedAt }
```

**User (Firestore)**
```typescript
{ uid, email, name, role: "admin"|"client", brandId?,
  active, createdAt, createdBy?, phone?, notes? }
```

**StoreSettings** (docId: `store` ou `store-{brandId}`)
```typescript
{ name, tagline, description, logoUrl?, faviconUrl?,
  primaryColor, secondaryColor, whatsapp? }
```

---

## AuthContext — fluxo de autenticação

```
Firebase onAuthStateChanged
  → fetchUserProfile(uid, email)
      → getDoc("users/{uid}")           # tenta Firestore
      → fallback: email === SUPER_ADMIN_EMAIL ? role="admin" : role="client"
  → setUser(AuthUser)

AuthUser { uid, email, role, name?, brandId? }
isAdmin     = role === "admin"
isBrandAdmin = role === "client" && !!brandId
```

**Proteção de rotas no admin:** `admin.tsx` redireciona para `/admin/login` se `!user`.
Páginas `admin.marcas` e `admin.usuarios` redirecionam para `/admin` se `!isAdmin`.

---

## Criação de usuário brand_admin

O super_admin usa `/admin/usuarios` → botão "Novo cliente":
1. `createClientUser()` chama Firebase Auth REST (`accounts:signUp`) — não desloga o admin atual
2. Salva metadados em `users/{uid}` com `role: "client"` e `brandId`
3. Brand_admin faz login em `/admin/login` com e-mail + senha criados pelo admin

---

## Cloudinary — regras de uso

- **Upload:** `uploadImage(file, folder, onProgress?)` → `CloudinaryUploadResult`
- **URL simples:** `uploadImageUrl(file, folder)` → `string` (secure_url)
- **URL otimizada:** `getOptimizedUrl(url, { width, height, crop, quality, format })`
- **Pasta padrão:** `catalogo-saas/{logos|banners|products}`
- **NUNCA** salvar `blob:` URLs no Firestore — apenas `secure_url`
- `sanitizeImageUrl()` em `api.ts` rejeita automaticamente blob: URLs antes de salvar

---

## Carrinho — escopo por marca

```
localStorage key: "cart:{brandSlug}"
CartState { brandSlug, brandId, items: CartItem[] }
CartItem { productId, productName, productSlug, image?, selectedSize?,
           selectedColor?, selectedColorName?, quantity, unitPrice, sku? }
```

Carrinho não mistura produtos de marcas diferentes. Se o usuário abre o catálogo de
outra marca, um novo `useCart(brandSlug)` começa do zero.

---

## Status de produto — computação automática

`computeProductStatus(variants, currentStatus)`:
- Se `totalStock === 0` → `"esgotado"`
- Se `currentStatus === "esgotado"` e `totalStock > 0` → `"publicado"`
- Senão → mantém `currentStatus`

Chamado automaticamente em `saveProduct()` antes de persistir.

---

## Catálogo público `/catalogo/{slug}`

- Busca marca por slug: `getBrandBySlug(slug)`
- Filtra produtos: `getProducts({ brandId: brand.id, status: "publicado" })`
- Aplica cores da marca via CSS custom properties: `--brand-primary`, `--brand-secondary`
- Filtro por categoria + busca textual no client-side
- "Pedir via WhatsApp" no header → abre `wa.me/{brand.whatsapp}`
- Se marca inativa ou não encontrada → tela 404 inline

---

## Arquivos críticos — NUNCA sobrescrever com Lovable

| Arquivo | Por quê |
|---|---|
| `src/lib/firebase.ts` | Credenciais Firebase reais |
| `src/lib/api.ts` | Toda a camada de dados Firestore |
| `src/lib/users.ts` | Gerenciamento de usuários |
| `src/services/cloudinaryService.ts` | Upload real Cloudinary |
| `src/services/orderService.ts` | Lógica de pedidos e WhatsApp |
| `src/contexts/AuthContext.tsx` | Auth Firebase real |
| `src/hooks/use-cart.ts` | Carrinho por marca |
| `src/main.tsx` | Entry point SPA |
| `vite.config.ts` | Build sem TanStack Start |
| `vercel.json` | SPA rewrite |
| `firestore.rules` | Segurança Firestore |
| `.env` | Variáveis de ambiente |
