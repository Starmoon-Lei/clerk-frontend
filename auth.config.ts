import { NextAuthConfig } from "next-auth"
import { DynamoDBAdapter } from "@auth/dynamodb-adapter"
import Google from "next-auth/providers/google"
import { getDynamoDBClient } from "./lib/db/connection-pool"

// Create DynamoDB adapter synchronously at module load
// This ensures Auth.js can validate adapter methods during configuration
const client = getDynamoDBClient();
const adapter = DynamoDBAdapter(client, {
  tableName: "clerk-auth",
  partitionKey: "pk",
  sortKey: "sk",
  indexName: "GSI1",
  indexPartitionKey: "GSI1PK",
  indexSortKey: "GSI1SK",
});

// NextAuth configuration with synchronous adapter
const authConfig: NextAuthConfig = {
  adapter,
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

export default authConfig;