import {
  DynamicModule,
  Global,
  Module,
  OnApplicationShutdown,
  Provider,
  Type,
} from '@nestjs/common';
import {
  PrismaModuleAsyncOptions,
  PrismaModuleOptions,
  PrismaOptionsFactory,
} from './prisma-options.interface';
// import { PrismaClient } from '@prisma/client';
import { PrismaClient as MySQLClient } from 'prisma-mysql';
import { PrismaClient as PgClient } from 'prisma-postgresql';
import { getDBType, handleRetry } from './prisma.utils';
import {
  PRISMA_CONNECTION_NAME,
  PRISMA_CONNECTIONS,
  PRISMA_MODULE_OPTIONS,
} from './prisma.constants';
import { catchError, defer, lastValueFrom } from 'rxjs';

@Module({})
@Global()
export class PrismaCoreModule implements OnApplicationShutdown {
  private static connections: Record<string, any> = {};
  onApplicationShutdown() {
    // throw new Error('Method not implemented.');
    if (
      PrismaCoreModule.connections &&
      Object.keys(PrismaCoreModule.connections).length > 0
    ) {
      for (const key of Object.keys(PrismaCoreModule.connections)) {
        const connection = PrismaCoreModule.connections[key];
        if (connection && typeof connection.$disconnect == 'function') {
          connection.$disconnect();
        }
      }
    }
  }

  static forRoot(_options: PrismaModuleOptions) {
    const {
      url,
      options = {},
      name,
      retryAttempts = 10,
      retryDelay = 3000,
      connectionFactory,
      connectionErrorFactory,
    } = _options;
    let newOptions = {
      datasourceUrl: url,
    };
    if (!Object.keys(options).length) {
      newOptions = { ...newOptions, ...options };
    }

    const dbType = getDBType(url);
    let _prismaClient;
    if (dbType === 'mysql') {
      _prismaClient = MySQLClient;
    } else if (dbType === 'postgresql') {
      _prismaClient = PgClient;
    } else {
      throw new Error(`Unsupported database type: ${dbType}`);
    }

    const providerName = name || PRISMA_CONNECTION_NAME;
    const prismaConnectionErrorFactory =
      connectionErrorFactory || ((err) => err);
    const prismaConnectionFactory =
      connectionFactory ||
      (async (clientOptions) => await new _prismaClient(clientOptions));

    const prismaClientProvider: Provider = {
      provide: providerName,
      useFactory: async () => {
        // 加入错误重试
        if (this.connections[url]) {
          return this.connections[url];
        }
        const client = await prismaConnectionFactory(newOptions, _prismaClient);
        this.connections[url] = client;
        return lastValueFrom(
          defer(() => client.$connect()).pipe(
            handleRetry(retryAttempts, retryDelay),
            catchError((err) => {
              throw prismaConnectionErrorFactory(err);
            }),
          ),
        ).then(() => client);
      },
    };
    const connectionsProvider = {
      provide: PRISMA_CONNECTIONS,
      useValue: this.connections,
    };

    return {
      module: PrismaCoreModule,
      providers: [prismaClientProvider, connectionsProvider],
      exports: [prismaClientProvider, connectionsProvider],
    };
  }

  static forRootAsync(_options: PrismaModuleAsyncOptions): DynamicModule {
    const providerName = _options.name || PRISMA_CONNECTION_NAME;

    const prismaClientProvider: Provider = {
      provide: providerName,
      useFactory: (prismaModuleOptions: PrismaModuleOptions) => {
        if (!prismaModuleOptions) return;
        const {
          url,
          options = {},
          retryAttempts = 10,
          retryDelay = 3000,
          connectionFactory,
          connectionErrorFactory,
        } = prismaModuleOptions;
        let newOptions = {
          datasourceUrl: url,
        };
        if (!Object.keys(options).length) {
          newOptions = { ...newOptions, ...options };
        }

        const dbType = getDBType(url);
        let _prismaClient;
        if (dbType === 'mysql') {
          _prismaClient = MySQLClient;
        } else if (dbType === 'postgresql') {
          _prismaClient = PgClient;
        } else {
          throw new Error(`Unsupported database type: ${dbType}`);
        }

        const prismaConnectionErrorFactory =
          connectionErrorFactory || ((err) => err);
        const prismaConnectionFactory =
          connectionFactory ||
          (async (clientOptions) => await new _prismaClient(clientOptions));
        return lastValueFrom(
          defer(async () => {
            const url = newOptions.datasourceUrl;
            if (this.connections[url]) {
              return this.connections[url];
            }
            const client = await prismaConnectionFactory(
              newOptions,
              _prismaClient,
            );
            this.connections[url] = client;
            return client;
          }).pipe(
            handleRetry(retryAttempts, retryDelay),
            catchError((err) => {
              throw prismaConnectionErrorFactory(err);
            }),
          ),
        );
      },
      inject: [PRISMA_MODULE_OPTIONS],
    };
    const asyncProviders = this.createAsyncProviders(_options);
    const connectionsProvider = {
      provide: PRISMA_CONNECTIONS,
      useValue: this.connections,
    };

    return {
      module: PrismaCoreModule,
      providers: [...asyncProviders, prismaClientProvider, connectionsProvider],
      exports: [prismaClientProvider, connectionsProvider],
    };
  }

  private static createAsyncProviders(options: PrismaModuleAsyncOptions) {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }
    const useClass = options.useClass as Type<PrismaOptionsFactory>;

    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: useClass,
        useClass,
      },
    ];
  }

  // 创建PRISMA_MODULE_OPTIONS的Provide，来源
  private static createAsyncOptionsProvider(
    options: PrismaModuleAsyncOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: PRISMA_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }

    const inject = [
      (options.useClass || options.useExisting) as Type<PrismaOptionsFactory>,
    ];

    return {
      provide: PRISMA_MODULE_OPTIONS,
      inject,
      useFactory: async (optionsFactory: PrismaOptionsFactory) =>
        optionsFactory.createPrismaModuleOptions(),
    };
  }
}
