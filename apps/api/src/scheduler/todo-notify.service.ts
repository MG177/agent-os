import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from "@nestjs/common";
import { notifyDueTodos } from "@agent-os/platform/todo-notify";

/**
 * Owns the WhatsApp due-todo poll that used to live in the Next app's
 * instrumentation.ts (a 60s setInterval). Now that the api is the single
 * long-running backend, the poll runs here; the web instances run lite and
 * skip it. Set AGENT_OS_DISABLE_TODO_NOTIFY=1 to turn it off.
 */
@Injectable()
export class TodoNotifyService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger("TodoNotify");
  private readonly pollMs = 60_000;
  private timer?: ReturnType<typeof setInterval>;

  onApplicationBootstrap() {
    if (process.env.AGENT_OS_DISABLE_TODO_NOTIFY === "1") {
      this.logger.log("todo-notify poll disabled (AGENT_OS_DISABLE_TODO_NOTIFY=1)");
      return;
    }
    const tick = () => {
      notifyDueTodos().catch((err) =>
        this.logger.error(`poll failed: ${err?.message ?? err}`),
      );
    };
    tick();
    this.timer = setInterval(tick, this.pollMs);
    this.logger.log(`todo-notify polling every ${this.pollMs}ms`);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
