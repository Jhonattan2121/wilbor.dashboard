# 🎨 Wilbor Dashboard

Dashboard profissional para gerenciar e publicar posts no blockchain Hive, com editor de markdown avançado, upload de mídia para IPFS e integração completa com Hive Keychain.

## ✨ Funcionalidades

### 📝 Editor de Posts
- **Editor de Markdown Avançado** com toolbar completa
- **Preview em tempo real** lado a lado
- **Sistema de tags inteligente** com sugestões populares do Hive
- **Upload de mídia** (imagens e vídeos) para IPFS via Pinata
- **Templates prontos** para diferentes tipos de post
- **Auto-save** de rascunhos no localStorage
- **Estatísticas em tempo real** (palavras, caracteres, tempo de leitura)
- **Atalhos de teclado** para formatação rápida

### 🔐 Autenticação
- **Hive Keychain** - Login via extensão do navegador
- **Chave privada** - Login alternativo com chave criptografada
- Sessão persistente no localStorage

### 📄 Páginas Disponíveis
- **Dashboard** (`/dashboard`) - Gerenciamento de posts e projetos
- **Projects** (`/projects`) - Visualização de projetos com filtros por tags
- **About** (`/about`) - Página sobre com conteúdo dinâmico do Hive
- **Exhibitions** (`/exhibitions`) - Exposições e prêmios
- **Partners** (`/partners`) - Parceiros e colaborações
- **Contact** (`/contact`) - Informações de contato

### 🎯 Recursos Principais
- ✅ Criar novos posts no Hive
- ✅ Editar posts existentes com tags preservadas
- ✅ Upload de imagens e vídeos para IPFS
- ✅ Gerenciamento de tags com sugestões inteligentes
- ✅ Editor markdown com preview
- ✅ Suporte a múltiplas mídias por post
- ✅ Seleção de thumbnail
- ✅ Interface responsiva (mobile-first)
- ✅ Tema claro/escuro
- ✅ Integração completa com Hive blockchain

## 🛠️ Tecnologias

- **Next.js 15.5.9** - Framework React
- **React 19** - Biblioteca UI
- **TypeScript** - Tipagem estática
- **Tailwind CSS 4.0** - Estilização
- **@hiveio/dhive** - Cliente Hive blockchain
- **IPFS/Pinata** - Armazenamento de mídia
- **Hive Keychain** - Autenticação

## 📦 Instalação

### Pré-requisitos
- Node.js 18+ 
- Yarn ou pnpm
- Conta Hive
- Hive Keychain instalado (opcional, mas recomendado)
- Token Pinata Gateway (para upload de mídia)

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/wilbor.dashboard.git
cd wilbor.dashboard
```

### 2. Instale as dependências

```bash
yarn install
# ou
pnpm install
```

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Hive Configuration
NEXT_PUBLIC_HIVE_USERNAME=seu-usuario-hive

# Pinata IPFS (para upload de mídia)
NEXT_PUBLIC_PINATA_GATEWAY_TOKEN=seu-token-pinata

# Site Configuration (opcional)
NEXT_PUBLIC_SITE_TITLE=Wilbor Dashboard
NEXT_PUBLIC_SITE_DESCRIPTION=Dashboard para gerenciar posts no Hive
NEXT_PUBLIC_SITE_DOMAIN=seu-dominio.com
```

### 4. Execute o projeto

```bash
# Desenvolvimento
yarn dev

# Build de produção
yarn build

# Iniciar servidor de produção
yarn start
```

O projeto estará disponível em `http://localhost:3000`

## 🚀 Uso

### Primeiro Acesso

1. Acesse `/dashboard` ou `/`
2. Faça login com:
   - **Hive Keychain**: Clique em "Login com Keychain" e confirme na extensão
   - **Chave Privada**: Digite seu usuário e chave privada (criptografada)

### Criar um Post

1. Após fazer login, clique em **"Criar Post"**
2. Preencha o título
3. Use o editor markdown para escrever o conteúdo
4. Adicione tags (use as sugestões ou digite novas)
5. Faça upload de imagens/vídeos se desejar
6. Selecione a thumbnail (primeira imagem exibida)
7. Clique em **"Publicar"** e confirme no Hive Keychain

### Editar um Post

1. No dashboard, encontre o post que deseja editar
2. Clique no botão **"Editar"**
3. Modifique título, conteúdo, tags ou mídia
4. Clique em **"Atualizar Post"** e confirme no Hive Keychain

### Gerenciar Tags

