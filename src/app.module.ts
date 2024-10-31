import { Module } from '@nestjs/common';
import { AppController } from './app.controller';

import { ConfigModule } from './common/config/config.module';
import { LogsModule } from './common/logger/logs.module';

import { CacheCommonModule } from './common/cache/cache-common.module';

import { DatabaseModule } from './database/database.module';
import { UserModule } from './user/user.module';
import { MailModule } from './common/mail/mail.module';
import * as dotenv from 'dotenv';
import { toBoolean } from './utils/format';

const conditionalImports = () => {
  const imports = [];

  const envFilePaths = [
    `.env.${process.env.NODE_ENV || `development`}`,
    '.env',
  ];
  const parsedConfig = dotenv.config({ path: '.env' }).parsed;
  envFilePaths.forEach((path) => {
    if (path === '.env') return;
    const config = dotenv.config({ path });
    Object.assign(parsedConfig, config.parsed);
  });
  if (toBoolean(parsedConfig['MAIL_ON'])) {
    imports.push(MailModule);
  }

  return imports;
};

@Module({
  imports: [
    ConfigModule,
    LogsModule,
    CacheCommonModule,
    DatabaseModule,
    UserModule,
    ...conditionalImports(),
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
