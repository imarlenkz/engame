import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Errors } from '../common/errors';
import { PrismaService } from '../infra/infra.module';
import type { AuthedRequest } from './auth.types';

/**
 * Resolves the child a learning request acts for:
 * a CHILD account acts for its own profile; a PARENT acts for the child selected on this device.
 */
@Injectable()
export class ChildGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest & { childId?: string }>();
    const auth = req.auth;
    if (!auth) throw Errors.unauthorized();

    if (auth.user.role === 'CHILD') {
      const child = await this.prisma.childProfile.findUnique({ where: { userId: auth.user.id } });
      if (!child || child.deletedAt) throw Errors.notFound('Child');
      req.childId = child.id;
      return true;
    }
    if (auth.user.role === 'PARENT') {
      const childId = auth.session.activeChildId;
      if (!childId) throw Errors.noChild();
      const link = await this.prisma.guardianship.findUnique({
        where: { parentId_childId: { parentId: auth.user.id, childId } },
        include: { child: true },
      });
      if (!link || link.child.deletedAt) throw Errors.noChild();
      req.childId = childId;
      return true;
    }
    throw Errors.forbidden('Only children and parents can use learning endpoints');
  }
}

/** Who may read a child's progress: the child, a guardian, a teacher of one of the child's classes, or an admin. */
@Injectable()
export class ChildAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async canView(user: { id: string; role: string }, childId: string): Promise<boolean> {
    switch (user.role) {
      case 'ADMIN':
        return true;
      case 'PARENT':
        return (await this.prisma.guardianship.count({ where: { parentId: user.id, childId } })) > 0;
      case 'TEACHER':
        return (
          (await this.prisma.classMember.count({ where: { childId, class: { teacherId: user.id } } })) > 0
        );
      case 'CHILD':
        return (await this.prisma.childProfile.count({ where: { id: childId, userId: user.id } })) > 0;
      default:
        return false;
    }
  }

  async assertCanView(user: { id: string; role: string }, childId: string) {
    if (!(await this.canView(user, childId))) throw Errors.notFound('Child');
  }
}
