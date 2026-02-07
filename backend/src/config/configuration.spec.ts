import configuration, { validationSchema } from './configuration';

describe('Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      REDIS_URL: 'redis://localhost:6379',
      JWT_SECRET: 'test-secret',
      FRONTEND_URL: 'http://localhost:3000',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('configuration factory', () => {
    it('should return configuration object with required fields', () => {
      const config = configuration();

      expect(config).toHaveProperty('port');
      expect(config).toHaveProperty('nodeEnv');
      expect(config).toHaveProperty('database');
      expect(config).toHaveProperty('redis');
      expect(config).toHaveProperty('jwt');
      expect(config).toHaveProperty('frontend');
      expect(config).toHaveProperty('upload');
      expect(config).toHaveProperty('logging');
    });

    it('should use default values when env vars are not set', () => {
      delete process.env.NODE_ENV;
      delete process.env.PORT;
      delete process.env.JWT_EXPIRATION;
      delete process.env.JWT_REFRESH_EXPIRATION;
      delete process.env.UPLOAD_DIR;
      delete process.env.MAX_FILE_SIZE;
      delete process.env.LOG_LEVEL;

      const config = configuration();

      expect(config.port).toBe(3000);
      expect(config.nodeEnv).toBe('development');
      expect(config.jwt.expiration).toBe('15m');
      expect(config.jwt.refreshExpiration).toBe('7d');
      expect(config.upload.dir).toBe('./uploads');
      expect(config.upload.maxFileSize).toBe(10485760);
      expect(config.logging.level).toBe('info');
    });

    it('should use env vars when set', () => {
      process.env.PORT = '4000';
      process.env.NODE_ENV = 'production';
      process.env.JWT_EXPIRATION = '30m';
      process.env.LOG_LEVEL = 'debug';

      const config = configuration();

      expect(config.port).toBe(4000);
      expect(config.nodeEnv).toBe('production');
      expect(config.jwt.expiration).toBe('30m');
      expect(config.logging.level).toBe('debug');
    });
  });

  describe('validationSchema', () => {
    it('should validate correct env vars', () => {
      const env = {
        DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
        REDIS_URL: 'redis://localhost:6379',
        JWT_SECRET: 'test-secret',
        FRONTEND_URL: 'http://localhost:3000',
      };

      const { error } = validationSchema.validate(env);
      expect(error).toBeUndefined();
    });

    it('should fail when required fields are missing', () => {
      const env = {
        DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
        // Missing required fields
      };

      const { error } = validationSchema.validate(env);
      expect(error).toBeDefined();
    });

    it('should fail for invalid NODE_ENV values', () => {
      const env = {
        DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
        REDIS_URL: 'redis://localhost:6379',
        JWT_SECRET: 'test-secret',
        FRONTEND_URL: 'http://localhost:3000',
        NODE_ENV: 'invalid',
      };

      const { error } = validationSchema.validate(env);
      expect(error).toBeDefined();
      expect(error?.message).toContain('NODE_ENV');
    });
  });
});
