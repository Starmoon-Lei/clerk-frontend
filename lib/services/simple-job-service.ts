/**
 * Simple Job Service - 10-Year Engineer Approach
 *
 * REPLACES: consolidated-job-service.ts (474 lines, 8+ methods)
 * PROVIDES: Just the 2 methods actually used (create, update)
 *
 * Zero enterprise patterns. Zero over-engineering. Just database CRUD.
 */

import { OpenAIJob, JobStatus, ProcessingStatus, DocumentType } from '../db/schemas/job.schema';
import { getDatabase } from '../db/database';

// Simple interfaces for the methods we actually use
export interface CreateJobParams {
  fileId: string;
  userId: string;
  fileName: string;
  fileSize: number;
  openaiFileId: string;
}

export interface UpdateJobParams {
  status?: JobStatus;
  openaiProcessingStatus?: ProcessingStatus;
  openaiFileId?: string;
  documentType?: DocumentType;
  confidence?: number;
  extractedData?: Record<string, unknown>;
  errorMessage?: string;
  completedAt?: Date;
}

/**
 * Simple job service - just create and update jobs
 * No analytics, no retry logic, no status transitions, no enterprise features
 */
export class SimpleJobService {
  private db = getDatabase();
  private readonly TABLE_NAME = 'openai-document-processing-jobs';

  /**
   * Create a job - the only creation method needed
   */
  async create(params: CreateJobParams): Promise<OpenAIJob> {
    const now = new Date();
    const scheduledCleanup = new Date(now);
    scheduledCleanup.setDate(scheduledCleanup.getDate() + 14); // 14 days from now

    const job: OpenAIJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fileId: params.fileId,
      userId: params.userId,
      openaiFileId: params.openaiFileId,
      name: params.fileName, // Interface expects 'name', not 'fileName'
      status: JobStatus.PROCESSING,
      openaiProcessingStatus: ProcessingStatus.QUEUED, // PENDING doesn't exist, use QUEUED
      retryCount: 0,
      createdAt: now, // Interface expects Date, not string
      scheduledCleanup // Required by interface
    };

    try {
      await this.db.put(this.TABLE_NAME, job);
      return job;
    } catch (error) {
      console.error('Failed to create job:', error);
      throw new Error('Failed to create job');
    }
  }

  /**
   * Update a job - the only update method needed
   */
  async update(jobId: string, updates: UpdateJobParams): Promise<OpenAIJob> {
    try {
      // Get existing job
      const existingJob = await this.db.get(this.TABLE_NAME, { id: jobId });

      if (!existingJob) {
        throw new Error('Job not found');
      }

      // Merge updates (no updatedAt field in OpenAIJob interface)
      const updatedJob = {
        ...existingJob,
        ...updates
      };

      // Save back to database
      await this.db.put(this.TABLE_NAME, updatedJob);

      return updatedJob as OpenAIJob;
    } catch (error) {
      console.error('Failed to update job:', error);
      throw new Error('Failed to update job');
    }
  }
}

// Singleton pattern (like the old service)
let jobService: SimpleJobService | null = null;

export function getSimpleJobService(): SimpleJobService {
  if (!jobService) {
    jobService = new SimpleJobService();
  }
  return jobService;
}

// Keep the old function name for compatibility
export const getConsolidatedJobService = getSimpleJobService;