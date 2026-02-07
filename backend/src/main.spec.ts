import { ValidationPipe } from '@nestjs/common';

describe('ValidationPipe', () => {
  it('should be configured correctly', () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    });

    expect(pipe).toBeDefined();
    // @ts-expect-error - accessing private property for testing
    expect(pipe.isTransformEnabled).toBe(true);
    // @ts-expect-error - accessing private property for testing
    expect(pipe.validatorOptions.whitelist).toBe(true);
    // @ts-expect-error - accessing private property for testing
    expect(pipe.validatorOptions.forbidNonWhitelisted).toBe(true);
  });
});
