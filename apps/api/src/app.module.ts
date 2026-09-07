import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';
import { AuthModule } from './identity/auth.module';
import { ApprovedSnapshotModule } from './approved-snapshot/approved-snapshot.module';
import { JobWorkflowModule } from './job-workflow/job-workflow.module';
import { SiteRegisterModule } from './site-register/site-register.module';
import { SyncModule } from './sync/sync.module';

@Module({
  imports: [
    AuthModule,
    ApprovedSnapshotModule,
    SiteRegisterModule,
    JobWorkflowModule,
    SyncModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
