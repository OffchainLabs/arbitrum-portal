import dotenv from 'dotenv';

// Load environment variables for tests
dotenv.config({ quiet: true });

// Set GITHUB_TOKEN to "test" if it's not already set
const githubToken = process.env.GITHUB_TOKEN || 'test';
process.env.GITHUB_TOKEN = githubToken;
