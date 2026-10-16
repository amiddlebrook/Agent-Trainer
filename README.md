# Agent Trainer — Agent Intelligence Studio

**Cloudflare-native, free-tier-friendly agent development studio** with a redesigned dashboard. Create assistant agents, curate input/output reference examples, improve system instructions with Cloudflare Workers AI, test prior versions, and export JSON packages.

**Runtime:** Cloudflare Workers + Workers AI + Workers KV.  
**CI/CD:** GitHub Actions → Cloudflare Worker.  
**Paid dependencies:** None. No external model provider or paid subscription required.

> **What "training" means here:** This system performs **prompt optimization and few-shot learning at inference time, not model-weight fine-tuning**. The original app advertised video/audio/image training modes but returned simulated placeholder outputs. Those claims and Hugging Face dependency have been removed. Inference and optimization now actually run on Workers AI; failures are reported rather than faked.

## Features

- Create, edit and delete agent profiles.
- Version system instructions on manual edits and AI optimizations.
- Add up to 12 approved input/ideal-response examples per agent.
- Use Workers AI (Llama 3.1 8B FP8) to optimize system instructions against the examples.
- Compile a prompt+examples version without consuming an optimization inference call.
- Test a selected instruction version via real Workers AI inference, with reference examples supplied in context.
- Download versioned agent JSON configurations.
- Read existing agent profiles from the legacy KV record shape.
- Keep agents and inference private with a Cloudflare Worker ADMIN_TOKEN.
- Run API-contract tests and Worker bundle checks on GitHub pull requests; deploy on main.

## Architecture

~~~text
Modern browser UI (same-origin REST)
       |
       v
 Cloudflare Worker
   |             |
   |             +--- Workers AI (real inference and prompt optimization)
   |
   +--- AGENTS_KV (agents / examples / versions)
   +--- TRAINING_JOBS_KV (completed optimization records)
       ^
       |
 GitHub Actions -> Cloudflare KV bootstrap -> Wrangler deploy
~~~

No external backend, Hugging Face token, Docker or paid model API.

## Run locally

Requires Node.js 20 or later.

~~~bash
git clone https://github.com/amiddlebrook/Agent-Trainer.git
cd Agent-Trainer
npm ci
cp .dev.vars.example .dev.vars
# Replace ADMIN_TOKEN in .dev.vars with an unpredictable secret, 12+ characters
npm run dev
~~~

Open http://localhost:8787 and unlock the dashboard using your ADMIN_TOKEN. Wrangler's local mode keeps development KV data locally.

~~~bash
npm test
npm run build
~~~

## Set up automatic Cloudflare deployment

**One-time setup:**

1. Sign up for a free Cloudflare Workers account and activate your workers.dev subdomain.
2. Create a Cloudflare API token with **Workers Scripts: Edit** and **Workers KV Storage: Edit** permissions for the account.
3. Find your **32-character Cloudflare account ID**.
4. In this repository's GitHub Settings → Secrets and variables → Actions, add:
   - CLOUDFLARE_API_TOKEN
   - CLOUDFLARE_ACCOUNT_ID
5. Merge this branch into main or manually trigger the GitHub workflow **Test and deploy to Cloudflare**. It creates or reuses two free Workers KV namespaces and deploys the Worker.
6. Configure the app's authorization key **once**:

~~~bash
npx wrangler login
npx wrangler secret put ADMIN_TOKEN
# Enter a long random secret; use it to unlock the deployed dashboard.
~~~

The Worker is named agent-trainer. Once deployed, it is reachable at the Cloudflare-assigned workers.dev address shown in the GitHub Actions deploy logs. The ADMIN_TOKEN secret must be set under that Worker and Cloudflare account; deployment does not invent a public/default credential.

**Automated CI/CD:**

| Event | Unit tests | Worker dry-run bundle | Cloudflare deploy |
| --- | --- | --- | --- |
| Pull request | Yes | Yes | No |
| Push to main | Yes | Yes | Yes |
| Manual workflow trigger | Yes | Yes | Yes |

The deploy job runs scripts/bootstrap-cloudflare.mjs to automatically create or reuse namespaces agent-trainer-agents and agent-trainer-jobs, then generates an uncommitted wrangler.ci.toml with your account's real IDs. No KV IDs or paid services have to be purchased or hardcoded for production. The legacy IDs in wrangler.toml are retained for local configuration compatibility only. Missing Cloudflare credentials make the deployment fail visibly, rather than silently presenting success.

Manual deployment with the Cloudflare environment variables configured:

~~~bash
npm run deploy
~~~

## REST API

Every /api endpoint except /api/health requires Authorization: Bearer YOUR_ADMIN_TOKEN.

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | /api/health | Public health/configuration check |
| GET, POST | /api/agents | List/create agents |
| GET, PUT, DELETE | /api/agents/:id | Read/edit/delete agent |
| POST | /api/agents/:id/examples | Add input/expected-response pair |
| DELETE | /api/agents/:id/examples/:exampleId | Delete an example |
| POST | /api/train | Optimize or compile a new agent version |
| GET | /api/train/:id | Read a saved optimization job |
| POST | /api/chat | Test a selected version using Workers AI |
| GET | /api/agents/:id/export | Download full agent JSON |
| GET | /api/download/:trainingId | Download an optimization result |

~~~bash
curl -X POST https://agent-trainer.YOUR-SUBDOMAIN.workers.dev/api/agents \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Research Analyst","instructions":"Be precise and highlight uncertainty."}'
~~~

POST /api/train accepts an agentId and mode: "optimize" (Workers AI optimization) or "compile" (version configuration using the approved examples, no optimization call). You must add at least one example first.

## Real free-tier constraints

Cloudflare Workers Free limits request volume; Workers KV Free currently includes 100,000 reads, 1,000 writes, 1,000 lists and 1,000 deletes per day. Workers AI Free includes 10,000 neurons per day, resetting at 00:00 UTC. Cloudflare rejects above-quota requests on Free rather than silently billing. GitHub Actions is free for this public repository within GitHub's applicable usage policy.

See Cloudflare's live documentation for quota updates:
- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://developers.cloudflare.com/kv/platform/pricing/
- https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/

The workspace token prevents anonymous usage of the inference quota, and the UI stores it only in sessionStorage. Do not put ADMIN_TOKEN into version control.

## Important limitations

- Optimizes prompts; does not fine-tune model weights or handle real multimodal training.
- Agents are suitable for a single-owner configuration workspace. Workers KV is eventually consistent and not suitable for concurrent writes by multiple administrators.
- A prompt version snapshots its instructions. At test time, current reference examples are applied alongside the selected version; this is not a rigorous immutable dataset benchmark.
- Model capacity and free-tier availability are not guaranteed. Real inference failures are surfaced.
- Legacy helper scripts and Hugging Face modules remain as inactive historical files, not imported by the deployed app.

MIT License.
