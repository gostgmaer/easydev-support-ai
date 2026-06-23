import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || process.env.DB_PORT || '5432', 10),
  username: process.env.POSTGRES_USER || process.env.DB_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD || 'postgrespassword',
  database: process.env.POSTGRES_DB || process.env.DB_NAME || 'easydev_support_ai',
  autoLoadEntities: true,
  synchronize: process.env.NODE_ENV !== 'production', // Use migrations in production
}));
