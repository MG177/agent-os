import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from "@nestjs/common";
import { remindOverdueTodos } from "@agent-os/platform/todo-notify";

/**
 * Polls every minute and, at each fixed reminder slot (06/09/12/15/18/21 in the
 * app timezone by default; override with OVERDUE_REMINDER_CRON), sends one
 * WhatsApp digest of every still-overdue todo. Distinct from TodoNotifyService,
 * which pings once the moment a todo first becomes due — this is the recurring
 * nag for things left overdue. Set AGENT_OS_DISABLE_OVERDUE_REMINDER=1 to disable.
 */
@Injectable()
export class OverdueReminderService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger("OverdueReminder");
  private readonly pollMs = 60_000;
  private timer?: ReturnType<typeof setInterval>;

  onApplicationBootstrap() {
    if (process.env.AGENT_OS_DISABLE_OVERDUE_REMINDER === "1") {
      this.logger.log(
        "overdue reminder disabled (AGENT_OS_DISABLE_OVERDUE_REMINDER=1)",
      );
      return;
    }
    const tick = () => {
      remindOverdueTodos()
        .then((n) => {
          if (n > 0) this.logger.log(`sent overdue reminder for ${n} todo(s)`);
        })
        .catch((err) =>
          this.logger.error(`reminder failed: ${err?.message ?? err}`),
        );
    };
    tick();
    this.timer = setInterval(tick, this.pollMs);
    this.logger.log(`overdue reminder polling every ${this.pollMs}ms`);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
