import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
    connectionString: 'postgresql://neondb_owner:78FChExSRyfj@ep-square-rain-a5dyhwi3.us-east-2.aws.neon.tech/neondb?sslmode=require&connect_timeout=30',
});

async function createTables() {
    try {
        await client.connect();
        console.log("Connected to the database successfully!");

        // Users table
        const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;

        // Reports table
        const createReportsTable = `
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        location TEXT NOT NULL,
        waste_type VARCHAR(255) NOT NULL,
        amount VARCHAR(255) NOT NULL,
        image_url TEXT,
        verification_result JSONB,
        status VARCHAR(255) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        collector_id INTEGER REFERENCES users(id)
      );
    `;

        // Rewards table
        const createRewardsTable = `
      CREATE TABLE IF NOT EXISTS rewards (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        points INTEGER NOT NULL DEFAULT 0,
        level INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        is_available BOOLEAN NOT NULL DEFAULT true,
        description TEXT,
        name VARCHAR(255) NOT NULL,
        collection_info TEXT NOT NULL
      );
    `;

        // CollectedWastes table
        const createCollectedWastesTable = `
      CREATE TABLE IF NOT EXISTS collected_wastes (
        id SERIAL PRIMARY KEY,
        report_id INTEGER REFERENCES reports(id) NOT NULL,
        collector_id INTEGER REFERENCES users(id) NOT NULL,
        collection_date TIMESTAMP NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'collected'
      );
    `;

        // Notifications table
        const createNotificationsTable = `
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;

        // Transactions table
        const createTransactionsTable = `
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        type VARCHAR(20) NOT NULL,  -- 'earned' or 'redeemed'
        amount INTEGER NOT NULL,
        description TEXT NOT NULL,
        date TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `;

        // Execute the table creation queries
        await client.query(createUsersTable);
        await client.query(createReportsTable);
        await client.query(createRewardsTable);
        await client.query(createCollectedWastesTable);
        await client.query(createNotificationsTable);
        await client.query(createTransactionsTable);

        console.log("Tables created successfully!");
    } catch (error) {
        console.error("Error creating tables:", error);
    } finally {
        await client.end();
    }
}

createTables();
