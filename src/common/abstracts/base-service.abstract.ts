import { Logger } from '@nestjs/common';
import { Document, HydratedDocument } from 'mongoose';
import { BaseRepository } from './base-repository.abstract';

/**
 * Abstract base service implementing Open/Closed Principle
 * Can be extended for specific business logic without modification
 */
export abstract class BaseService<T extends Document> {
  protected readonly logger: Logger;

  constructor(
    protected readonly repository: BaseRepository<T>,
    loggerContext: string,
  ) {
    this.logger = new Logger(loggerContext);
  }

  /**
   * Create entity with logging and validation
   */
  async create(createDto: Partial<T>): Promise<HydratedDocument<T>> {
    try {
      this.logger.log(`Creating new ${this.getEntityName()}`);

      // Pre-creation validation hook
      await this.validateBeforeCreate(createDto);

      const entity = await this.repository.create(createDto);

      // Post-creation hook
      await this.afterCreate(entity);

      this.logger.log(
        `Successfully created ${this.getEntityName()} with ID: ${entity._id}`,
      );
      return entity;
    } catch (error) {
      this.logger.error(
        `Failed to create ${this.getEntityName()}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Find entity by ID with logging
   */
  async findById(id: string): Promise<HydratedDocument<T> | null> {
    try {
      this.logger.debug(`Finding ${this.getEntityName()} by ID: ${id}`);
      return await this.repository.findById(id);
    } catch (error) {
      this.logger.error(
        `Failed to find ${this.getEntityName()} by ID ${id}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Update entity by ID with logging and validation
   */
  async updateById(
    id: string,
    updateDto: Partial<T>,
  ): Promise<HydratedDocument<T> | null> {
    try {
      this.logger.log(`Updating ${this.getEntityName()} with ID: ${id}`);

      // Pre-update validation hook
      await this.validateBeforeUpdate(id, updateDto);

      const entity = await this.repository.updateById(id, updateDto);

      if (entity) {
        // Post-update hook
        await this.afterUpdate(entity);
        this.logger.log(
          `Successfully updated ${this.getEntityName()} with ID: ${id}`,
        );
      } else {
        this.logger.warn(
          `${this.getEntityName()} with ID ${id} not found for update`,
        );
      }

      return entity;
    } catch (error) {
      this.logger.error(
        `Failed to update ${this.getEntityName()} with ID ${id}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Delete entity by ID with logging
   */
  async deleteById(id: string): Promise<boolean> {
    try {
      this.logger.log(`Deleting ${this.getEntityName()} with ID: ${id}`);

      // Pre-deletion validation hook
      await this.validateBeforeDelete(id);

      const result = await this.repository.deleteById(id);

      if (result) {
        // Post-deletion hook
        await this.afterDelete(id);
        this.logger.log(
          `Successfully deleted ${this.getEntityName()} with ID: ${id}`,
        );
      } else {
        this.logger.warn(
          `${this.getEntityName()} with ID ${id} not found for deletion`,
        );
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to delete ${this.getEntityName()} with ID ${id}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Find all entities with optional filter
   */
  async findAll(filter: Partial<T> = {}): Promise<HydratedDocument<T>[]> {
    try {
      this.logger.debug(`Finding all ${this.getEntityName()}s with filter`);
      return await this.repository.findAll(filter);
    } catch (error) {
      this.logger.error(
        `Failed to find ${this.getEntityName()}s: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Check if entity exists
   */
  async exists(filter: Partial<T>): Promise<boolean> {
    try {
      return await this.repository.exists(filter);
    } catch (error) {
      this.logger.error(
        `Failed to check ${this.getEntityName()} existence: ${error.message}`,
      );
      throw error;
    }
  }

  // Abstract methods for entity-specific logic (Template Method Pattern)

  /**
   * Get entity name for logging
   */
  protected abstract getEntityName(): string;

  /**
   * Hook: Validate before entity creation
   */
  protected async validateBeforeCreate(createDto: Partial<T>): Promise<void> {
    // Override in subclasses if needed
  }

  /**
   * Hook: Execute after entity creation
   */
  protected async afterCreate(entity: HydratedDocument<T>): Promise<void> {
    // Override in subclasses if needed
  }

  /**
   * Hook: Validate before entity update
   */
  protected async validateBeforeUpdate(
    id: string,
    updateDto: Partial<T>,
  ): Promise<void> {
    // Override in subclasses if needed
  }

  /**
   * Hook: Execute after entity update
   */
  protected async afterUpdate(entity: HydratedDocument<T>): Promise<void> {
    // Override in subclasses if needed
  }

  /**
   * Hook: Validate before entity deletion
   */
  protected async validateBeforeDelete(id: string): Promise<void> {
    // Override in subclasses if needed
  }

  /**
   * Hook: Execute after entity deletion
   */
  protected async afterDelete(id: string): Promise<void> {
    // Override in subclasses if needed
  }
}
