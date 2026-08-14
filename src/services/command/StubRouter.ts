import type { CommandRouter, CommandResult } from './types';

class StubRouterImpl implements CommandRouter {
  async process(input: string): Promise<CommandResult> {
    // Simulate a brief processing delay
    await new Promise((r) => setTimeout(r, 800));

    if (!input.trim()) {
      return {
        type: 'response',
        message: "I didn't catch that. Try again?",
      };
    }

    return {
      type: 'response',
      message: `I heard: "${input}"`,
    };
  }
}

export const stubRouter = new StubRouterImpl();
