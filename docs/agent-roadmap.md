# Slidezz Agent: roadmap

Objetivo: o usuário conversa com o Slidezz como o Luciano conversa com o Claude Code. Cola um link do TikTok, o agente baixa, entende o post, recria no Slidezz, mostra o preview, ajusta no papo e, quando o usuário manda, agenda/posta.

## Decisões

- **Sem Agent SDK.** O Claude Agent SDK é Node/Python e traz bash + filesystem: num SaaS multi-usuário isso pede sandbox por usuário. O agente aqui precisa de ferramentas do Slidezz, não de terminal.
- **Messages API + tool runner, dentro do Laravel.** SDK oficial `anthropic-ai/sdk` (PHP), `$client->beta->messages->toolRunner()` com `BetaRunnableTool`. Cada mensagem do usuário vira um job na fila (`RunAgentTurn`). Managed Agents fica pra depois (BYOK lá exige criar um agent na org de cada usuário).
- **Modelo:** `claude-opus-5-5` (config `services.anthropic.agent_model`), effort `medium`. Sonnet 5.5 é a opção mais barata, mas é decisão do Luciano.
- **BYOK:** chave de API da Anthropic (`sk-ant-api...`), criptografada no `users`, igual ao `gemini_api_key`. Login da assinatura Claude Pro/Max não vale: a Anthropic não permite em app de terceiro. Sem chave: chave da plataforma + créditos (`hasCredits()` / `deductCredit()`), 1 crédito por turno.
- **Histórico só cresce (append-only).** Guarda o `content` inteiro de cada resposta (thinking incluso) e devolve igual. Nunca editar mensagem antiga.
- **Postar exige clique.** A ferramenta de agendar só cria um pedido pendente; quem publica é o botão "Confirmar" na tela.
- **Clonar = estrutura, não conteúdo.** Gancho, nº de slides, ritmo, layout e estilo de texto. Imagens e texto são refeitos. A mídia original serve só de referência pro modelo, nunca é repostada.

## Ferramentas do agente (v1)

| Ferramenta | O que faz | Reaproveita |
|---|---|---|
| `fetch_tiktok(url)` | tikwm: imagens do carrossel ou mp4 (+ 6 frames via ffmpeg), legenda, música, stats. Salva em storage | Asset / MediaLibrary |
| `view_assets(ids[])` | Devolve as imagens pro modelo ver (tool_result com image blocks) | |
| `build_slideshow(title, preset, text_position, slides[{text, image}])` | Cria/atualiza o ContentProject slideshow da conversa e renderiza cada slide em JPEG; devolve os JPEGs pro modelo se autoavaliar | ContentProject + SlideshowRenderer (mesmo caminho do GenerateSlideshow) |

Por que slideshow e não SlideProject (Konva) na v1: o Konva só vira imagem no navegador; o slideshow renderiza no servidor e já entra no Schedule/PublishScheduledContent. "Abrir no editor Konva" fica pra Fase 2.
| `generate_image(prompt)` | Imagem nova | AiImageSource / CarouselGenerationService |
| `search_images(query)` | Pinterest + biblioteca | PinterestImageSource, MediaMatcher |
| `list_social_accounts()` | Contas conectadas | SocialAccount |
| `request_publish(project_id, account_id, publish_at, caption)` | Cria pedido pendente; UI mostra "Confirmar" | Schedule + PublishScheduledContent |

## Fases

### Fase 0, hoje: o loop funcionando
1. `composer require anthropic-ai/sdk`; config `services.anthropic` (`key`, `agent_model`).
2. Migrations: `users.anthropic_api_key` (encrypted), `agent_conversations` (user, workspace, title, slide_project_id, status), `agent_messages` (conversation, role, content json, usage json), `agent_publish_requests` (conversation, project, account, publish_at, caption, status).
3. `App\Services\Agent\AgentRunner`: monta system prompt + ferramentas, roda o tool runner, grava cada mensagem, para em 25 iterações.
4. `App\Jobs\RunAgentTurn`: escolhe chave (BYOK ou plataforma + crédito), roda o turno, marca status `idle`/`error`.
5. Ferramentas: `fetch_tiktok`, `view_assets`, `build_slideshow`, `search_images`, `generate_image`.
6. Tela Inertia `/agent` e `/agent/{conversation}`: chat à esquerda, preview dos slides renderizados à direita, polling de 1,5 s enquanto `status = running`.
7. Settings > Integrations: campo da chave Anthropic.
8. Testes Feature com o client da Anthropic mockado (nada de chamada real no CI).

### Fase 1, hoje se der: imagem e postagem
`list_social_accounts`, `request_publish` + botão Confirmar que cria o Schedule.

### Fase 2: acabamento
Streaming (SSE ou Reverb), prompt caching no system + tools, compaction, custo por conversa na tela, rate limit, anexar imagem no chat.

### Fase 3: vídeo e marca
TikTok em vídeo → VideoProject, voz (ElevenLabs), brand kit do workspace no system prompt, memória por workspace.

## Pronto quando
Colo um link de carrossel do TikTok → em até 3 min tenho um SlideProject com o mesmo nº de slides e a mesma estrutura de gancho, imagens novas, preview no chat → peço "agenda amanhã 18h na conta X" → aparece o Confirmar → clico → o post entra no calendário.

## Regras de execução
- Branch `agent-mvp`. Nada na `main` sem o Luciano aprovar; push na `main` dispara deploy pelo Actions.
- Nunca `git stash`; conferir `git diff --cached --stat` antes de commitar.
- `php artisan test` verde antes de qualquer merge.
