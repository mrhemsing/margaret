import fs from "node:fs";
import path from "node:path";

const apiBaseUrl = "https://api.elevenlabs.io/v1";

export const expectedFirstMessage = "{{opener}}";
export const clearAgentModelId = "eleven_flash_v2_5";

export function loadLocalEnv(projectDir = process.cwd()) {
  for (const filename of [".env.local", ".env"]) {
    const filePath = path.join(projectDir, filename);
    if (!fs.existsSync(filePath)) continue;

    const contents = fs.readFileSync(filePath, "utf8");
    for (const rawLine of contents.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) continue;

      const [, key, rawValue] = match;
      if (process.env[key]) continue;

      const value = rawValue.replace(/^(['"])(.*)\1$/, "$2");
      process.env[key] = value;
    }
  }
}

export function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function elevenLabsRequest(pathname, { method = "GET", query, body } = {}) {
  const apiKey = requireEnv("ELEVENLABS_API_KEY");
  const url = new URL(`${apiBaseUrl}${pathname}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`ElevenLabs ${method} ${url.pathname} failed (${response.status}): ${errorBody}`);
  }

  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export function getAgent(agentId, { branchId } = {}) {
  return elevenLabsRequest(`/convai/agents/${encodeURIComponent(agentId)}`, {
    query: branchId ? { branch_id: branchId } : undefined,
  });
}

export function listAgentBranches(agentId) {
  return elevenLabsRequest(`/convai/agents/${encodeURIComponent(agentId)}/branches`);
}

export async function getMainBranch(agent) {
  const branches = await listAgentBranches(agent.agent_id);
  const mainBranchId = agent.main_branch_id ?? agent.branch_id;
  const mainBranch = branches.results?.find((branch) => branch.id === mainBranchId);

  if (!mainBranch) {
    throw new Error(`Could not find main branch for agent ${agent.agent_id}. API returned main_branch_id=${mainBranchId ?? "null"}.`);
  }

  return mainBranch;
}

export async function updateAgent(agentId, partialConfig, { branchId, versionDescription } = {}) {
  return elevenLabsRequest(`/convai/agents/${encodeURIComponent(agentId)}`, {
    method: "PATCH",
    query: branchId ? { branch_id: branchId } : undefined,
    body: {
      ...partialConfig,
      version_description: versionDescription,
    },
  });
}

export function cloneConversationConfig(agent) {
  if (!agent.conversation_config || typeof agent.conversation_config !== "object") {
    throw new Error(`Agent ${agent.agent_id} is missing conversation_config.`);
  }

  return structuredClone(agent.conversation_config);
}

export async function assertMainBranchIsLive(agent) {
  const branch = await getMainBranch(agent);
  const livePercentage = Number(branch.current_live_percentage ?? 0);

  if (livePercentage <= 0) {
    throw new Error(
      `Main branch ${branch.id} for agent ${agent.agent_id} has ${livePercentage}% live traffic. Refusing to update a non-live branch.`,
    );
  }

  if (branch.draft_exists) {
    console.warn(`Warning: main branch ${branch.id} has an existing draft in ElevenLabs. This script updates the branch config, not dashboard drafts.`);
  }

  return branch;
}

export function getPrompt(agent) {
  return agent.conversation_config?.agent?.prompt?.prompt ?? "";
}

export function getFirstMessage(agent) {
  return agent.conversation_config?.agent?.first_message ?? "";
}

export function getTtsModelId(agent) {
  return agent.conversation_config?.tts?.model_id ?? "";
}

