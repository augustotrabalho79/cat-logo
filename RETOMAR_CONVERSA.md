# Prompt para retomar o projeto em nova conversa
# Cole o texto abaixo diretamente no chat do Claude

---

Olá! Vamos continuar o desenvolvimento do meu catálogo de moda. Aqui está o contexto completo:

## Projeto: Catálogo Moda

**Pasta local:** `C:\catalogo-moda-final`
**Site:** https://catalogo-moda.vercel.app
**GitHub:** https://github.com/augustocross87/catalogo-moda
**Firebase:** projeto `catalogo-69b3a` (console.firebase.google.com)

## Stack
- React + TypeScript + Vite + TanStack Router (SPA puro, sem SSR)
- Firebase Auth + Firestore (banco de dados)
- Cloudinary para upload de imagens (cloud: `doitoloq3`, preset: `catalogo_unsigned`)
- Vercel para deploy (com `vercel.json` de rewrites SPA)

## Estrutura de pastas importantes
```
C:\catalogo-moda-final\
  src/
    lib/
      firebase.ts       → config Firebase
      api.ts            → todas as funções CRUD + upload
    routes/
      admin.*           → páginas do admin
      _store.*          → páginas públicas
    main.tsx            → entry point SPA
  index.html
  vercel.json           → rewrites SPA
  .env                  → variáveis de ambiente
```

## Firestore — coleções
- `brands` → marcas
- `categories` → categorias
- `products/{id}/variants` → produtos e variantes
- `banners` → banners da loja
- `vendors` → vendedores
- `config/store` → configurações da loja
- `config/notifications` → notificações

## Fluxo de trabalho com Lovable
1. Peço melhorias no Lovable (lovable.dev)
2. Baixo o ZIP via botão `</> Code` → Download
3. Mando o ZIP aqui
4. Claude faz diff, copia arquivos novos, integra Firebase no `api.ts`
5. Claude faz deploy no Vercel automaticamente

## Arquivos que NUNCA devem ser sobrescritos ao receber ZIP novo do Lovable
- `src/lib/firebase.ts`
- `src/lib/api.ts` (precisa manter integração Firebase)
- `src/main.tsx`
- `index.html`
- `vite.config.ts`
- `src/routes/__root.tsx`
- `vercel.json`
- `.env`

## Variáveis de ambiente (.env e Vercel)
```
VITE_FIREBASE_API_KEY=AIzaSyDC6Fdxj5JGVUx4q266c65ujWPEZM2XkGI
VITE_FIREBASE_AUTH_DOMAIN=catalogo-69b3a.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=catalogo-69b3a
VITE_FIREBASE_STORAGE_BUCKET=catalogo-69b3a.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=914185303194
VITE_FIREBASE_APP_ID=1:914185303194:web:6fcc08a3e49f29ffeedb23
VITE_CLOUDINARY_CLOUD_NAME=doitoloq3
VITE_CLOUDINARY_API_KEY=439769159141364
VITE_CLOUDINARY_UPLOAD_PRESET=catalogo_unsigned
```

## Comando de deploy
```powershell
cd C:\catalogo-moda-final
git add -A
git commit -m "feat: descrição"
git push
vercel --prod --yes
```

## Páginas implementadas
### Admin
- `/admin/login` → login Firebase
- `/admin` → dashboard
- `/admin/marcas` → CRUD marcas
- `/admin/categorias` → CRUD categorias
- `/admin/produtos` → listagem + bulk actions
- `/admin/produtos/novo` e `/editar` → formulário completo
- `/admin/configuracoes` → identidade, banners, vendedores, notificações

### Loja pública
- `/` → homepage
- `/produtos` → listagem com filtros
- `/produtos/[slug]` → página do produto
- `/marcas` → lista de marcas
- `/marcas/[slug]` → página da marca
- `/lookbook` → lookbook editorial

## Pendências abertas
- [ ] Criar usuário admin no Firebase Authentication
- [ ] Criar upload preset `catalogo_unsigned` no Cloudinary (Settings → Upload → Unsigned)
- [ ] Configurar Firestore Security Rules
- [ ] Definir nome real da loja (hoje está "Casa Branca")

## Design system
- Background: `#fafaf7` | Texto: `#0f0f0f` | Border: `#e6e4dd`
- Sem border-radius (tudo quadrado)
- Fontes: Playfair Display (títulos) + Inter (corpo)

## Contexto de negócio
- Proprietário: Augusto (Santa Cruz do Capibaribe, PE)
- Mercado-alvo: lojistas do Moda Center Santa Cruz
- Produto em construção — futuramente cobrar setup + mensalidade

Podemos continuar de onde paramos!
