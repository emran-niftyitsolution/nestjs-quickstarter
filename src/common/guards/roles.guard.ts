import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { UserRole } from '../../user/user.schema';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const contextType = context.getType<'http' | 'graphql'>();
    let user;

    if (contextType === 'graphql') {
      const ctx = GqlExecutionContext.create(context);
      user = ctx.getContext().req.user;
    } else {
      const request = context.switchToHttp().getRequest();
      user = request.user;
    }

    if (!user) {
      return false;
    }

    return requiredRoles.some((role) => user.role === role);
  }
}
