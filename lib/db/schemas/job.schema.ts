export enum ProcessingStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused'
}

export enum DocumentType {
  BANK_STATEMENT = 'bank_statement',
  CREDIT_CARD_STATEMENT = 'credit_card_statement',
  INVOICE = 'invoice',
  RECEIPT = 'receipt',
  TAX_FORM = 'tax_form',
  IDENTITY_DOCUMENT = 'identity_document',
  OTHER = 'other'
}

export enum JobStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused'
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface OpenAIJob {
  id: string; // Primary key
  userId: string; // User identifier for data scoping
  fileId: string; // Local file identifier
  openaiFileId: string; // OpenAI file identifier
  openaiRequestId?: string; // OpenAI processing request ID
  name: string; // Auto-generated descriptive name
  status: JobStatus; // Job status (queued, processing, succeeded, failed)
  openaiProcessingStatus: ProcessingStatus; // OpenAI-specific processing status
  documentType?: DocumentType; // Classified document type
  createdAt: Date; // Job creation timestamp
  startedAt?: Date; // Processing start timestamp
  completedAt?: Date; // Processing completion timestamp
  estimatedCompletion?: Date; // Estimated completion time
  errorMessage?: string; // Error message if failed
  openaiErrorCode?: string; // OpenAI-specific error code
  retryCount: number; // Number of retry attempts (default 0)
  scheduledCleanup: Date; // Scheduled cleanup date (14 days from creation)
  openaiUsage?: TokenUsage; // OpenAI API usage for this job
}

export interface JobFilters {
  status?: JobStatus[];
  documentType?: DocumentType[];
  openaiProcessingStatus?: ProcessingStatus[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
}

export interface CreateJobRequest {
  fileId: string;
  openaiFileId: string;
  userId: string;
  originalFileName: string;
  fileSize: number;
}

export interface JobUpdateRequest {
  status?: JobStatus;
  openaiProcessingStatus?: ProcessingStatus;
  openaiRequestId?: string;
  documentType?: DocumentType;
  estimatedCompletion?: Date;
  errorMessage?: string;
  openaiErrorCode?: string;
  completedAt?: Date;
  openaiUsage?: TokenUsage;
}

// DynamoDB Table Schema
export const JOB_TABLE_SCHEMA = {
  TableName: 'openai-document-processing-jobs',
  KeySchema: [
    {
      AttributeName: 'id',
      KeyType: 'HASH' as const // Partition key
    }
  ],
  AttributeDefinitions: [
    {
      AttributeName: 'id',
      AttributeType: 'S' as const
    },
    {
      AttributeName: 'userId',
      AttributeType: 'S' as const
    },
    {
      AttributeName: 'createdAt',
      AttributeType: 'S' as const
    },
    {
      AttributeName: 'status',
      AttributeType: 'S' as const
    },
    {
      AttributeName: 'documentType',
      AttributeType: 'S' as const
    }
  ],
  GlobalSecondaryIndexes: [
    {
      IndexName: 'UserIndex',
      KeySchema: [
        {
          AttributeName: 'userId',
          KeyType: 'HASH' as const
        },
        {
          AttributeName: 'createdAt',
          KeyType: 'RANGE' as const
        }
      ],
      Projection: {
        ProjectionType: 'ALL' as const
      },
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    },
    {
      IndexName: 'StatusIndex',
      KeySchema: [
        {
          AttributeName: 'status',
          KeyType: 'HASH' as const
        },
        {
          AttributeName: 'createdAt',
          KeyType: 'RANGE' as const
        }
      ],
      Projection: {
        ProjectionType: 'ALL' as const
      },
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    },
    {
      IndexName: 'DocumentTypeIndex',
      KeySchema: [
        {
          AttributeName: 'documentType',
          KeyType: 'HASH' as const
        },
        {
          AttributeName: 'createdAt',
          KeyType: 'RANGE' as const
        }
      ],
      Projection: {
        ProjectionType: 'ALL' as const
      },
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    }
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 10,
    WriteCapacityUnits: 10
  },
  TimeToLiveSpecification: {
    AttributeName: 'scheduledCleanup',
    Enabled: true
  }
};

// Helper functions for schema validation
export function validateJobData(job: Partial<OpenAIJob>): void {
  if (!job.userId) {
    throw new Error('User ID is required');
  }

  if (!job.fileId) {
    throw new Error('File ID is required');
  }

  if (!job.openaiFileId) {
    throw new Error('OpenAI File ID is required');
  }

  if (!job.name || job.name.trim().length === 0) {
    throw new Error('Job name is required');
  }

  if (job.retryCount !== undefined && (job.retryCount < 0 || job.retryCount > 10)) {
    throw new Error('Retry count must be between 0 and 10');
  }
}

export function generateJobName(fileName: string, documentType?: DocumentType): string {
  const timestamp = new Date().toISOString().split('T')[0];
  const baseName = fileName.replace(/\.[^/.]+$/, ''); // Remove extension

  if (documentType) {
    const typeLabel = documentType.replace(/_/g, ' ').toLowerCase();
    return `${typeLabel} - ${baseName} (${timestamp})`;
  }

  return `${baseName} (${timestamp})`;
}