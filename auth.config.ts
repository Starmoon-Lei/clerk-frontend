import { NextAuthConfig } from "next-auth"
import { DynamoDBAdapter } from "@auth/dynamodb-adapter"
import Google from "next-auth/providers/google"
import { getDynamoDBClient } from "./lib/db/connection-pool"

// Use lazy initialization to avoid creating client at module load
async function createDynamoAdapter() {
  const client = await getDynamoDBClient();
  return DynamoDBAdapter(client, {
    tableName: "clerk-auth",
    partitionKey: "pk",
    sortKey: "sk",
    indexName: "GSI1",
    indexPartitionKey: "GSI1PK",
    indexSortKey: "GSI1SK",
  });
}

// NextAuth configuration with lazy adapter initialization
const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async session({ session, user }) {
      // With database sessions, user comes from database, not token
      if (user) {
        session.user.id = user.id
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Ensure safe redirects
      if (url.startsWith("/")) return `${baseUrl}${url}`
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    }
  },
  session: {
    strategy: "database", // Use database sessions with DynamoDB
    maxAge: 7 * 24 * 60 * 60, // 7 days
  }
};

// Initialize adapter lazily to avoid connection at module load
let cachedAdapter: any = null;
let adapterInitPromise: Promise<any> | null = null;

// Safe mutex implementation for adapter initialization
async function getAdapter() {
  // Fast path: if adapter is already cached, return it
  if (cachedAdapter) {
    return cachedAdapter;
  }

  // If initialization is already in progress, wait for it
  if (adapterInitPromise) {
    return await adapterInitPromise;
  }

  // Start initialization (atomic operation)
  console.log('🔐 Initializing DynamoDB adapter...');
  adapterInitPromise = createDynamoAdapter()
    .then(adapter => {
      cachedAdapter = adapter;
      console.log('✅ DynamoDB adapter initialized successfully');
      return adapter;
    })
    .catch(error => {
      console.error('❌ Failed to initialize DynamoDB adapter:', error);
      // Reset promise on error to allow retry
      adapterInitPromise = null;
      throw error;
    });

  return await adapterInitPromise;
}

// Override the adapter property with a getter that initializes lazily
Object.defineProperty(authConfig, 'adapter', {
  get: function() {
    return getAdapter();
  },
  enumerable: true,
  configurable: true
});

export default authConfig;