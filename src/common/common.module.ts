import { Module } from '@nestjs/common';
import { CacheService } from './services/cache.service';

/**
 * Common Module providing shared services following SOLID principles:
 * - Single Responsibility: Groups common utilities and services
 * - Open/Closed: Extensible without modifying existing code
 * - Dependency Inversion: Provides abstractions for other modules
 */
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CommonModule {}
