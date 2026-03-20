import dotenv from 'dotenv';
dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  mongoUri: string;
  apiGatewayUrl: string;
  userServiceUrl: string;
  storeServiceUrl: string;
  corsOrigin: string;
  logLevel: string;
  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtExpiresIn: string;
  jwtRefreshExpiresIn: string;
  serviceName: string;
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3005', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/wolt-catalog-service',
  apiGatewayUrl: process.env.API_GATEWAY_URL || 'http://localhost:3000',
  userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  storeServiceUrl: process.env.STORE_SERVICE_URL || 'http://localhost:3004',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  logLevel: process.env.LOG_LEVEL || 'info',
  jwtSecret: process.env.JWT_SECRET || 'local-dev-jwt-secret-key',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'local-dev-refresh-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  serviceName: 'catalog-service',
};
