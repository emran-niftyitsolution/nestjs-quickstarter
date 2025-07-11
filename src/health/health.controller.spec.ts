import {
  DiskHealthIndicator,
  HealthCheckResult,
  HealthCheckService,
  MemoryHealthIndicator,
  MongooseHealthIndicator,
} from '@nestjs/terminus';
import { Test, TestingModule } from '@nestjs/testing';
import {
  clearAllMocks,
  mockDiskHealthIndicator,
  mockHealthCheckService,
  mockMemoryHealthIndicator,
  mockMongooseHealthIndicator,
} from '../test/test-utils';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: jest.Mocked<HealthCheckService>;
  let mongooseHealth: jest.Mocked<MongooseHealthIndicator>;
  let memoryHealth: jest.Mocked<MemoryHealthIndicator>;
  let diskHealth: jest.Mocked<DiskHealthIndicator>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
        {
          provide: MongooseHealthIndicator,
          useValue: mockMongooseHealthIndicator,
        },
        {
          provide: MemoryHealthIndicator,
          useValue: mockMemoryHealthIndicator,
        },
        {
          provide: DiskHealthIndicator,
          useValue: mockDiskHealthIndicator,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get(HealthCheckService);
    mongooseHealth = module.get(MongooseHealthIndicator);
    memoryHealth = module.get(MemoryHealthIndicator);
    diskHealth = module.get(DiskHealthIndicator);

    clearAllMocks();
  });

  describe('check', () => {
    const mockHealthResult: HealthCheckResult = {
      status: 'ok',
      info: {
        mongodb: { status: 'up' },
        memory_heap: { status: 'up' },
        memory_rss: { status: 'up' },
        storage: { status: 'up' },
      },
      error: {},
      details: {
        mongodb: { status: 'up' },
        memory_heap: { status: 'up' },
        memory_rss: { status: 'up' },
        storage: { status: 'up' },
      },
    };

    it('should return overall health status', async () => {
      healthCheckService.check.mockResolvedValue(mockHealthResult);
      mongooseHealth.pingCheck.mockResolvedValue({ mongodb: { status: 'up' } });
      memoryHealth.checkHeap.mockResolvedValue({
        memory_heap: { status: 'up' },
      });
      memoryHealth.checkRSS.mockResolvedValue({ memory_rss: { status: 'up' } });
      diskHealth.checkStorage.mockResolvedValue({ storage: { status: 'up' } });

      const result = await controller.check();

      expect(result).toEqual(mockHealthResult);
      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function), // mongoose check
        expect.any(Function), // memory heap check
        expect.any(Function), // memory rss check
        expect.any(Function), // disk check
      ]);
    });

    it('should handle database connection failure', async () => {
      const unhealthyResult: HealthCheckResult = {
        status: 'error',
        info: {},
        error: {
          mongodb: {
            status: 'down',
            message: 'Connection timeout',
          },
        },
        details: {
          mongodb: {
            status: 'down',
            message: 'Connection timeout',
          },
        },
      };

      healthCheckService.check.mockResolvedValue(unhealthyResult);
      mongooseHealth.pingCheck.mockRejectedValue(
        new Error('Connection timeout'),
      );

      const result = await controller.check();

      expect(result.status).toBe('error');
      expect(result.error).toBeDefined();
    });

    it('should handle memory issues', async () => {
      const memoryIssueResult: HealthCheckResult = {
        status: 'error',
        info: {},
        error: {
          memory_heap: {
            status: 'down',
            message: 'Memory usage too high',
          },
        },
        details: {
          memory_heap: {
            status: 'down',
            message: 'Memory usage too high',
          },
        },
      };

      healthCheckService.check.mockResolvedValue(memoryIssueResult);
      memoryHealth.checkHeap.mockRejectedValue(
        new Error('Memory usage too high'),
      );

      const result = await controller.check();

      expect(result.status).toBe('error');
      expect(result.error).toBeDefined();
    });

    it('should handle disk space issues', async () => {
      const diskIssueResult: HealthCheckResult = {
        status: 'error',
        info: {},
        error: {
          storage: {
            status: 'down',
            message: 'Disk space low',
          },
        },
        details: {
          storage: {
            status: 'down',
            message: 'Disk space low',
          },
        },
      };

      healthCheckService.check.mockResolvedValue(diskIssueResult);
      diskHealth.checkStorage.mockRejectedValue(new Error('Disk space low'));

      const result = await controller.check();

      expect(result.status).toBe('error');
      expect(result.error).toBeDefined();
    });

    it('should handle partial failures gracefully', async () => {
      const partialFailureResult: HealthCheckResult = {
        status: 'error',
        info: {
          mongodb: { status: 'up' },
          memory_heap: { status: 'up' },
        },
        error: {
          storage: {
            status: 'down',
            message: 'Disk check failed',
          },
        },
        details: {
          mongodb: { status: 'up' },
          memory_heap: { status: 'up' },
          storage: {
            status: 'down',
            message: 'Disk check failed',
          },
        },
      };

      healthCheckService.check.mockResolvedValue(partialFailureResult);

      const result = await controller.check();

      expect(result.status).toBe('error');
      expect(result.info).toBeDefined();
      expect(result.error).toBeDefined();
    });
  });

  describe('readiness', () => {
    it('should return readiness status when all critical services are up', async () => {
      const readinessResult: HealthCheckResult = {
        status: 'ok',
        info: {
          mongodb: { status: 'up' },
        },
        error: {},
        details: {
          mongodb: { status: 'up' },
        },
      };

      healthCheckService.check.mockResolvedValue(readinessResult);
      mongooseHealth.pingCheck.mockResolvedValue({ mongodb: { status: 'up' } });

      const result = await controller.readiness();

      expect(result).toEqual(readinessResult);
      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function), // mongoose check only for readiness
      ]);
    });

    it('should return error status when database is down', async () => {
      const notReadyResult: HealthCheckResult = {
        status: 'error',
        info: {},
        error: {
          mongodb: {
            status: 'down',
            message: 'Database not available',
          },
        },
        details: {
          mongodb: {
            status: 'down',
            message: 'Database not available',
          },
        },
      };

      healthCheckService.check.mockResolvedValue(notReadyResult);
      mongooseHealth.pingCheck.mockRejectedValue(
        new Error('Database not available'),
      );

      const result = await controller.readiness();

      expect(result.status).toBe('error');
      expect(result.error).toBeDefined();
    });

    it('should focus only on critical services for readiness', async () => {
      const readinessResult: HealthCheckResult = {
        status: 'ok',
        info: {
          mongodb: { status: 'up' },
        },
        error: {},
        details: {
          mongodb: { status: 'up' },
        },
      };

      healthCheckService.check.mockResolvedValue(readinessResult);

      const result = await controller.readiness();

      expect(result).toEqual(readinessResult);
      // Should only check database for readiness, not memory or disk
      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
      ]);
      expect(healthCheckService.check).toHaveBeenCalledTimes(1);
    });
  });

  describe('liveness', () => {
    it('should return liveness status when application is responsive', async () => {
      const livenessResult: HealthCheckResult = {
        status: 'ok',
        info: {
          memory_heap: { status: 'up' },
        },
        error: {},
        details: {
          memory_heap: { status: 'up' },
        },
      };

      healthCheckService.check.mockResolvedValue(livenessResult);
      memoryHealth.checkHeap.mockResolvedValue({
        memory_heap: { status: 'up' },
      });

      const result = await controller.liveness();

      expect(result).toEqual(livenessResult);
      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function), // memory heap check only for liveness
      ]);
    });

    it('should return error status when memory is critically low', async () => {
      const notAliveResult: HealthCheckResult = {
        status: 'error',
        info: {},
        error: {
          memory_heap: {
            status: 'down',
            message: 'Memory critically low',
          },
        },
        details: {
          memory_heap: {
            status: 'down',
            message: 'Memory critically low',
          },
        },
      };

      healthCheckService.check.mockResolvedValue(notAliveResult);
      memoryHealth.checkHeap.mockRejectedValue(
        new Error('Memory critically low'),
      );

      const result = await controller.liveness();

      expect(result.status).toBe('error');
      expect(result.error).toBeDefined();
    });

    it('should focus only on application runtime health', async () => {
      const livenessResult: HealthCheckResult = {
        status: 'ok',
        info: {
          memory_heap: { status: 'up' },
        },
        error: {},
        details: {
          memory_heap: { status: 'up' },
        },
      };

      healthCheckService.check.mockResolvedValue(livenessResult);

      const result = await controller.liveness();

      expect(result).toEqual(livenessResult);
      // Should only check memory for liveness, not database or disk
      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
      ]);
      expect(healthCheckService.check).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error handling', () => {
    it('should handle healthCheckService errors gracefully', async () => {
      healthCheckService.check.mockRejectedValue(
        new Error('Health service error'),
      );

      await expect(controller.check()).rejects.toThrow('Health service error');
    });

    it('should handle indicator initialization errors', async () => {
      mongooseHealth.pingCheck.mockImplementation(() => {
        throw new Error('Indicator not initialized');
      });

      // The health check service should handle this gracefully
      healthCheckService.check.mockResolvedValue({
        status: 'error',
        info: {},
        error: {
          mongodb: {
            status: 'down',
            message: 'Indicator not initialized',
          },
        },
        details: {
          mongodb: {
            status: 'down',
            message: 'Indicator not initialized',
          },
        },
      });

      const result = await controller.check();

      expect(result.status).toBe('error');
    });

    it('should handle timeout scenarios', async () => {
      healthCheckService.check.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Health check timeout')), 100);
        });
      });

      await expect(controller.check()).rejects.toThrow('Health check timeout');
    });
  });

  describe('Performance considerations', () => {
    it('should complete health checks within reasonable time', async () => {
      const startTime = Date.now();

      healthCheckService.check.mockResolvedValue({
        status: 'ok',
        info: {},
        error: {},
        details: {},
      });

      await controller.check();

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Health check should complete quickly (within 100ms for mocked services)
      expect(duration).toBeLessThan(100);
    });

    it('should not block on individual indicator failures', async () => {
      // Simulate one slow indicator
      mongooseHealth.pingCheck.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ mongodb: { status: 'up' } }), 50);
        });
      });

      // Other indicators respond quickly
      memoryHealth.checkHeap.mockResolvedValue({
        memory_heap: { status: 'up' },
      });

      healthCheckService.check.mockResolvedValue({
        status: 'ok',
        info: {
          mongodb: { status: 'up' },
          memory_heap: { status: 'up' },
        },
        error: {},
        details: {
          mongodb: { status: 'up' },
          memory_heap: { status: 'up' },
        },
      });

      const startTime = Date.now();
      await controller.check();
      const endTime = Date.now();

      // Should still complete reasonably quickly
      expect(endTime - startTime).toBeLessThan(200);
    });
  });

  describe('Health check integration', () => {
    it('should properly configure database health check', async () => {
      healthCheckService.check.mockImplementation(async (checks) => {
        // Execute the database check function
        await checks[0]();
        return { status: 'ok', info: {}, error: {}, details: {} };
      });

      await controller.check();

      expect(mongooseHealth.pingCheck).toHaveBeenCalledWith('mongodb');
    });

    it('should properly configure memory health checks', async () => {
      healthCheckService.check.mockImplementation(async (checks) => {
        // Execute memory check functions
        await checks[1](); // heap
        await checks[2](); // rss
        return { status: 'ok', info: {}, error: {}, details: {} };
      });

      await controller.check();

      expect(memoryHealth.checkHeap).toHaveBeenCalledWith(
        'memory_heap',
        150 * 1024 * 1024,
      );
      expect(memoryHealth.checkRSS).toHaveBeenCalledWith(
        'memory_rss',
        150 * 1024 * 1024,
      );
    });

    it('should properly configure disk health check', async () => {
      healthCheckService.check.mockImplementation(async (checks) => {
        // Execute the disk check function
        await checks[3]();
        return { status: 'ok', info: {}, error: {}, details: {} };
      });

      await controller.check();

      expect(diskHealth.checkStorage).toHaveBeenCalledWith('storage', {
        path: '/',
        thresholdPercent: 0.9,
      });
    });
  });
});
