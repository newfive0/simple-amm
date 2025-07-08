import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __dirname = dirname(fileURLToPath(import.meta.url));

async function globalSetup() {
  // Load environment variables from artifacts/.env.local
  dotenv.config({ path: resolve(__dirname, 'artifacts/.env.local') });
}

export default globalSetup;
