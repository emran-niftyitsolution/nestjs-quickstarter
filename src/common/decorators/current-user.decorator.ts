import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { User } from '../../user/user.schema';

interface RequestWithUser {
  user: User;
}

interface GraphQLContext {
  req: RequestWithUser;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext): User => {
    const contextType = context.getType<'http' | 'graphql'>();

    if (contextType === 'graphql') {
      const ctx = GqlExecutionContext.create(context);
      const gqlContext = ctx.getContext<GraphQLContext>();
      return gqlContext.req.user;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
