# TASKS_NEXT.md — Próximos passos do Catálogo de Moda SaaS

## Status atual do sistema

| Módulo | Status |
|---|---|
| Auth Firebase (login/logout) | ✅ Implementado |
| AuthContext com roles | ✅ Implementado |
| Painel admin — sidebar + proteção | ✅ Implementado |
| CRUD de Marcas | ✅ Implementado |
| CRUD de Categorias | ✅ Implementado |
| CRUD de Produtos + variantes | ✅ Implementado |
| Upload Cloudinary | ✅ Implementado |
| Gerenciamento de Usuários (brand_admins) | ✅ Implementado |
| Configurações da loja (4 abas) | ✅ Implementado |
| Catálogo público `/catalogo/{slug}` | ✅ Implementado |
| Carrinho por marca (localStorage) | ✅ Implementado |
| Pedido via WhatsApp | ✅ Implementado |
| Salvar pedido no Firestore (createOrder) | ✅ Implementado |
| Firestore Security Rules | ✅ Definidas (pendente aplicar) |
| Listagem de pedidos no admin | ⚠️ Parcial (getOrders existe, UI não) |
| Wishlist | ⚠️ Hook existe, UI básica |
| Store pública (homepage, marcas, produtos) | ⚠️ Rotas existem, conteúdo a revisar |

---

## Pendências imediatas (bloqueadores de produção)

### 1. Aplicar Firestore Security Rules
- Arquivo `firestore.rules` já está pronto na raiz do projeto
- Aplicar via Firebase Console → Firestore → Rules → colar e publicar
- **Ou:** `firebase deploy --only firestore:rules` (requer Firebase CLI)
- Confirmar antes: guest checkout em `orders` é intencional? `config` tem dados sensíveis?

### 2. Criar usuário admin no Firebase Authentication
- Firebase Console → Authentication → Users → Add user
- E-mail: `augustocross87@gmail.com`
- Sem isso, o login em `/admin/login` não funciona

### 3. Criar upload preset no Cloudinary
- Cloudinary Dashboard → Settings → Upload → Upload presets → Add preset
- Nome: `catalogo_unsigned`
- Signing mode: **Unsigned**
- Sem isso, upload de imagens falha silenciosamente

### 4. Testar fluxo completo end-to-end
- [ ] Login admin → criar marca → criar produto com imagem → publicar
- [ ] Acessar `/catalogo/{slug}` → ver produto → clicar WhatsApp
- [ ] Verificar pedido salvo em Firestore
- [ ] Login brand_admin → confirmar que só vê sua marca

---

## Funcionalidades a implementar

### Alta prioridade

#### Listagem de pedidos no admin (brand_admin + super_admin)
- Nova rota: `/admin/pedidos`
- Tabela com: data, cliente, telefone, itens, total, status
- Filtros: por status, por período
- Ação: atualizar status (novo → em_atendimento → pago → enviado → concluído)
- Super_admin vê pedidos de todas as marcas; brand_admin só da sua
- `getOrders(brandId?)` já implementado em `orderService.ts`
- Adicionar "Pedidos" na sidebar de `admin.tsx`

#### Dashboard com dados reais
- `admin.index.tsx` precisa exibir:
  - Total de produtos publicados (filtrado por marca se brand_admin)
  - Produtos com baixo estoque (≤ 5 unidades)
  - Produtos sem foto
  - Pedidos novos pendentes (status: "novo")
  - Total de marcas ativas (só para super_admin)

### Média prioridade

#### Carrinho funcional com pedido completo
- Atualmente o header tem "Pedir via WhatsApp" mas sem modal de confirmação de dados do cliente
- Falta: modal/drawer para colher nome e telefone do cliente antes de enviar WhatsApp
- Falta: chamar `createOrder()` ao confirmar o pedido

#### Página de produto individual no catálogo
- `/catalogo/{slug}` mostra grade de produtos
- Falta: tela de detalhe do produto dentro do catálogo (galeria, variantes, add ao carrinho)
- Atualmente o `CatalogProductCard` não tem link para detalhe

#### Store pública (vitrine geral)
- Rotas `_store.*` existem mas dependem de dados reais
- Homepage (`_store.index.tsx`): hero, novidades, lista de marcas
- `/produtos`: catálogo geral com filtros de categoria, gênero, marca
- `/produtos/{slug}`: detalhe com galeria, variantes, wishlist, carrinho

### Baixa prioridade

#### Banners na store pública
- `getBanners(brandId?)` já implementado
- Falta: renderizar banners na homepage por posição (hero, novidades, etc.)

#### Wishlist funcional
- Hook `use-wishlist.ts` existe mas a UI está básica
- Falta: ícone de coração nos cards, tela `/wishlist` ou drawer

#### Exportar catálogo em PDF
- Listagem de produtos para enviar ao cliente offline

#### Notificações de pedidos
- `getNotificationSettings()` existe
- Falta: implementar envio de e-mail ao criar pedido (Firebase Functions ou serviço externo)

---

## Checklist de lançamento para o primeiro cliente

- [ ] Aplicar Firestore Rules no Console
- [ ] Criar usuário admin no Firebase Auth
- [ ] Criar upload preset `catalogo_unsigned` no Cloudinary
- [ ] Criar marca do cliente no admin
- [ ] Criar usuário brand_admin vinculado à marca
- [ ] Cadastrar produtos da marca com fotos
- [ ] Configurar WhatsApp da marca em `brands.whatsapp`
- [ ] Testar catálogo público em `/catalogo/{slug}`
- [ ] Testar pedido via WhatsApp
- [ ] Testar login do brand_admin com acesso restrito
- [ ] Revisar textos da homepage/store pública
- [ ] Configurar domínio personalizado na Vercel (opcional)

---

## Decisões técnicas pendentes

| Decisão | Opções | Status |
|---|---|---|
| Pedido guest (sem login) | Manter `allow create: if true` ou exigir login | Pendente confirmar |
| Config pública | `config/{configId}` tem leitura pública — verificar se tem dados sensíveis | Pendente revisar |
| Domínio por marca | Subdomínio `{slug}.catalogo.com.br` vs path `/catalogo/{slug}` | Definir antes do lançamento |
| Notificações de pedidos | Firebase Functions vs Resend/SendGrid direto do client | Definir antes do lançamento |
| Múltiplos brand_admins por marca | Atualmente 1 usuário por marca | Definir se necessário |
