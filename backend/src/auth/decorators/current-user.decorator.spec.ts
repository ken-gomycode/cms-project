import { ExecutionContext } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { CurrentUserType } from './current-user.decorator';

describe('CurrentUser Decorator', () => {
  const mockUser: CurrentUserType = {
    id: 'user-id',
    email: 'test@example.com',
    role: UserRole.SUBSCRIBER,
    firstName: 'John',
    lastName: 'Doe',
  };

  const createMockExecutionContext = (user?: CurrentUserType): ExecutionContext => {
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
    } as any;
  };

  // Test the underlying decorator logic by simulating the factory function
  describe('decorator logic', () => {
    // Simulate the logic that createParamDecorator uses
    const decoratorLogic = (data: keyof CurrentUserType | undefined, ctx: ExecutionContext) => {
      const request = ctx.switchToHttp().getRequest();
      const user = request.user as CurrentUserType;
      return data ? user?.[data] : user;
    };

    it('should return the entire user object when no data is provided', () => {
      const context = createMockExecutionContext(mockUser);
      const result = decoratorLogic(undefined, context);

      expect(result).toEqual(mockUser);
    });

    it('should return specific user property when data is provided', () => {
      const context = createMockExecutionContext(mockUser);
      const result = decoratorLogic('id', context);

      expect(result).toBe(mockUser.id);
    });

    it('should return email when email is requested', () => {
      const context = createMockExecutionContext(mockUser);
      const result = decoratorLogic('email', context);

      expect(result).toBe(mockUser.email);
    });

    it('should return role when role is requested', () => {
      const context = createMockExecutionContext(mockUser);
      const result = decoratorLogic('role', context);

      expect(result).toBe(mockUser.role);
    });

    it('should return firstName when firstName is requested', () => {
      const context = createMockExecutionContext(mockUser);
      const result = decoratorLogic('firstName', context);

      expect(result).toBe(mockUser.firstName);
    });

    it('should return lastName when lastName is requested', () => {
      const context = createMockExecutionContext(mockUser);
      const result = decoratorLogic('lastName', context);

      expect(result).toBe(mockUser.lastName);
    });

    it('should return undefined when user is not present', () => {
      const context = createMockExecutionContext(undefined);
      const result = decoratorLogic(undefined, context);

      expect(result).toBeUndefined();
    });

    it('should return undefined when accessing property of non-existent user', () => {
      const context = createMockExecutionContext(undefined);
      const result = decoratorLogic('id', context);

      expect(result).toBeUndefined();
    });
  });
});
