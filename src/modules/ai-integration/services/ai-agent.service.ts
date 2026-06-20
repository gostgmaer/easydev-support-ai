import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IAiRepository } from '../repositories/ai-repository.interface';
import { AiAgent } from '../domain/ai-agent.aggregate';
import { CreateAgentDto, UpdateAgentDto, AgentProfileDto, ModelConfigDto } from '../dtos/ai.dto';
import { AgentStatusEnum } from '../domain/value-objects';
import * as crypto from 'crypto';

@Injectable()
export class AiAgentService {
  constructor(
    @Inject('IAiRepository')
    private readonly repository: IAiRepository,
  ) {}

  public async createAgent(tenantId: string, dto: CreateAgentDto): Promise<AiAgent> {
    const agentId = crypto.randomUUID();
    const agent = AiAgent.create(agentId, {
      tenantId,
      name: dto.name,
      description: dto.description,
      agentType: dto.agentType,
      status: AgentStatusEnum.DRAFT,
      defaultWorkflow: dto.defaultWorkflow,
      systemPromptReference: dto.systemPromptReference,
      configuration: dto.configuration,
    });

    return this.repository.saveAgent(agent, tenantId);
  }

  public async getAgent(tenantId: string, id: string): Promise<AiAgent> {
    const agent = await this.repository.getAgentById(id, tenantId);
    if (!agent) {
      throw new NotFoundException(`AI Agent with ID ${id} not found`);
    }
    return agent;
  }

  public async findAgents(tenantId: string, options?: any): Promise<AiAgent[]> {
    return this.repository.findAgents(tenantId, options);
  }

  public async updateAgent(tenantId: string, id: string, dto: UpdateAgentDto): Promise<AiAgent> {
    const agent = await this.getAgent(tenantId, id);
    agent.update(dto);
    return this.repository.saveAgent(agent, tenantId);
  }

  public async deleteAgent(tenantId: string, id: string): Promise<boolean> {
    const deleted = await this.repository.deleteAgent(id, tenantId);
    if (!deleted) {
      throw new NotFoundException(`AI Agent with ID ${id} not found`);
    }
    return deleted;
  }

  public async setAgentProfile(tenantId: string, id: string, dto: AgentProfileDto): Promise<AiAgent> {
    const agent = await this.getAgent(tenantId, id);
    agent.setProfile(dto);
    return this.repository.saveAgent(agent, tenantId);
  }

  public async setAgentModelConfig(tenantId: string, id: string, dto: ModelConfigDto): Promise<AiAgent> {
    const agent = await this.getAgent(tenantId, id);
    agent.setModelConfig(dto);
    return this.repository.saveAgent(agent, tenantId);
  }
}
