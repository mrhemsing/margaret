#!/usr/bin/env node

import {
  assertMainBranchIsLive,
  clearAgentModelId,
  cloneConversationConfig,
  getAgent,
  getTtsModelId,
  loadLocalEnv,
  requireEnv,
  updateAgent,
} from "./lib/elevenlabs-admin.mjs";

async function main() {
  loadLocalEnv();

  const clearAgentId = requireEnv("ELEVENLABS_AGENT_ID_CLEAR");
  const before = await getAgent(clearAgentId);
  const branch = await assertMainBranchIsLive(before);
  const beforeModelId = getTtsModelId(before);

  console.log(`Clear agent: ${clearAgentId}`);
  console.log(`Main branch: ${branch.id} (${branch.current_live_percentage}% live)`);
  console.log(`Current TTS model: ${beforeModelId || "(missing)"}`);
  console.log(`Target TTS model: ${clearAgentModelId}`);

  if (beforeModelId === clearAgentModelId) {
    console.log("No update needed.");
  } else {
    const conversationConfig = cloneConversationConfig(before);
    conversationConfig.tts = {
      ...conversationConfig.tts,
      model_id: clearAgentModelId,
    };

    await updateAgent(
      clearAgentId,
      { conversation_config: conversationConfig },
      {
        branchId: branch.id,
        versionDescription: `Set clear agent TTS model to ${clearAgentModelId}`,
      },
    );
    console.log(`Updated clear agent model: ${beforeModelId || "(missing)"} -> ${clearAgentModelId}`);
  }

  const after = await getAgent(clearAgentId);
  const afterModelId = getTtsModelId(after);

  if (afterModelId !== clearAgentModelId) {
    throw new Error(`Verification failed: live clear agent model is ${afterModelId || "(missing)"}, expected ${clearAgentModelId}.`);
  }

  console.log(`Verified live clear agent model: ${afterModelId}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

