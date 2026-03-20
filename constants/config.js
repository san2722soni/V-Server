import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// figure out which 
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.development";

dotenv.config({ path: path.join(__dirname, `../${envFile}`) });

const config = {
  NODE_ENV: process.env.NODE_ENV || "development",
  DB_URL: process.env.DB_URL,
  PORT: process.env.PORT || 5000,
  BODY_LIMIT: parseInt(process.env.BODY_LIMIT) || 1024 * 1024,
  ES_CA: process.env.ES_CA,
  ES_PASSWORD: process.env.ES_PASSWORD,
  ES_URL: process.env.ES_URL,
  ES_USERNAME: process.env.ES_USERNAME,
  REDIS_URL: process.env.REDIS_URL,
  UNITY_BUILD_SERVER: process.env.UNITY_BUILD_SERVER,
  CLIENT_BUILD_SERVER: process.env.CLIENT_BUILD_SERVER,
  MAIN_SERVER: process.env.MAIN_SERVER,
  AWS_REGION: process.env.AWS_REGION,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  BREVO_API_KEY: process.env.BREVO_API_KEY,
  UNITY_SERVER_IP: process.env.UNITY_SERVER_IP,
  UNITY_BUILD_SERVER_INSTANCE_ID: process.env.UNITY_BUILD_SERVER_INSTANCE_ID,
  CLOUDFRONT_URL: process.env.CLOUDFRONT_URL,
  SERVER_SECRET:process.env.SERVER_SECRET
};

export default config;
