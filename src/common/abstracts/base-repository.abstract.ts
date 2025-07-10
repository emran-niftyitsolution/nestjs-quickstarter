import { Document, HydratedDocument, Model } from 'mongoose';

/**
 * Abstract base repository implementing Open/Closed Principle
 * Can be extended for specific entities without modification
 */
export abstract class BaseRepository<T extends Document> {
  constructor(protected readonly model: Model<T>) {}

  /**
   * Create a new document
   */
  async create(createDto: Partial<T>): Promise<HydratedDocument<T>> {
    const document = new this.model(createDto);
    return await document.save();
  }

  /**
   * Find document by ID
   */
  async findById(id: string): Promise<HydratedDocument<T> | null> {
    return await this.model.findById(id).exec();
  }

  /**
   * Find one document by filter
   */
  async findOne(filter: Partial<T>): Promise<HydratedDocument<T> | null> {
    return await this.model.findOne(filter as any).exec();
  }

  /**
   * Find all documents with optional filter
   */
  async findAll(filter: Partial<T> = {}): Promise<HydratedDocument<T>[]> {
    return await this.model.find(filter as any).exec();
  }

  /**
   * Update document by ID
   */
  async updateById(
    id: string,
    updateDto: Partial<T>,
  ): Promise<HydratedDocument<T> | null> {
    return await this.model
      .findByIdAndUpdate(id, updateDto, { new: true })
      .exec();
  }

  /**
   * Update one document by filter
   */
  async updateOne(
    filter: Partial<T>,
    updateDto: Partial<T>,
  ): Promise<HydratedDocument<T> | null> {
    return await this.model
      .findOneAndUpdate(filter as any, updateDto, { new: true })
      .exec();
  }

  /**
   * Delete document by ID
   */
  async deleteById(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec();
    return !!result;
  }

  /**
   * Delete one document by filter
   */
  async deleteOne(filter: Partial<T>): Promise<boolean> {
    const result = await this.model.deleteOne(filter as any).exec();
    return result.deletedCount > 0;
  }

  /**
   * Count documents with optional filter
   */
  async count(filter: Partial<T> = {}): Promise<number> {
    return await this.model.countDocuments(filter as any).exec();
  }

  /**
   * Check if document exists
   */
  async exists(filter: Partial<T>): Promise<boolean> {
    const count = await this.model
      .countDocuments(filter as any)
      .limit(1)
      .exec();
    return count > 0;
  }

  /**
   * Find with pagination
   */
  async findWithPagination(
    filter: Partial<T> = {},
    page: number = 1,
    limit: number = 10,
    sort: Record<string, 1 | -1> = { createdAt: -1 },
  ): Promise<{
    docs: HydratedDocument<T>[];
    totalDocs: number;
    limit: number;
    page: number;
    totalPages: number;
    hasPrevPage: boolean;
    hasNextPage: boolean;
    prevPage?: number;
    nextPage?: number;
  }> {
    const skip = (page - 1) * limit;
    const totalDocs = await this.count(filter);
    const totalPages = Math.ceil(totalDocs / limit);

    const docs = await this.model
      .find(filter as any)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .exec();

    return {
      docs,
      totalDocs,
      limit,
      page,
      totalPages,
      hasPrevPage: page > 1,
      hasNextPage: page < totalPages,
      prevPage: page > 1 ? page - 1 : undefined,
      nextPage: page < totalPages ? page + 1 : undefined,
    };
  }

  /**
   * Bulk create documents
   */
  async bulkCreate(createDtos: Partial<T>[]): Promise<any[]> {
    return await this.model.insertMany(createDtos);
  }

  /**
   * Bulk update documents
   */
  async bulkUpdate(
    filter: Partial<T>,
    updateDto: Partial<T>,
  ): Promise<{ modifiedCount: number }> {
    const result = await this.model.updateMany(filter as any, updateDto).exec();
    return { modifiedCount: result.modifiedCount };
  }

  /**
   * Bulk delete documents
   */
  async bulkDelete(filter: Partial<T>): Promise<{ deletedCount: number }> {
    const result = await this.model.deleteMany(filter as any).exec();
    return { deletedCount: result.deletedCount };
  }
}
