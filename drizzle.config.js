export default {
    dialect: "postgresql",
    schema: "./src/utils/db/schema.ts",
    out: "./drizzle",
    dbCredentials: {
      url: "postgresql://neondb_owner:78FChExSRyfj@ep-square-rain-a5dyhwi3.us-east-2.aws.neon.tech/neondb?sslmode=require",
      connectionString:
        "postgresql://neondb_owner:78FChExSRyfj@ep-square-rain-a5dyhwi3.us-east-2.aws.neon.tech/neondb?sslmode=require",
    },
  };
  