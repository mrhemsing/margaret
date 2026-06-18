#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

import {
  assertMainBranchIsLive,
  cloneConversationConfig,
  expectedFirstMessage,
  getAgent,
  getFirstMessage,
  getPrompt,
  loadLocalEnv,
  requireEnv,
  updateAgent,
} from "./lib/elevenlabs-admin.mjs";

function readPrompt() {
  const promptPath = path.join(process.cwd(), "agent-prompt-dailycaller.txt");
  return fs.readFileSync(promptPath, "utf8");
}

async function syncAgent(agentId, label, prompt) {
  const before = await getAgent(agentId);
  const branch = await assertMainBranchIsLive(before);
  const beforePrompt = getPrompt(before);
  const beforeFirstMessage = getFirstMessage(before);
  const promptChanged = beforePrompt !== prompt;
  const firstMessageChanged = beforeFirstMessage !== expectedFirstMessage;

  console.log(`${label}: ${agentId}`);
  console.log(`  Main branch: ${branch.id} (${branch.current_live_percentage}% live)`);
  console.log(`  Prompt chars: ${beforePrompt.length} -> ${prompt.length}`);

  if (firstMessageChanged) {
    console.warn(`  First message: ${JSON.stringify(beforeFirstMessage)} -> ${JSON.stringify(expectedFirstMessage)}`);
  } else {
    console.log("  First message already matches {{opener}}.");
  }

  if (!promptChanged && !firstMessageChanged) {
    console.log("  No update needed.");
  } else {
    const conversationConfig = cloneConversationConfig(before);
    conversationConfig.agent = {
      ...conversationConfig.agent,
      first_message: expectedFirstMessage,
      prompt: {
        ...conversationConfig.agent?.prompt,
        prompt,
      },
    };

    await updateAgent(
      agentId,
      { conversation_config: conversationConfig },
      {
        branchId: branch.id,
        versionDescription: "Sync DailyCall master prompt",
      },
    );
    console.log("  Updated prompt/first message.");
  }

  const after = await getAgent(agentId);
  const afterPrompt = getPrompt(after);
  const afterFirstMessage = getFirstMessage(after);

  if (afterPrompt !== prompt) {
    throw new Error(`${label} verification failed: live prompt does not match agent-prompt-dailycaller.txt.`);
  }

  if (afterFirstMessage !== expectedFirstMessage) {
    throw new Error(`${label} verification failed: live first_message is ${JSON.stringify(afterFirstMessage)}.`);
  }

  return {
    label,
    updated: promptChanged || firstMessageChanged,
  };
}

async function main() {
  loadLocalEnv();

  const expressiveAgentId = requireEnv("ELEVENLABS_AGENT_ID");
  const clearAgentId = requireEnv("ELEVENLABS_AGENT_ID_CLEAR");
  const prompt = readPrompt();

  console.log("Syncing DailyCall prompt to ElevenLabs production agents.");
  console.log("Scope: conversation_config.agent.prompt.prompt and conversation_config.agent.first_message only.");
  console.log(`Source prompt chars: ${prompt.length}`);

  const results = [];
  results.push(await syncAgent(expressiveAgentId, "expressive", prompt));
  results.push(await syncAgent(clearAgentId, "clear", prompt));

  const updatedLabels = results.filter((result) => result.updated).map((result) => result.label);
  console.log(`Done. Updated: ${updatedLabels.length ? updatedLabels.join(", ") : "none"}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

