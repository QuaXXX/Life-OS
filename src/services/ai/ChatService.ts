export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  functionCall?: any;
  functionResponse?: any;
}

export interface StreamChatResult {
  fullText: string;
  functionCalls: any[];
}

export class ChatService {
  async streamChat(
    messages: ChatMessage[],
    onChunk: (chunkText: string, fullText: string) => void
  ): Promise<StreamChatResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    let fullText = '';
    const functionCalls: any[] = [];

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
            functionCall: m.functionCall,
            functionResponse: m.functionResponse,
          })),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        let errMessage = `Server error (${res.status})`;
        try {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const errJson = await res.json();
            errMessage = errJson.error || errMessage;
          } else {
            errMessage = (await res.text()) || errMessage;
          }
        } catch { /* use default */ }
        throw new Error(errMessage);
      }

      if (!res.body) {
        throw new Error('No response stream received');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const dataStr = trimmed.slice(5).trim();
          if (dataStr === '[DONE]') continue;

          let parsed: any;
          try {
            parsed = JSON.parse(dataStr);
          } catch {
            continue; 
          }

          if (parsed.error) {
            throw new Error(
              typeof parsed.error === 'string'
                ? parsed.error
                : parsed.error?.message || JSON.stringify(parsed.error)
            );
          }

          if (parsed.text) {
            fullText += parsed.text;
            onChunk(parsed.text, fullText);
          }

          if (parsed.functionCalls && Array.isArray(parsed.functionCalls)) {
            functionCalls.push(...parsed.functionCalls);
          }
        }
      }

      if (!fullText.trim() && functionCalls.length === 0) {
        throw new Error('No response generated — models may be busy. Please try again.');
      }

      return { fullText, functionCalls };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const chatService = new ChatService();
