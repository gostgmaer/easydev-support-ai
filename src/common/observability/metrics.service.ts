import { Injectable } from '@nestjs/common';
import { MetricsService as SharedMetricsService } from '@easydev/observability';

@Injectable()
export class MetricsService extends SharedMetricsService {
  private metricsMap = new Map<string, number>();

  incrementCounter(metricName: string, value = 1) {
    const current = this.metricsMap.get(metricName) || 0;
    this.metricsMap.set(metricName, current + value);
  }

  async getMetricsString(): Promise<string> {
    let customOutput = '';
    for (const [key, val] of this.metricsMap.entries()) {
      customOutput += `# HELP ${key} Custom metric tracked by Support AI\n`;
      customOutput += `# TYPE ${key} counter\n`;
      customOutput += `${key} ${val}\n\n`;
    }
    const sharedOutput = await this.getMetrics();
    return sharedOutput + '\n' + customOutput;
  }
}
