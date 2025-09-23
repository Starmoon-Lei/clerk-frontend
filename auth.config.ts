import { NextAuthConfig } from "next-auth"
import { DynamoDBAdapter } from "@auth/dynamodb-adapter"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb"
import Google from "next-auth/providers/google"

function createDynamoClient() {
  const required = ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY']
  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  try {
    return DynamoDBDocument.from(new DynamoDBClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    }))
  } catch (error) {
    console.error('Failed to initialize DynamoDB client:', error)
    throw new Error('Database initialization failed')
  }
}

const client = createDynamoClient()

export default {
  adapter: DynamoDBAdapter(client, {
    tableName: "clerk-auth",
    partitionKey: "pk",
    sortKey: "sk",
    indexName: "GSI1",
    indexPartitionKey: "GSI1PK",
    indexSortKey: "GSI1SK",
  }),
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
} satisfies NextAuthConfig