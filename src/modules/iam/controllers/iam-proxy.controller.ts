import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { IamGatewayService } from '../iam-gateway.service';
import type {
  ForgotPasswordPayload,
  LoginCredentials,
  PasswordChangePayload,
  ResetPasswordPayload,
  UserProfileUpdate,
} from '../iam-gateway.types';

const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_COOKIE_PATH = '/v1/iam/auth/refresh';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Implements every `/v1/iam/*` route the frontend's IamClient calls, adapting
 * each one to the real IAM microservice via IamGatewayService. This gateway
 * also owns the httpOnly refresh-token cookie (the upstream's own cookie
 * support is gated behind an AUTH_MODE the deployed instance doesn't run with)
 * — see IamGatewayService's class doc for why.
 */
@Controller('v1/iam')
export class IamProxyController {
  constructor(private readonly gateway: IamGatewayService) {}

  @Post('auth/login')
  async login(@Body() credentials: LoginCredentials, @Res({ passthrough: true }) res: Response) {
    const session = await this.gateway.login(credentials);
    this.setRefreshCookie(res, session.tokens.refreshToken);
    return session;
  }

  @Post('auth/logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = this.extractBearerToken(req);
    try {
      await this.gateway.logout(token);
    } finally {
      this.clearRefreshCookie(res);
    }
  }

  @Post('auth/refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = this.getRefreshCookie(req);
    const tokens = await this.gateway.refresh(refreshToken ?? '');
    this.setRefreshCookie(res, tokens.refreshToken);
    return tokens;
  }

  @Get('auth/session')
  async getSession(@Req() req: Request) {
    const token = this.extractBearerToken(req);
    return this.gateway.getSession(token, this.getRefreshCookie(req));
  }

  @Post('auth/password/forgot')
  forgotPassword(@Body() payload: ForgotPasswordPayload) {
    return this.gateway.forgotPassword(payload);
  }

  @Post('auth/password/reset')
  resetPassword(@Body() payload: ResetPasswordPayload) {
    return this.gateway.resetPassword(payload);
  }

  @Post('tenants/:tenantId/switch')
  async switchTenant(
    @Param('tenantId') tenantId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = this.extractBearerToken(req);
    const result = await this.gateway.switchTenant(token, tenantId);
    this.setRefreshCookie(res, result.refreshToken);
    return result;
  }

  @Get('me/profile')
  getProfile(@Req() req: Request) {
    return this.gateway.getProfile(this.extractBearerToken(req));
  }

  @Patch('me/profile')
  updateProfile(@Req() req: Request, @Body() update: UserProfileUpdate) {
    return this.gateway.updateProfile(this.extractBearerToken(req), update);
  }

  @Get('me/permissions')
  getPermissions(@Req() req: Request) {
    return this.gateway.getPermissions(this.extractBearerToken(req));
  }

  @Get('me/tenants')
  getTenants(@Req() req: Request) {
    return this.gateway.getTenants(this.extractBearerToken(req));
  }

  @Post('me/password/change')
  changePassword(@Req() req: Request, @Body() payload: PasswordChangePayload) {
    return this.gateway.changePassword(this.extractBearerToken(req), payload);
  }

  @Get('me/sessions')
  listSessions(@Req() req: Request) {
    return this.gateway.listSessions(this.extractBearerToken(req));
  }

  @Delete('me/sessions/:sessionId')
  revokeSession(@Req() req: Request, @Param('sessionId') sessionId: string) {
    return this.gateway.revokeSession(this.extractBearerToken(req), sessionId);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private extractBearerToken(req: Request): string {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    return header.slice('Bearer '.length);
  }

  /** Manual Cookie-header parse — this app has no cookie-parser middleware installed,
   * and only ever needs to read this one cookie. */
  private getRefreshCookie(req: Request): string | undefined {
    const header = req.headers.cookie;
    if (!header) return undefined;
    for (const pair of header.split(';')) {
      const idx = pair.indexOf('=');
      if (idx === -1) continue;
      const name = pair.slice(0, idx).trim();
      if (name === REFRESH_COOKIE_NAME) {
        return decodeURIComponent(pair.slice(idx + 1).trim());
      }
    }
    return undefined;
  }

  private setRefreshCookie(res: Response, value: string): void {
    res.cookie(REFRESH_COOKIE_NAME, value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: REFRESH_COOKIE_PATH,
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
  }
}
