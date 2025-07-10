import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  DiskHealthIndicator,
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  MongooseHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private mongoose: MongooseHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({
    summary: 'Complete health check',
    description:
      'Performs comprehensive health checks for database, memory, and disk storage',
  })
  @ApiResponse({
    status: 200,
    description: 'Health check completed successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        info: {
          type: 'object',
          properties: {
            mongodb: {
              type: 'object',
              properties: { status: { type: 'string', example: 'up' } },
            },
            memory_heap: {
              type: 'object',
              properties: { status: { type: 'string', example: 'up' } },
            },
            memory_rss: {
              type: 'object',
              properties: { status: { type: 'string', example: 'up' } },
            },
            storage: {
              type: 'object',
              properties: { status: { type: 'string', example: 'up' } },
            },
          },
        },
        error: { type: 'object' },
        details: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Health check failed',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'error' },
        info: { type: 'object' },
        error: { type: 'object' },
        details: { type: 'object' },
      },
    },
  })
  check() {
    return this.health.check([
      () => this.mongoose.pingCheck('mongodb'),
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024),
      () =>
        this.disk.checkStorage('storage', {
          path: '/',
          thresholdPercent: 0.9,
        }),
    ]);
  }

  @Get('readiness')
  @Public()
  @HealthCheck()
  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'Checks if the application is ready to serve traffic (database connectivity)',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is ready',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        info: {
          type: 'object',
          properties: {
            mongodb: {
              type: 'object',
              properties: { status: { type: 'string', example: 'up' } },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Application is not ready',
  })
  readiness() {
    return this.health.check([() => this.mongoose.pingCheck('mongodb')]);
  }

  @Get('liveness')
  @Public()
  @HealthCheck()
  @ApiOperation({
    summary: 'Liveness probe',
    description:
      'Checks if the application is alive and responsive (memory usage)',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is alive',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        info: {
          type: 'object',
          properties: {
            memory_heap: {
              type: 'object',
              properties: { status: { type: 'string', example: 'up' } },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Application is not responsive',
  })
  liveness() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 200 * 1024 * 1024),
    ]);
  }
}
