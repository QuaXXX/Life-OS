export interface CommandResult {
  type: 'confirmation' | 'response' | 'error';
  message: string;
  action?: () => Promise<void>;
}

export interface CommandRouter {
  process(input: string): Promise<CommandResult>;
}
