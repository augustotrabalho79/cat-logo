# PROJECT_CONTEXT.md — Catálogo de Moda SaaS

## Visão geral

SaaS multi-marcas para catálogo de moda online. Cada cliente (lojista) tem sua própria marca com
slug único, catálogo público acessível em `/catalogo/{slug}`, e acesso restrito ao painel admin
para gerenciar produtos, categorias, banners e configurações da sua marca.

**Proprietário:** Augusto — Santa Cruz do Capibaribe, PE  
**Mercado-alvo:** Lojistas do Moda Center Santa Cruz  
**Modelo de negócio:** Setup R$ 1.500–3.000 + mensalidade R$ 150–400/mês  
**Fase atual:** Produto em construção, sem cliente real ainda

---

## Links do projeto

| Recurso | URL |
|---|---|
| Site ao vivo | https://catalogo-moda.vercel.app |
| GitHub | https://github.com/augustocross87/catalogo-moda |
| Firebase Console | console.firebase.google.com → projeto `catalogo-69b3a` |
| Cloudinary | cloud name `doitoloq3` |

---

## Credenciais e configuração

### Firebase
- **Project ID:** `catalogo-69b3a`
- **Auth Domain:** `catalogo-69b3a.firebaseapp.com`
- **Região Firestore:** `sa-east-1` (São Paulo)
- **Storage:** NÃO ativado — imagens ficam no Cloudinary

### Cloudinary
- **Cloud name:** `doitolog3`
- **Upload preset:** `catalogo_unsigned` (deve estar em modo **Unsigned**)
- **Tamanho máximo:** 15MB por imagem
- **Atenção:** Upload usa apenas `file` + `upload_preset` — sem api_key, sem signature

### Variáveis de ambiente (.env / Vercel)
```
VITE_FIREBASE_API_KEY=AIzaSyDC6Fdxj5JGVUx4q266c65ujWPEZM2XkGI
VITE_FIREBASE_AUTH_DOMAIN=catalogo-69b3a.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=catalogo-69b3a
VITE_FIREBASE_STORAGE_BUCKET=catalogo-69b3a.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=914185303194
VITE_FIREBASE_APP_ID=1:914185303194:web:6fcc08a3e49f29ffeedb23
VITE_CLOUDINARY_CLOUD_NAME=doitolog3
VITE_CLOUDINARY_UPLOAD_PRESET=catalogo_unsigned
```

---

## Roles do sistema

### `super_admin` — augustocross87@gmail.com
- Identificado pelo e-mail hardcoded em `AuthContext.tsx` (linha 34) e `firestore.rules`
- Acesso total a tudo: marcas, produtos, usuários, pedidos, configurações, vendedores
- Único que pode criar/deletar marcas e criar usuários (brand_admins)
- Vê todos os pedidos de todas as marcas
- Menu admin exibe: Dashboard, Marcas, Categorias, Produtos, **Usuários**, Configurações

### `admin` (role no Firestore) — mesmo nível que super_admin nas regras
- Documento `users/{uid}` com `role: "admin"`
- Nas Firestore Rules, `isAdminRole()` equivale a super_admin para todas as operações
- Usado como fallback caso o super_admin precise de outro usuário com acesso total

### `client` (brand_admin) — lojistas contratantes
- Documento `users/{uid}` com `role: "client"`, `brandId: "<id>"`, `active: true`
- Acessa apenas produtos, categorias e banners da sua própria marca (`brandId`)
- **Não vê** o menu "Marcas" nem o menu "Usuários" no admin
- Pode editar as configurações da sua marca (StoreSettings com docId `store-{brandId}`)
- Criado pelo super_admin em `/admin/usuarios` via Firebase Auth REST API

---

## Estrutura multi-marcas

Cada marca tem:
- `id` — Firestore document ID (gerado automaticamente)
- `slug` — URL-friendly, único, imutável após criação (ex: `vide-art`)
- `brandId` — igual ao `id`
- `primaryColor` / `secondaryColor` — tema visual do catálogo público
- `logoUrl` / `bannerUrl` — imagens no Cloudinary
- `whatsapp` — número para pedidos via WhatsApp

O catálogo público de cada marca fica em `/catalogo/{slug}` e exibe apenas produtos
com `status: "publicado"` da sua marca, usando o tema de cores da marca.

---

## Fluxo de pedidos

1. Cliente visita `/catalogo/{slug}`
2. Visualiza produtos filtrados por categoria/busca
3. Vê tamanhos disponíveis nas variantes do produto
4. Clica em "Pedir via WhatsApp" no header
5. `orderService.generateWhatsAppMessage()` monta mensagem com itens, preços e total
6. `buildWhatsAppLink()` abre `wa.me/{whatsapp}?text=...`
7. `createOrder()` salva o pedido em Firestore (`orders/`) com status `"novo"`
8. Brand_admin acompanha pedidos no painel (implementação parcial)

---

## Fluxo Lovable → Claude → Deploy

1. Augusto pede melhorias de UI no Lovable
2. Lovable gera componentes React (sem backend)
3. Augusto baixa o ZIP via `<> Code → Download`
4. Claude faz diff, copia arquivos novos, integra Firebase em `api.ts`
5. Claude nunca sobrescreve arquivos críticos (ver ARCHITECTURE.md)
6. Deploy via `git push` + Vercel auto-deploy

---

## Regras absolutas do projeto

1. **NUNCA salvar blob: URLs no Firestore** — apenas `secure_url` do Cloudinary
2. **NUNCA sobrescrever** `firebase.ts`, `api.ts`, `main.tsx`, `vercel.json` com versão do Lovable
3. **Sempre usar `cleanForFirestore()`** antes de salvar — remove `undefined`
4. **Sempre filtrar por `brandId`** quando o usuário for brand_admin
5. **Nunca reescrever arrays inteiros** — usar `setDoc` com `merge: true`
6. **Status de produto** é computado automaticamente por `computeProductStatus()` com base no estoque

---

## Deploy

```powershell
cd C:\catalogo-moda-final
git add -A
git commit -m "feat: descrição"
git push
# Vercel faz auto-deploy ao push na branch main
```
