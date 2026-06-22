import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CsatSurvey } from '../entities/csat-survey.entity';

@Injectable()
export class CsatSurveyService {
  constructor(
    @InjectRepository(CsatSurvey)
    private readonly repository: Repository<CsatSurvey>,
  ) {}

  async submit(
    tenantId: string,
    conversationId: string,
    rating: number,
    feedback?: string,
    channel = 'WIDGET',
  ): Promise<CsatSurvey> {
    const survey = this.repository.create({
      tenantId,
      conversationId,
      rating,
      feedback,
      channel,
    });
    return this.repository.save(survey);
  }
}
