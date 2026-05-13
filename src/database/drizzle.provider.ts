import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { DRIZZLE_DB_PROVIDER } from './database.constants';

export const drizzleProvider = {
  provide: DRIZZLE_DB_PROVIDER,
  useFactory: (configService: ConfigService) => {
    const pool = new Pool({
      host: configService.get<string>('DB_HOST'),
      port: configService.get<number>('DB_PORT'),
      user: configService.get<string>('DB_USER'),
      password: configService.get<string>('DB_PASSWORD'),
      database: configService.get<string>('DB_NAME'),
    });

    return drizzle(pool);
  },
  inject: [ConfigService],
};
