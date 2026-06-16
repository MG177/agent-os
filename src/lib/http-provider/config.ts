export interface HttpProviderConfig {
  /** Full chat-completions URL, e.g. http://localhost:11434/v1/chat/completions */
  endpointUrl: string;
  apiKey?: string;
  model?: string;
}

export function loadHttpProviderConfig(): HttpProviderConfig {
  const endpointUrl = process.env.ASSISTANT_HTTP_ENDPOINT_URL?.trim();
  if (!endpointUrl) {
    throw new Error(
      "ASSISTANT_HTTP_ENDPOINT_URL is not set. Add it to .env.local (full chat-completions URL).",
    );
  }

  return {
    endpointUrl,
    apiKey: process.env.ASSISTANT_HTTP_API_KEY?.trim() || undefined,
    model: process.env.ASSISTANT_HTTP_MODEL?.trim() || undefined,
  };
}