- As tags são extraídas automaticamente dos posts existentes
- Use o sistema de sugestões para adicionar tags populares
- Máximo de 10 tags por post
- Tags são salvas no `json_metadata` do post no Hive

## 📁 Estrutura do Projeto

```
wilbor.dashboard/
├── app/
│   ├── dashboard/          # Componentes do dashboard
│   │   ├── CreatePostButton.tsx
│   │   ├── EditPostButton.tsx
│   │   ├── ImprovedCreatePostButton.tsx
│   │   ├── ImprovedEditPostButton.tsx
│   │   ├── MediaUploader.tsx
│   │   └── HiveLogin.tsx
│   ├── about/              # Página About
│   ├── exhibitions/        # Página Exhibitions
│   ├── partners/           # Página Partners
│   ├── contact/            # Página Contact
│   ├── projects/           # Página Projects
│   └── api/                # API routes
├── src/
│   ├── components/         # Componentes reutilizáveis
│   │   ├── AdvancedMarkdownEditor.tsx
│   │   ├── PostContentEditorPreview.tsx
│   │   ├── TagSuggestions.tsx
│   │   └── MarkdownRenderer.tsx
│   ├── hooks/              # React hooks
│   │   └── useDraftSaver.ts
│   ├── lib/
│   │   └── hive/           # Cliente Hive
│   └── utils/
│       └── ipfs.ts         # Utilitários IPFS
└── public/                 # Arquivos estáticos
```

## 🔧 Configuração Avançada

### Variáveis de Ambiente Opcionais

#### Conteúdo
- `NEXT_PUBLIC_SITE_TITLE` - Título do site (aparece na aba do navegador)
- `NEXT_PUBLIC_SITE_DESCRIPTION` - Descrição do site
- `NEXT_PUBLIC_SITE_ABOUT` - Conteúdo sobre (aceita HTML: `<b>`, `<i>`, `<br>`)

#### Performance
- `NEXT_PUBLIC_STATICALLY_OPTIMIZE_PHOTOS = 1` - Otimização estática de páginas
- `NEXT_PUBLIC_PRESERVE_ORIGINAL_UPLOADS = 1` - Preserva uploads originais sem compressão
- `NEXT_PUBLIC_IMAGE_QUALITY = 1-100` - Qualidade das imagens (padrão: 75)

#### Visual
- `NEXT_PUBLIC_DEFAULT_THEME = light | dark` - Tema padrão
- `NEXT_PUBLIC_MATTE_PHOTOS = 1` - Adiciona borda ao redor das fotos

#### Display
- `NEXT_PUBLIC_HIDE_EXIF_DATA = 1` - Oculta dados EXIF
- `NEXT_PUBLIC_HIDE_ZOOM_CONTROLS = 1` - Oculta controles de zoom
- `NEXT_PUBLIC_HIDE_SOCIAL = 1` - Remove botão de compartilhamento social

## 📖 Documentação Adicional

- **README_EDITOR.md** - Documentação completa do editor de posts
- **EDITOR_IMPROVEMENTS.md** - Melhorias implementadas no editor
- **README_EDITOR.md** - Guia de uso do editor

## 🐛 Troubleshooting

### Tags não aparecem ao editar
- Certifique-se de que as tags estão sendo extraídas do `json_metadata` do post
- Verifique os logs do console para debug
- As tags são carregadas automaticamente quando o modal de edição é aberto

### Upload de mídia falha
- Verifique se o token do Pinata está configurado corretamente
- Confirme que o token tem permissões de upload
- Verifique a conexão com a internet

### Erro de autenticação Hive
- Certifique-se de que o Hive Keychain está instalado e desbloqueado
- Para login com chave privada, use a chave de posting (não a active ou owner)
- Verifique se o usuário tem permissões de posting

### Build falha no Vercel
- Certifique-se de usar Next.js 15.5.9 ou superior (corrige CVE-2025-66478)
- Verifique todas as variáveis de ambiente necessárias
- Confirme que todas as dependências estão no `package.json`

## 🔒 Segurança

- ⚠️ **Nunca** exponha chaves privadas em variáveis `NEXT_PUBLIC_*`
- ⚠️ Use sempre variáveis de ambiente para credenciais sensíveis
- ⚠️ Chaves privadas são criptografadas antes de serem armazenadas no localStorage
- ⚠️ Sempre use HTTPS em produção

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🙏 Agradecimentos

- Comunidade Hive por suporte e feedback
- Equipe do Next.js pelo framework incrível
- Pinata pelo serviço de IPFS
- Todos os contribuidores do projeto

---

**Desenvolvido com ❤️ para a comunidade Hive 🐝**
