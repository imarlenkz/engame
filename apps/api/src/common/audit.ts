import { Global, Injectable, Logger, Module } from '@nestjs/common';
import type { Prisma } from '@engame/database';
import { PrismaService } from '../infra/infra.module';

/** Append-only audit trail of admin and teacher write actions. */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  constructor(private readonly prisma: PrismaService) {}

  async log(
    actorId: string | null,
    action: string,
    entity: string,
    entityId?: string | null,
    meta: Record<string, unknown> = {},
  ) {
    try {
      await this.prisma.auditLog.create({
        data: { actorId, action, entity, entityId: entityId ?? null, meta: meta as Prisma.InputJsonValue },
      });
    } catch (err) {
      this.logger.error({ err, action, entity }, 'Audit log write failed');
    }
  }
}

@Global()
@Module({ providers: [AuditService], exports: [AuditService] })
export class AuditModule {}
