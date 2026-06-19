import { Controller, Get } from "@nestjs/common";
import { getDeploymentMode } from "@agent-os/contracts/deployment";

@Controller("health")
export class HealthController {
  @Get()
  health() {
    return { ok: true, service: "api", deployment: getDeploymentMode() };
  }
}
