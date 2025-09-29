import { DynamoDBClient, GetItemCommand, PutItemCommand, UpdateItemCommand, QueryCommand, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

export interface QueryOptions {
  useCache?: boolean;
  cacheTtl?: number;
  limit?: number;
  parallel?: boolean;
  indexName?: string;
  projectionExpression?: string;
  expressionAttributeNames?: Record<string, string>;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export interface QueryConditions {
  [key: string]: unknown;
}

export interface UpdateOptions {
  conditionExpression?: string;
  returnValues?: 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW';
}

interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(pattern?: string): Promise<void>;
}

// Simple in-memory cache for now
class MemoryCache implements CacheService {
  private cache = new Map<string, { value: unknown; expires: number }>();

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    if (!item || item.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return item.value as T;
  }

  async set<T>(key: string, value: T, ttl = 300000): Promise<void> {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(pattern?: string): Promise<void> {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}

export class Database {
  private client: DynamoDBClient;
  private cache: CacheService;

  constructor() {
    this.client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      },
      maxAttempts: 3
    });
    this.cache = new MemoryCache();
  }

  /**
   * Get a single item by key
   */
  async get<T>(table: string, key: Record<string, unknown>, options?: QueryOptions): Promise<T | null> {
    const cacheKey = options?.useCache ? this.getCacheKey(table, key) : null;

    // Check cache if enabled
    if (cacheKey) {
      const cached = await this.cache.get<T>(cacheKey);
      if (cached) return cached;
    }

    try {
      const command = new GetItemCommand({
        TableName: table,
        Key: marshall(key),
        ProjectionExpression: options?.projectionExpression,
        ExpressionAttributeNames: options?.expressionAttributeNames
      });

      const result = await this.client.send(command);
      const item = result.Item ? unmarshall(result.Item) as T : null;

      // Cache if enabled
      if (item && cacheKey) {
        await this.cache.set(cacheKey, item, options?.cacheTtl || 300000);
      }

      return item;
    } catch (error) {
      throw this.formatError('get item', error, { table, key });
    }
  }

  /**
   * Put an item
   */
  async put<T>(table: string, item: T, conditionExpression?: string): Promise<void> {
    try {
      const command = new PutItemCommand({
        TableName: table,
        Item: marshall(item as Record<string, unknown>),
        ConditionExpression: conditionExpression
      });

      await this.client.send(command);

      // Invalidate related caches
      await this.invalidateCaches(table);
    } catch (error) {
      throw this.formatError('put item', error, { table, item });
    }
  }

  /**
   * Update an item
   */
  async update<T>(
    table: string,
    key: Record<string, unknown>,
    updates: Record<string, unknown>,
    options?: UpdateOptions
  ): Promise<T | null> {
    try {
      const updateExpression = this.buildUpdateExpression(updates);
      const expressionAttributeValues = marshall(this.flattenUpdateValues(updates));

      const command = new UpdateItemCommand({
        TableName: table,
        Key: marshall(key),
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ConditionExpression: options?.conditionExpression,
        ReturnValues: options?.returnValues || 'ALL_NEW'
      });

      const result = await this.client.send(command);
      const updatedItem = result.Attributes ? unmarshall(result.Attributes) as T : null;

      // Invalidate related caches
      await this.invalidateCaches(table);

      return updatedItem;
    } catch (error) {
      throw this.formatError('update item', error, { table, key, updates });
    }
  }

  /**
   * Query items
   */
  async query<T>(
    table: string,
    keyConditionExpression: string,
    expressionAttributeValues: Record<string, unknown>,
    options?: QueryOptions
  ): Promise<T[]> {
    const cacheKey = options?.useCache ?
      this.getQueryCacheKey(table, keyConditionExpression, expressionAttributeValues) : null;

    // Check cache if enabled
    if (cacheKey) {
      const cached = await this.cache.get<T[]>(cacheKey);
      if (cached) return cached;
    }

    try {
      const command = new QueryCommand({
        TableName: table,
        IndexName: options?.indexName,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: marshall(expressionAttributeValues),
        ExpressionAttributeNames: options?.expressionAttributeNames,
        ProjectionExpression: options?.projectionExpression,
        Limit: options?.limit,
        ScanIndexForward: options?.order === 'desc' ? false : true
      });

      const result = await this.client.send(command);
      const items = result.Items?.map(item => unmarshall(item) as T) || [];

      // Sort if requested
      if (options?.sortBy && !options?.indexName) {
        items.sort((a: T, b: T) => {
          const aVal = (a as Record<string, unknown>)[options.sortBy!];
          const bVal = (b as Record<string, unknown>)[options.sortBy!];
          // Safe comparison for unknown types
          const comparison = String(aVal) < String(bVal) ? -1 : String(aVal) > String(bVal) ? 1 : 0;
          return options.order === 'desc' ? -comparison : comparison;
        });
      }

      // Cache if enabled
      if (cacheKey) {
        await this.cache.set(cacheKey, items, options?.cacheTtl || 60000);
      }

      return items;
    } catch (error) {
      throw this.formatError('query items', error, { table, keyConditionExpression });
    }
  }

  /**
   * Delete an item
   */
  async delete(table: string, key: Record<string, unknown>): Promise<void> {
    try {
      const command = new DeleteItemCommand({
        TableName: table,
        Key: marshall(key)
      });

      await this.client.send(command);

      // Invalidate related caches
      await this.invalidateCaches(table);
    } catch (error) {
      throw this.formatError('delete item', error, { table, key });
    }
  }

  /**
   * Batch get items (for multiple IDs)
   */
  async batchGet<T>(table: string, keys: Record<string, unknown>[]): Promise<T[]> {
    // For simplicity, implement as multiple gets
    // In production, would use BatchGetItemCommand
    const promises = keys.map(key => this.get<T>(table, key));
    const results = await Promise.all(promises);
    return results.filter(item => item !== null) as T[];
  }

  /**
   * Transaction write (put/update/delete multiple items atomically)
   */
  async transaction(operations: Array<{
    type: 'put' | 'update' | 'delete';
    table: string;
    item?: unknown;
    key?: Record<string, unknown>;
    updates?: Record<string, unknown>;
  }>): Promise<void> {
    // For simplicity, execute sequentially
    // In production, would use TransactWriteItemsCommand
    for (const op of operations) {
      switch (op.type) {
        case 'put':
          await this.put(op.table, op.item);
          break;
        case 'update':
          if (op.key && op.updates) {
            await this.update(op.table, op.key, op.updates);
          }
          break;
        case 'delete':
          if (op.key) {
            await this.delete(op.table, op.key);
          }
          break;
      }
    }
  }

  /**
   * Build update expression from updates object
   */
  private buildUpdateExpression(updates: Record<string, unknown>): string {
    const setParts: string[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        setParts.push(`${key} = :${key}`);
      }
    }

    return setParts.length > 0 ? `SET ${setParts.join(', ')}` : '';
  }

  /**
   * Flatten update values for DynamoDB
   */
  private flattenUpdateValues(updates: Record<string, unknown>): Record<string, unknown> {
    const flattened: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        flattened[`:${key}`] = value;
      }
    }

    return flattened;
  }

  /**
   * Generate cache key for get operations
   */
  private getCacheKey(table: string, key: Record<string, unknown>): string {
    const keyStr = Object.entries(key)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join('|');
    return `${table}:${keyStr}`;
  }

  /**
   * Generate cache key for query operations
   */
  private getQueryCacheKey(
    table: string,
    keyConditionExpression: string,
    expressionAttributeValues: Record<string, unknown>
  ): string {
    const valuesStr = Object.entries(expressionAttributeValues)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join('|');
    return `query:${table}:${keyConditionExpression}:${valuesStr}`;
  }

  /**
   * Invalidate caches related to an item
   */
  private async invalidateCaches(table: string): Promise<void> {
    try {
      // Clear all caches for this table
      await this.cache.clear(`${table}:`);
      await this.cache.clear(`query:${table}:`);
    } catch (error) {
      // Don't throw - cache invalidation failure shouldn't break the operation
      console.warn('Failed to invalidate caches:', error);
    }
  }

  /**
   * Format error with context
   */
  private formatError(operation: string, error: unknown, context?: unknown): Error {
    const baseMessage = `Database ${operation} failed`;
    const details = error instanceof Error ? error.message : 'Unknown error';
    const contextStr = context ? ` Context: ${JSON.stringify(context)}` : '';

    return new Error(`${baseMessage}: ${details}${contextStr}`);
  }
}

// Singleton instance
let databaseInstance: Database | null = null;

export function getDatabase(): Database {
  if (!databaseInstance) {
    databaseInstance = new Database();
  }
  return databaseInstance;
}