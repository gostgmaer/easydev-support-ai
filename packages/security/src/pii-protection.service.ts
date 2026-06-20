import { Injectable } from '@nestjs/common';

@Injectable()
export class PiiProtectionService {
  private readonly emailRegex = /[\w\.-]+@[\w\.-]+\.\w{2,4}/gi;
  private readonly phoneRegex = /\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;
  private readonly ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
  private readonly creditCardRegex = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;

  detectPii(text: string): { hasPii: boolean; types: string[] } {
    const types: string[] = [];
    if (this.emailRegex.test(text)) types.push('email');
    if (this.phoneRegex.test(text)) types.push('phone');
    if (this.ssnRegex.test(text)) types.push('ssn');
    if (this.creditCardRegex.test(text)) types.push('credit_card');

    // Reset regex index states
    this.emailRegex.lastIndex = 0;
    this.phoneRegex.lastIndex = 0;
    this.ssnRegex.lastIndex = 0;
    this.creditCardRegex.lastIndex = 0;

    return {
      hasPii: types.length > 0,
      types,
    };
  }

  maskPii(text: string): string {
    if (!text) return '';
    return text
      .replace(this.emailRegex, '***@***.***')
      .replace(this.creditCardRegex, '****-****-****-****')
      .replace(this.ssnRegex, '***-**-****')
      .replace(this.phoneRegex, '***-***-****');
  }

  redactPii(text: string): string {
    if (!text) return '';
    return text
      .replace(this.emailRegex, '[REDACTED_EMAIL]')
      .replace(this.creditCardRegex, '[REDACTED_PAYMENT_DATA]')
      .replace(this.ssnRegex, '[REDACTED_SSN]')
      .replace(this.phoneRegex, '[REDACTED_PHONE]');
  }

  maskPiiInObject(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') return this.maskPii(obj);
    if (Array.isArray(obj)) return obj.map(item => this.maskPiiInObject(item));
    if (typeof obj === 'object') {
      const masked: any = {};
      for (const [key, val] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes('email') ||
          lowerKey.includes('phone') ||
          lowerKey.includes('address') ||
          lowerKey.includes('cardnumber') ||
          lowerKey.includes('ssn') ||
          lowerKey.includes('password') ||
          lowerKey.includes('secret') ||
          lowerKey.includes('token')
        ) {
          if (typeof val === 'string') {
            masked[key] = '[REDACTED]';
          } else {
            masked[key] = val;
          }
        } else {
          masked[key] = this.maskPiiInObject(val);
        }
      }
      return masked;
    }
    return obj;
  }
}
