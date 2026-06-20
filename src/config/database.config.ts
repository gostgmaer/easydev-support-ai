import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgrespassword',
  database: process.env.DB_NAME || 'easydev_support_ai',
  autoLoadEntities: true,
  synchronize: process.env.NODE_ENV !== 'production', // Use migrations in production
}));
