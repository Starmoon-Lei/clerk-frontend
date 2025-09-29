import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { JOB_TABLE_SCHEMA } from "./schemas/job.schema";

export class DatabaseSetup {
  private dynamoClient: DynamoDBClient;

  constructor() {
    this.dynamoClient = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  /**
   * Setup all required DynamoDB tables
   */
  async setupTables(): Promise<void> {
    console.log('Setting up DynamoDB tables...');

    try {
      await this.createJobsTable();
      console.log('✅ All tables created successfully');
    } catch (error) {
      console.error('❌ Failed to setup tables:', error);
      throw error;
    }
  }

  /**
   * Create the jobs table if it doesn't exist
   */
  private async createJobsTable(): Promise<void> {
    try {
      // Check if table already exists
      const describeCommand = new DescribeTableCommand({
        TableName: JOB_TABLE_SCHEMA.TableName,
      });

      try {
        const result = await this.dynamoClient.send(describeCommand);
        if (result.Table?.TableStatus === 'ACTIVE') {
          console.log(`📋 Table ${JOB_TABLE_SCHEMA.TableName} already exists and is active`);
          return;
        }
      } catch (error: unknown) {
        if ((error as { name?: string }).name !== 'ResourceNotFoundException') {
          throw error;
        }
        // Table doesn't exist, continue to create it
      }

      // Create the table
      const createCommand = new CreateTableCommand(JOB_TABLE_SCHEMA);
      await this.dynamoClient.send(createCommand);

      console.log(`📋 Created table: ${JOB_TABLE_SCHEMA.TableName}`);

      // Wait for table to become active
      await this.waitForTableActive(JOB_TABLE_SCHEMA.TableName);

    } catch (error) {
      console.error(`❌ Failed to create jobs table:`, error);
      throw error;
    }
  }

  /**
   * Wait for table to become active
   */
  private async waitForTableActive(tableName: string): Promise<void> {
    const maxRetries = 30;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const describeCommand = new DescribeTableCommand({ TableName: tableName });
        const result = await this.dynamoClient.send(describeCommand);

        if (result.Table?.TableStatus === 'ACTIVE') {
          console.log(`✅ Table ${tableName} is now active`);
          return;
        }

        console.log(`⏳ Waiting for table ${tableName} to become active... (${retries + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        retries++;

      } catch (error) {
        console.error(`❌ Error checking table status:`, error);
        throw error;
      }
    }

    throw new Error(`❌ Table ${tableName} did not become active within timeout period`);
  }

  /**
   * Verify all tables are properly configured
   */
  async verifyTables(): Promise<boolean> {
    try {
      const describeCommand = new DescribeTableCommand({
        TableName: JOB_TABLE_SCHEMA.TableName,
      });

      const result = await this.dynamoClient.send(describeCommand);

      if (result.Table?.TableStatus !== 'ACTIVE') {
        console.error(`❌ Table ${JOB_TABLE_SCHEMA.TableName} is not active`);
        return false;
      }

      console.log('✅ All tables verified successfully');
      return true;

    } catch (error) {
      console.error('❌ Table verification failed:', error);
      return false;
    }
  }
}

// CLI script for setup
if (require.main === module) {
  async function main() {
    const setup = new DatabaseSetup();

    try {
      await setup.setupTables();
      const isValid = await setup.verifyTables();

      if (isValid) {
        console.log('🎉 Database setup completed successfully!');
        process.exit(0);
      } else {
        console.error('❌ Database setup verification failed');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Database setup failed:', error);
      process.exit(1);
    }
  }

  main();
}