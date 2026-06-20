import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ApiSecurityService {
  sanitizeInput(input: string): string {
    if (!input) return '';
    return input
      .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
      .replace(/onload\s*=\s*"[^"]*"/gi, '')
      .replace(/onerror\s*=\s*"[^"]*"/gi, '')
      .replace(/javascript\s*:/gi, '')
      .trim();
  }

  sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') return this.sanitizeInput(obj);
    if (Array.isArray(obj)) return obj.map(item => this.sanitizeObject(item));
    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, val] of Object.entries(obj)) {
        sanitized[key] = this.sanitizeObject(val);
      }
      return sanitized;
    }
    return obj;
  }

  checkRequestSize(sizeInBytes: number, limitInBytes = 10485760): void { // Default 10MB limit
    if (sizeInBytes > limitInBytes) {
      throw new BadRequestException(`Payload size limit exceeded: size ${sizeInBytes} bytes exceeds limit ${limitInBytes} bytes`);
    }
  }

  detectAbuse(ip: string, userAgent: string, inputString: string): { isSuspicious: boolean; score: number; reason?: string } {
    let score = 0;
    const reasons: string[] = [];

    // SQL Injection patterns
    if (/\b(union|select|insert|update|delete|drop|alter|where)\b/i.test(inputString) && /['";\-]/i.test(inputString)) {
      score += 50;
      reasons.push('Possible SQL injection attempt detected');
    }

    // XSS injection patterns
    if (/<script|javascript:|onerror=|onload=/i.test(inputString)) {
      score += 50;
      reasons.push('Possible XSS script tag injection detected');
    }

    // Shell injection patterns
    if (/[;&|`$]/.test(inputString) && /\b(cat|sh|bash|exec|curl|wget|ping)\b/i.test(inputString)) {
      score += 40;
      reasons.push('Possible command execution command patterns found');
    }

    return {
      isSuspicious: score >= 50,
      score,
      reason: reasons.length > 0 ? reasons.join(', ') : undefined,
    };
  }
}
