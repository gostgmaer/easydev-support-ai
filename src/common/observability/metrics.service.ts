import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsService {
  private metricsMap = new Map<string, number>();

  incrementCounter(metricName: string, value = 1) {
    const current = this.metricsMap.get(metricName) || 0;
    this.metricsMap.set(metricName, current + value);
  }

  getMetricsString(): string {
    let output = '';
    for (const [key, val] of this.metricsMap.entries()) {
      output += `# HELP ${key} Custom metric tracked by Support AI\n`;
      output += `# TYPE ${key} counter\n`;
      output += `${key} ${val}\n\n`;
    }
    return output || '# No metrics collected yet\n';
  }
}
