import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AllExceptionFilter } from './common/filters/all-exception.filter';
import { VERSION_NEUTRAL, VersioningType } from '@nestjs/common';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configServcie = app.get(ConfigService);
  const port = configServcie.get<number>('PORT', 3000);
  const cors = configServcie.get('CORS', false);
  const prefix = configServcie.get('PREFIX', '/api');

  const versionStr = configServcie.get<string>('VERSION');
  let version = [versionStr];
  if (versionStr && versionStr.indexOf(',')) {
    version = versionStr.split(',');
  }
  const errorFilterFlag = configServcie.get<string>('ERROR_FILTER');

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  app.setGlobalPrefix(prefix);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion:
      typeof versionStr === 'undefined' ? VERSION_NEUTRAL : version,
  });

  if (cors === 'true') {
    app.enableCors();
  }

  if (errorFilterFlag === 'true') {
    const httpAdapter = app.get(HttpAdapterHost);
    app.useGlobalFilters(new AllExceptionFilter(httpAdapter));
  }

  app.enableShutdownHooks();

  await app.listen(port);
}
bootstrap();
