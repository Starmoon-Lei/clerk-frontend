/**
 * Simple DynamoDB client for serverless environments
 * Lazy initialization with basic error handling
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";

// Simple cached client instance
let dynamoClient: DynamoDBDocument | null = null;

function createDynamoClient(): DynamoDBDocument {
  // Check required environment variables
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Missing required AWS configuration. Please set AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY.'
    );
  }

  const client = new DynamoDBClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return DynamoDBDocument.from(client, {
    marshallOptions: {
      removeUndefinedValues: true,
    },
  });
}

/**
 * Get DynamoDB client with lazy initialization
 */
export function getDynamoDBClient(): DynamoDBDocument {
  if (!dynamoClient) {
    dynamoClient = createDynamoClient();
  }
  return dynamoClient;
}