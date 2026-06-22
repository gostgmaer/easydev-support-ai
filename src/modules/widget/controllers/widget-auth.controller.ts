import {
  Controller,
  Post,
  Body,
  Headers,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { WidgetIdentityService } from '../services/widget-identity.service';
import { IdentifyVisitorDto } from '../dtos/widget.dto';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';

@ApiTags('Widget Authentication')
@Controller('v1/widget/auth')
export class WidgetAuthController {
  constructor(private readonly identityService: WidgetIdentityService) {}

  @ApiOperation({ summary: 'Verify secure customer identity (HMAC) (Public)' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  @Post('verify')
  public async verifyIdentity(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: IdentifyVisitorDto,
  ) {
    if (!tenantId) {
      throw new BadRequestException('Missing Tenant ID');
    }
    const identity = await this.identityService.verifyAndResolveIdentity(
      tenantId,
      dto,
    );
    if (!identity) {
      throw new UnauthorizedException('Identity verification failed');
    }
    return identity.toJSON();
  }
}
