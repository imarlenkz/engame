import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { RateLimitGuard } from '../common/rate-limit';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { ChildAccessService, ChildGuard } from './child.guard';
import { OidcService } from './oidc.service';
import { SessionService } from './session.service';

@Global()
@Module({
  controllers: [AuthController],
  providers: [
    SessionService,
    OidcService,
    ChildGuard,
    ChildAccessService,
    // Order matters: authenticate first so rate limits can key on the user.
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },
  ],
  exports: [SessionService, OidcService, ChildGuard, ChildAccessService],
})
export class AuthModule {}
