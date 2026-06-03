import { createAgent, type FlueContext, type WorkflowRouteHandler } from '@flue/runtime';
import { local } from '@flue/runtime/node';
import * as v from 'valibot';

export const route: WorkflowRouteHandler = async (_c, next) => next();

const agent = createAgent(() => ({
  model: 'minimax/MiniMax-M2.7',
  sandbox: local({ env: { GH_TOKEN: process.env.GH_TOKEN ?? '' } }),
  instructions: `You are a senior tech lead responsible for triaging GitHub issues.`,
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