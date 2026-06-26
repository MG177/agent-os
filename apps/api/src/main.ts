import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Expose req.rawBody so the WAHA webhook can verify its HMAC over the exact bytes.
    rawBody: true,
  });
  // The whole API lives under /api to mirror the Next route namespace, so the
  // Vercel/web proxy can forward /api/* paths unchanged.
  app.setGlobalPrefix("api");
  // Chat payloads can carry a base64 image; lift the default 100kb json limit.
  app.useBodyParser("json", { limit: "12mb" });
  // Fire OnModuleDestroy on SIGTERM/SIGINT so the todo-notify interval is cleared.
  app.enableShutdownHooks();
  const port = Number(process.env.API_PORT ?? process.env.PORT ?? 3004);
  await app.listen(port, "0.0.0.0");
  // eslint-disable-next-line no-console
  console.log(`[api] agent-os NestJS api listening on :${port}`);
}

bootstrap();
