import { Module } from "@nestjs/common";
import { TodoNotifyService } from "./todo-notify.service";
import { OverdueReminderService } from "./overdue-reminder.service";

@Module({
  providers: [TodoNotifyService, OverdueReminderService],
})
export class SchedulerModule {}
