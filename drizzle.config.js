export default {
    dialect: "postgresql",
    schema: "./src/utils/db/schema.ts",
    out: "./drizzle",
    dbCredentials: {
      url: "postgresql://neondb_owner:npg_pCRI0WDo2zOV@ep-bold-tree-a4ifxjg9-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require",
      connectionString:
        "postgresql://neondb_owner:npg_pCRI0WDo2zOV@ep-bold-tree-a4ifxjg9-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require",
    },
  };
  