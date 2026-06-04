import { createAgent } from '@flue/runtime';
import { local } from '@flue/runtime/node';
import { type FlueContext, type WorkflowRouteHandler } from '@flue/runtime/routing';
import * as v from 'valibot';
import triageSkill from '../../.claude/skills/triage/SKILL.md' with { type: 'skill' };

export const route: WorkflowRouteHandler = async (_c, next) => next();

const agent = createAgent(() => ({
  model: 'minimax/MiniMax-M2.7',
  sandbox: local({ env: { GH_TOKEN: process.env.GH_TOKEN ?? '' } }),
  instructions: `You are a senior tech lead responsible for triaging GitHub issues.`,
  skills: [triageSkill],
}));

export async function run({ init, payload, log }: FlueContext) {
  const harness = await init(agent);
  const session = await harness.session();

  const issueNumber = (payload as { issueNumber: number }).issueNumber;
  log.info('starting triage', { issueNumber });

  const { data } = await session.skill('triage', {
    args: { issueNumber },
    result: v.object({
      labels_to_add: v.array(v.string()),
      comment: v.optional(v.string()),
    }),
  });

  log.info('triage complete', { labels: data.labels_to_add });
  return data;
}