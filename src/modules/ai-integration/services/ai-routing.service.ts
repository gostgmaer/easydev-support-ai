import { Injectable, Inject, Logger } from '@nestjs/common';
import type { IAiRepository } from '../repositories/ai-repository.interface';
import { AiAgent } from '../domain/ai-agent.aggregate';
import { AgentTypeEnum } from '../domain/value-objects';

@Injectable()
export class AiRoutingService {
  private readonly logger = new Logger(AiRoutingService.name);

  constructor(
    @Inject('IAiRepository')
    private readonly repository: IAiRepository,
  ) {}

  public async selectAgent(
    tenantId: string,
    options: {
      category?: string;
      language?: string;
      direction?: string;
    } = {},
  ): Promise<AiAgent | null> {
    this.logger.log(
      `Routing conversation for tenant ${tenantId} (category: ${options.category}, language: ${options.language})`,
    );

    const agents = await this.repository.findAgents(tenantId);
    if (agents.length === 0) {
      return null;
    }

    // Rule 1: Attempt to match exact language support
    if (options.language) {
      const matchedLang = agents.find(
        (a) =>
          a.profile?.languageSupport &&
          Array.isArray(a.profile.languageSupport) &&
          a.profile.languageSupport.some(
            (l) => l.toLowerCase() === options.language?.toLowerCase(),
          ),
      );
      if (matchedLang) return matchedLang;
    }

    // Rule 2: Attempt to match category / agentType
    if (options.category) {
      const typeStr = options.category.toUpperCase();
      const matchedType = agents.find(
        (a) =>
          a.agentType === typeStr || a.name.toUpperCase().includes(typeStr),
      );
      if (matchedType) return matchedType;
    }

    // Rule 3: Return default / Customer Support agent
    const supportAgent = agents.find(
      (a) => a.agentType === AgentTypeEnum.CUSTOMER_SUPPORT,
    );
    if (supportAgent) return supportAgent;

    // Fallback: return the first active agent
    const activeAgent = agents.find((a) => a.status === 'ACTIVE');
    return activeAgent || agents[0];
  }

  public selectWorkflow(agent: AiAgent): string {
    if (agent.defaultWorkflow) {
      return agent.defaultWorkflow;
    }
    // Static fallback workflow if none configured
    return 'default-agent-workflow-run';
  }
}
