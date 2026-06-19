import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { AssistantModule } from "./assistant/assistant.module";
import { VaultModule } from "./vault/vault.module";
import { WebhookModule } from "./webhook/webhook.module";
import { SchedulerModule } from "./scheduler/scheduler.module";

@Module({
  imports: [AssistantModule, VaultModule, WebhookModule, SchedulerModule],
  controllers: [HealthController],
})
export class AppModule {}
