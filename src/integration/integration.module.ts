import { Module, Global } from '@nestjs/common';
import { IamIntegrationService } from './iam/iam.service';
import { AiIntegrationService } from './ai/ai.service';
import { FileUploadIntegrationService } from './file-upload/file-upload.service';
import { SettingsModule } from '../modules/settings/settings.module';

@Global()
@Module({
  imports: [SettingsModule],
  providers: [
    IamIntegrationService,
    AiIntegrationService,
    FileUploadIntegrationService,
  ],
  exports: [
    IamIntegrationService,
    AiIntegrationService,
    FileUploadIntegrationService,
  ],
})
export class IntegrationModule {}
