// user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetUser = createParamDecorator((data, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return { userId: req.user.sub, email: req.user.email, name: req.user.name }; // ✅ Populated by JwtAuthGuard
});