import axios from 'axios';
import { Logger } from '@nestjs/common';

// Refresh this many ms before the token actually expires, to avoid races.
const EXPIRY_SKEW_MS = 60_000;

/**
 * OAuth2 client_credentials token provider for service-to-service calls
 * issued by the IAM service - replaces a single shared x-api-key with a
 * short-lived, scope-limited token tied to this app's own registered IAM
 * application. Mirrors web-agency-backend-api's utils/iamServiceToken.js
 * (the same flow, already proven against the real IAM service from a
 * different caller).
 *
 * Additive: getAuthHeader() resolves to null when clientId/clientSecret
 * aren't configured (or the token request fails), so callers fall back to
 * their legacy x-api-key path until this app is registered as an IAM
 * application (POST /apps on the IAM service) and given real credentials.
 */
export class IamServiceTokenProvider {
  private readonly logger = new Logger(IamServiceTokenProvider.name);
  private readonly tokenUrl: string;
  private cached: { token: string; expiresAt: number } | null = null;
  private inFlight: Promise<string> | null = null;

  constructor(
    iamBaseUrl: string,
    private readonly clientId?: string,
    private readonly clientSecret?: string,
    private readonly scope?: string,
  ) {
    this.tokenUrl = `${iamBaseUrl.replace(/\/+$/, '')}/api/v1/iam/auth/token`;
  }

  isEnabled(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  private async fetchToken(): Promise<string> {
    const res = await axios.post(
      this.tokenUrl,
      {
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: this.scope,
      },
      { timeout: 5000, headers: { 'Content-Type': 'application/json' } },
    );
    // IAM wraps responses as { data: {...} }; tolerate both shapes.
    const body = res.data?.data ?? res.data ?? {};
    const token = body.access_token;
    const expiresInS = Number(body.expires_in) || 3600;
    if (!token) throw new Error('IAM token response missing access_token');
    this.cached = {
      token,
      expiresAt: Date.now() + expiresInS * 1000 - EXPIRY_SKEW_MS,
    };
    return token;
  }

  /**
   * A valid `Bearer <token>` value, or null when client credentials aren't
   * configured or the token request fails - callers should fall back to
   * their legacy auth path in that case rather than hard-failing.
   */
  async getAuthHeader(): Promise<string | null> {
    if (!this.isEnabled()) return null;

    if (this.cached && this.cached.expiresAt > Date.now()) {
      return `Bearer ${this.cached.token}`;
    }
    if (!this.inFlight) {
      this.inFlight = this.fetchToken().finally(() => {
        this.inFlight = null;
      });
    }
    try {
      const token = await this.inFlight;
      return `Bearer ${token}`;
    } catch (err: any) {
      this.logger.error(`Failed to obtain IAM service token: ${err.message}`);
      return null;
    }
  }
}
