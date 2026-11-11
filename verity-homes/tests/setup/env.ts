// Point DB-backed unit tests at the Neon "test" branch. .env.local (dev data) is never loaded here.
import { existsSync } from "node:fs";
import { config } from "dotenv";

if (existsSync(".env.test")) config({ path: ".env.test", override: true, quiet: true });
