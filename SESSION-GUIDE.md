# SHELF ESTEEM — CLAUDE CODE SESSION GUIDE
# Read this before starting your first Claude Code session

---

## WHAT YOU HAVE

Three files in this folder:

| File | Purpose |
|---|---|
| `CLAUDE.md` | Project instructions Claude Code reads automatically |
| `CLAUDE-CODE-OPENING-PROMPT.md` | The prompt you paste to start the build |
| `shelf-esteem-lovable-frontend.md` | Frontend specification (already built) |
| `shelf-esteem-backend-deploy.md` | Backend specification (already built) |

---

## STEP 1 — SET UP YOUR PROJECT FOLDER

Open Terminal on Ubuntu and run:

```bash
mkdir ~/shelf-esteem
cd ~/shelf-esteem
```

Copy all four spec files into this folder:
```bash
# If files are on a USB drive mounted at /media/mike/DRIVE_NAME/
cp /path/to/CLAUDE.md ~/shelf-esteem/
cp /path/to/shelf-esteem-lovable-frontend.md ~/shelf-esteem/
cp /path/to/shelf-esteem-backend-deploy.md ~/shelf-esteem/
```

---

## STEP 2 — START CLAUDE CODE

```bash
cd ~/shelf-esteem
claude
```

---

## STEP 3 — PASTE THE OPENING PROMPT

Open `CLAUDE-CODE-OPENING-PROMPT.md`, copy the entire contents, and paste it into Claude Code.

Press Enter.

Claude Code will:
1. Read both spec files
2. Output an architecture plan
3. Start building every file

---

## WHAT TO EXPECT DURING THE BUILD

**Duration:** 2–6 hours of autonomous work

**Claude Code will ask you questions periodically.** Here's how to answer:

| Claude Code asks | Your answer |
|---|---|
| "Should I overwrite X?" | Yes, unless it already works |
| "Can I run this command?" | Yes |
| "Which approach should I take?" | Go with the spec — follow the brief |
| "Should I install X package?" | Yes if it's in the spec |
| "I found a bug in X, should I fix it?" | Yes |

**You'll see Claude Code:**
- Creating files one by one
- Running `pnpm install`
- Running TypeScript checks
- Fixing errors it finds
- Starting dev servers to test

**Do NOT interrupt** unless Claude Code is completely stuck or asks a question it can't proceed without.

---

## ENVIRONMENT VARIABLES — FILL THESE IN

After Claude Code creates the project, you'll need to create a `.env` file.
Claude Code will create `.env.example` — copy it:

```bash
cp .env.example .env
```

Then edit it with your actual values:

```bash
nano .env
```

Fill in these values:

```
DATABASE_URL=          ← Get from Railway after creating PostgreSQL
PORT=8080
CLERK_PUBLISHABLE_KEY= ← Get from clerk.com dashboard
CLERK_SECRET_KEY=      ← Get from clerk.com dashboard  
RESEND_API_KEY=        ← Get from resend.com dashboard
ADMIN_USER_ID=         ← Your Clerk user ID (found in Clerk dashboard)
OPENAI_API_KEY=        ← Get from platform.openai.com
RECIPE_SEED_KEY=shelf-esteem-seed-2026
TESTER_CODES=SHIMMYPLAN,SHELFTESTER
DEMO_SEED_CODE=PANTRYDEMO
LOG_LEVEL=info
NODE_ENV=development
VITE_CLERK_PUBLISHABLE_KEY=  ← Same as CLERK_PUBLISHABLE_KEY
VITE_CLERK_PROXY_URL=/api/__clerk
```

---

## RAILWAY SETUP (for database)

1. Go to railway.app and sign up
2. Click "New Project" → "Database" → "PostgreSQL"
3. Click on the PostgreSQL service
4. Go to "Connect" tab
5. Copy the `DATABASE_URL` connection string
6. Paste it into your `.env` file

Then push the schema:
```bash
pnpm --filter @workspace/db run push
```

---

## AFTER THE BUILD IS COMPLETE

Test that everything works:

```bash
# Terminal 1 — Start the backend
pnpm --filter @workspace/api-server run dev

# Terminal 2 — Start the frontend
pnpm --filter @workspace/pantry-app run dev
```

Open Firefox and go to: `http://localhost:8082`

You should see the Shelf Esteem landing page.

---

## IF CLAUDE CODE GETS STUCK

Common issues and fixes:

**"Cannot find module X"**
```bash
pnpm install
```

**TypeScript errors**
```bash
pnpm run typecheck
```
Then paste the errors back to Claude Code and say "Fix these TypeScript errors"

**Database connection error**
Make sure DATABASE_URL is set in your .env file

**Port already in use**
```bash
pkill -f "node"
```
Then try starting again

**Claude Code session times out**
Just run `claude` again in the project folder. It reads CLAUDE.md and knows where it left off. Say "Continue the build — check what files exist and pick up where you left off."

---

## USEFUL CLAUDE CODE COMMANDS

Type these inside Claude Code:

| Command | What it does |
|---|---|
| `/status` | Shows what Claude Code is working on |
| `/clear` | Clears the conversation but keeps files |
| `Ctrl+C` | Stops the current operation |
| `Ctrl+D` | Exits Claude Code |

---

## DAILY WORKFLOW AFTER BUILD IS DONE

Every day when you want to work on Shelf Esteem:

```bash
cd ~/shelf-esteem
claude
```

Then describe what you want to change or add. Claude Code will read CLAUDE.md, understand the project, and make the changes.

Examples:
- "Add a new field to pantry items for storage temperature"
- "Fix the bug where the shopping list doesn't clear after purchase"
- "Add a weekly summary email to the drip sequence"

---

## DEPLOYMENT TO RAILWAY (when ready)

1. Create a GitHub account if you don't have one
2. Create a new private repo called `shelf-esteem`
3. In Terminal:
```bash
cd ~/shelf-esteem
git init
git add .
git commit -m "Initial Shelf Esteem build"
git remote add origin https://github.com/YOUR_USERNAME/shelf-esteem.git
git push -u origin main
```
4. In Railway: "New Project" → "Deploy from GitHub repo" → select shelf-esteem
5. Add all environment variables in Railway dashboard
6. Railway auto-deploys on every push to main

---

## REMEMBER

- The app lives at **shelfesteem.app** once deployed
- Mascot is **Shelfy** (never Selfie)
- Tester codes: **SHIMMYPLAN**, **SHELFTESTER**, **PANTRYDEMO**
- Update Resend sender to **shelfy@shelfesteem.app** once domain is verified

You built this whole setup from a 2012 MacBook running macOS High Sierra.
That's the Shimmy energy right there.
