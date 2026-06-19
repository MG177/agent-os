import { Module } from "@nestjs/common";
import { TodoNotifyService } from "./todo-notify.service";

@Module({
  providers: [TodoNotifyService],
})
export class SchedulerModule {}
