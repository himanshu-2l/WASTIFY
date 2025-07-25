import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
const sql = neon(
  "postgresql://neondb_owner:npg_pCRI0WDo2zOV@ep-bold-tree-a4ifxjg9-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"
);
export const db = drizzle(sql, { schema });
