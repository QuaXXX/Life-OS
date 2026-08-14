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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s safety timeout

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        let errMessage = `Server returned status ${res.status}`;
        try {
          const errJson = await res.json();
          if (errJson.error) errMessage = errJson.error;
        } catch {
          const errText = await res.text().catch(() => '');
          if (errText) errMessage = errText;
        }
        throw new Error(errMessage);
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

          let parsed: any;
          try {
            parsed = JSON.parse(dataStr);
          } catch {
            // Raw text chunk if not JSON
            if (dataStr) {
              fullText += dataStr;
              onChunk(dataStr, fullText);
            }
            continue;
          }

          if (parsed && parsed.error) {
            throw new Error(
              typeof parsed.error === 'string'
                ? parsed.error
                : parsed.error?.message || JSON.stringify(parsed.error)
            );
          }

          if (parsed && parsed.text) {
            fullText += parsed.text;
            onChunk(parsed.text, fullText);
          }
        }
      }

      if (!fullText.trim()) {
        throw new Error('No response generated. Please try again.');
      }

      return fullText;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const chatService = new ChatService();
