export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export class ChatService {
  async streamChat(
    messages: ChatMessage[],
    onChunk: (chunkText: string, fullText: string) => void
  ): Promise<string> {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Server returned status ${res.status}`);
    }

    if (!res.body) {
      throw new Error('ReadableStream not supported by browser or empty response');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const dataStr = trimmed.replace(/^data:\s*/, '');
        if (dataStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.error) {
            throw new Error(parsed.error);
          }
          if (parsed.text) {
            fullText += parsed.text;
            onChunk(parsed.text, fullText);
          }
        } catch {
          // Ignore parse errors on malformed chunks
        }
      }
    }

    return fullText;
  }
}

export const chatService = new ChatService();
