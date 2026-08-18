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
  async streamChatWithRetry(
    messages: ChatMessage[],
    onChunk: (chunkText: string, fullText: string) => void,
    onStatus?: (status: string) => void
  ): Promise<StreamChatResult> {
    const MAX_RETRIES = 3;
    let attempt = 0;
    
    while (true) {
      try {
        return await this.streamChat(messages, onChunk);
      } catch (err: any) {
        attempt++;
        const errMsg = err.message || '';
        const isRateLimit = errMsg.includes('429') || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('rate limit') || errMsg.toLowerCase().includes('exhausted');
        
        if (isRateLimit && attempt <= MAX_RETRIES) {
          const waitMs = attempt * 2500; // 2.5s, 5s, 7.5s
          if (onStatus) {
            onStatus(`Hit a rate limit, retrying in ${waitMs / 1000}s... (Attempt ${attempt}/${MAX_RETRIES})`);
          }
          await new Promise(resolve => setTimeout(resolve, waitMs));
          continue;
        }
        
        // If it's not a rate limit, or we exceeded max retries, throw
        throw err;
      }
    }
  }

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
        throw new Error('Stream closed without returning any content or function calls. Check server logs.');
      }

      return { fullText, functionCalls };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Request timed out after 45s. Gemini API took too long to respond.');
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const chatService = new ChatService();
