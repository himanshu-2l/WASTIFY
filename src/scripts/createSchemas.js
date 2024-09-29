import { createSchemas } from '../utils/signSchemas';

const run = async () => {
  const schemaIds = await createSchemas();
  console.log('Schema IDs:', schemaIds);
};

run().catch(console.error);