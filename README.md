# Cena Certa

Catálogo de filmes com chat de recomendações por IA generativa.

## API

O endpoint `POST /api/chat` usa o modelo `gemini-3.5-flash-lite` da Gemini Developer API. Configure `GEMINI_API_KEY` como segredo no ambiente do Site. A chave não deve ser adicionada ao HTML, ao repositório ou ao manifesto de hospedagem.

O projeto preserva sugestões locais quando `dist/index.html` é aberto como arquivo. Nesse modo, o chat indica explicitamente que a IA hospedada não está disponível.

## Build

```powershell
python scripts/build-worker.py
node --check dist/server/index.js
```

O build incorpora `dist/index.html` em `dist/server/index.js`, servido pelo Worker junto com a rota da API. O manifesto `.openai/hosting.json` identifica o Site e usa deploy com Worker.

## Servidor local

Instale o Node.js LTS no Windows. Abra o arquivo `.env.local` na pasta do projeto e preencha a linha `GEMINI_API_KEY=` com uma chave nova do Google AI Studio. Depois, no PowerShell, dentro da pasta `cena-certa`:

```powershell
node scripts/dev-server.mjs
```

Abra `http://localhost:8787`. Para parar, pressione `Ctrl+C`. O comando também abre o catálogo sem chave, mas o chat generativo só responde depois de configurar `GEMINI_API_KEY`. O servidor lê os arquivos atuais ao iniciar; reinicie-o após editar a página ou a chave. O arquivo `.env.local` fica fora do Git e do pacote de entrega; não o compartilhe.

## Limites

A cota gratuita e a disponibilidade do modelo dependem do projeto no Google AI Studio. O endpoint mostra mensagens claras quando a chave está ausente, a cota acaba ou a API fica indisponível. Os cartazes são carregados de endereços externos e precisam de conexão com a internet.
