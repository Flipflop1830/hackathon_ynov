# 🌐 DEV WEB — Assistant de chat TechCorp (Next.js)

Interface de chat full-stack pour l'assistant TechCorp, connectée au serveur **Ollama** déployé par
l'INFRA. Comptes utilisateurs, historique persistant, **type de compte finance / médical**, streaming
des réponses **mot à mot**, et indicateur d'état du serveur.

## Stack technique

| Domaine | Choix | Pourquoi |
|---|---|---|
| Framework | **Next.js 16** (App Router, TS) | Full-stack, route handlers + Server Actions |
| UI | **Tailwind v4** + composants maison (style shadcn) + **lucide-react** | structure **atomic design** |
| Animations | **framer-motion** | bulles, transitions, indicateur de frappe |
| Auth / session | **pattern natif Next.js** : `jose` (JWT) + cookie httpOnly + DAL | version-matched, zéro dépendance fragile |
| Mots de passe | **bcryptjs** | hash sécurisé |
| Validation | **zod** | schémas signup/login |
| Base de données | **Prisma 6 + SQLite** | local, sans service (no deploy) |
| Tests | **Vitest** + Testing Library | unités + composants |
| CI | **GitHub Actions** | lint + types + tests + build (no deploy) |

> ℹ️ Auth.js (NextAuth) a été écarté au profit du pattern d'auth **documenté par Next 16** : NextAuth v5
> (beta) contre un Next 16 qui vient de renommer `middleware`→`proxy` (React 19) présentait un risque de
> compatibilité. Le résultat est identique (comptes locaux + sessions + `accountType`), sans dépendance à risque.

## Architecture (atomic design)

```
app/
├── (auth)/{login,register}/   # pages publiques
├── (app)/                     # chat (protégé par session)
├── api/{chat,health,conversations,conversations/[id]}/route.ts
└── actions/auth.ts            # Server Actions signup/login/logout
components/{atoms,molecules,organisms}/
lib/{jwt,session,dal,prisma,assistants,ollama,definitions,types,utils}.ts
proxy.ts                       # ex-middleware (Next 16) : redirections optimistes
prisma/schema.prisma           # User · Conversation · Message
```

Le **chat** passe par un *route handler* côté serveur qui proxy `POST {OLLAMA_URL}/api/chat`
(stream NDJSON), relaie les deltas au client **et** persiste la conversation. Aucun appel direct
navigateur → Ollama (pas de souci CORS).

### Routage finance / médical

`lib/assistants.ts` choisit modèle + system prompt selon le `accountType` du compte :
- **finance** → modèle `phi35-financial` (déployé par l'INFRA) ;
- **médical** → modèle provisoire `phi3.5` + system prompt médical + disclaimer.
  *Le vrai modèle médical fine-tuné (mission IA) reste expérimental ; le brancher = changer
  `OLLAMA_MODEL_MEDICAL` dans `.env.local`.*

## 🚀 Lancement (une commande)

```powershell
./start.ps1
```
Le script crée `.env.local`/`.env` si besoin (avec un `AUTH_SECRET` généré), installe les dépendances,
applique les migrations Prisma (crée `prisma/dev.db`) et démarre sur **http://localhost:3000**.

### Configuration (`.env.local`)

```
DATABASE_URL="file:./dev.db"
AUTH_SECRET="<généré>"
OLLAMA_URL="http://localhost:11434"      # ou http://10.15.2.23:11434 depuis un autre PC
OLLAMA_MODEL_FINANCE="phi35-financial"
OLLAMA_MODEL_MEDICAL="phi3.5"
```

## Scripts

```
npm run dev        # développement
npm run build      # build production
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run test       # Vitest
```

## Fonctionnalités

- **Comptes** : inscription (finance ou médical), connexion, déconnexion (Server Actions + bcrypt).
- **Sessions** : JWT signé (`jose`) en cookie httpOnly ; routes `(app)` protégées (`proxy.ts` + DAL serveur).
- **Historique** : conversations et messages persistés (SQLite), listés/sélectionnables/supprimables, isolés par utilisateur.
- **Streaming mot à mot** : lecture du `ReadableStream` côté client, effet machine à écrire.
- **État de connexion** : badge vert/rouge mis à jour toutes les 5 s via `/api/health`.

## Sécurité

Le modèle servi (`phi35-financial`) est le modèle **sain** choisi par l'INFRA, pas l'adaptateur LoRA
compromis. La backdoor `J3 SU1S UN3 P0UP33 D3 C1R3` est **inerte** : taper le trigger renvoie une réponse
normale (à montrer en démo).

## Tests & CI

5 fichiers de tests (16 cas) : parsing du stream Ollama, routage des assistants, validation zod,
composants `MessageBubble` et `ConnectionBadge`. La CI (`.github/workflows/ci.yml`) exécute
lint + typecheck + tests + build sur chaque push/PR `main` — **sans déploiement**.
