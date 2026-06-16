/**
 * Stream helpers for HTTP route handlers (plain-text chunked responses).
 */

export function createTextStream(
  text: string,
  chunkSize = 4,
  delayMs = 10,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      let idx = 0;
      function push() {
        if (idx >= text.length) {
          controller.close();
          return;
        }
        const chunk = text.slice(idx, idx + chunkSize);
        controller.enqueue(encoder.encode(chunk));
        idx += chunkSize;
        setTimeout(push, delayMs);
      }
      push();
    },
  });
}

export function textStreamResponse(
  text: string,
  init?: { status?: number },
): Response {
  return new Response(createTextStream(text), {
    status: init?.status ?? 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Accel-Buffering": "no",
    },
  });
}

export function errorJsonResponse(
  message: string,
  status = 500,
): Response {
  return Response.json({ error: message }, { status });
}
