import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required")
}

// Create the connection
const connectionString = process.env.DATABASE_URL
const client = postgres(connectionString, { 
  prepare: false,
  max: 10, // Connection pool size
})

// Create the database instance
export const db = drizzle(client, { schema })

// Helper function to close the connection (useful for serverless)
export const closeConnection = () => client.end()
