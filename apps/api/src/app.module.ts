import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';
import { AuthModule } from './identity/auth.module';
import { SiteRegisterModule } from './site-register/site-register.module';

@Module({
  imports: [AuthModule, SiteRegisterModule],
  controllers: [HealthController],
})
export class AppModule {}
