import { Module } from '@nestjs/common';
import * as Joi from 'joi';
import { ConfigModule as Config } from '@nestjs/config';

const schema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production')
    .default('development'),
  // PORT: Joi.number().default(3000),
  // DB_HOST: Joi.string().ip(),
});

const envFilePath = [`.env.${process.env.NODE_ENV || `development`}`, '.env'];

@Module({
  imports: [
    Config.forRoot({
      isGlobal: true,
      envFilePath,
      validationSchema: schema,
    }),
  ],
})
export class ConfigModule {}
