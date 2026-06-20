import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class IamRegistrationService implements OnApplicationBootstrap {
  private readonly logger = new Logger(IamRegistrationService.name);

  async onApplicationBootstrap() {
    this.logger.log(
      'Registering Support AI permissions with central IAM Service...',
    );

    const permissionsToRegister = [
      {
        name: 'support:ticket_read',
        description: 'Read customer support tickets',
      },
      {
        name: 'support:ticket_write',
        description: 'Create and update tickets',
      },
      {
        name: 'support:conversation_read',
        description: 'Read omnichannel conversations',
      },
      {
        name: 'support:conversation_write',
        description: 'Reply to conversations',
      },
      {
        name: 'support:settings_manage',
        description: 'Manage AI governance and connectors',
      },
      { name: 'support:agent_assign', description: 'Assign tickets to agents' },
    ];

    try {
      // Call the IAM service self-registration endpoint as specified in IAM's permissions.ts
      await axios.post(
        `${process.env.EASYDEV_IAM_URL}/api/v1/iam/rbac/permissions/register`,
        {
          service: 'easydev-support-ai',
          permissions: permissionsToRegister,
          defaultRoles: [
            {
              name: 'support_agent',
              permissions: [
                'support:ticket_read',
                'support:ticket_write',
                'support:conversation_read',
                'support:conversation_write',
              ],
            },
            {
              name: 'tenant_admin',
              permissions: [
                'support:ticket_read',
                'support:ticket_write',
                'support:conversation_read',
                'support:conversation_write',
                'support:settings_manage',
                'support:agent_assign',
              ],
            },
          ],
        },
      );
      this.logger.log('Successfully registered permissions with IAM.');
    } catch (error: any) {
      this.logger.warn(
        `Failed to sync permissions with IAM (Is IAM running?): ${error.message}`,
      );
      // We don't crash the app if IAM is down during boot, we just warn.
    }
  }
}
