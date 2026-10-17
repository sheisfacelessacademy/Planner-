# ✿ My Planner

A minha app *aesthetic* de gestão do dia a dia — cores suaves, animações delicadas, modo escuro e tudo personalizável.

## Secções

- **Hoje** — saudação, anel de progresso do dia, frase do dia, tarefas (e as que ficaram para trás), rituais, resumo do mês, humor e metas em curso.
- **Planner** — vista semanal, tarefas por dia com etiquetas e “Foco da semana”.
- **Hábitos** — grelha dos últimos 7 dias com séries 🔥.
- **Finanças** — receitas, despesas e saldo por mês, gráfico por categoria, orçamentos, **fixos mensais** (lançados sozinhos no dia certo) e **poupanças**.
- **Diário** — humor, 3 gratidões, escrita livre e calendário de humor.
- **Metas** — intenção do mês, metas com progresso ou com **valor a poupar**.
- **Listas** — compras, refeições da semana, leituras (com estrelas) e **quadro de conteúdos** por marca.
- **Definições** — 6 paletas de cores, 6 estilos de letra, tema claro/escuro, frases próprias, categorias próprias, marcas, sincronização e cópias de segurança.

## Animações

Entrada suave dos cartões, números a contar, gráficos e barras a desenhar-se, confettis ao concluir tarefas/hábitos/metas, emojis a saltar no humor e manchas de cor a flutuar no fundo. Quem tiver “reduzir movimento” ativo no telemóvel não vê animações.

## Publicar (GitHub Pages)

O workflow `.github/workflows/pages.yml` publica a app automaticamente.

1. No GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Faz push (ou corre o workflow à mão em **Actions → Publicar no GitHub Pages → Run workflow**).
3. A app fica em `https://<utilizador>.github.io/<repositório>/`.

Depois abre esse link no telemóvel e escolhe **“Adicionar ao ecrã principal”**. Funciona offline.

## Sincronizar telemóvel ↔ computador (opcional)

Sem configuração, os dados ficam só no dispositivo. Para sincronizar, usa um projeto gratuito do [Supabase](https://supabase.com):

1. Cria um projeto e, no **SQL Editor**, corre:

   ```sql
   create table planner_state (
     user_id uuid primary key references auth.users on delete cascade,
     data jsonb not null,
     updated_at timestamptz not null default now()
   );
   alter table planner_state enable row level security;
   create policy "A minha linha" on planner_state
     for all using (auth.uid() = user_id)
     with check (auth.uid() = user_id);
   ```

2. Em **Authentication → URL Configuration**, põe o link da app em *Site URL*.
3. Em **Project Settings → API**, copia o *Project URL* e a *anon public key* para **Definições → Sincronização** na app.
4. Entra com o teu email (recebes um link mágico). Repete o passo 3–4 no outro dispositivo.

Ganha sempre a versão alterada mais recentemente.

## Correr localmente

```bash
python3 -m http.server 8080
# abrir http://localhost:8080
```
