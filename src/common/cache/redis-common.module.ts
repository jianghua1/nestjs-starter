import { Module } from '@nestjs/common';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const type = configService.get<string>('REDIS_TYPE', 'single');
        if (type === 'cluster') {
          // 集群模式配置
          const hosts = configService
            .get<string>('REDIS_CLUSTER_HOST', '127.0.0.1')
            .split(',');
          const ports = configService
            .get<string>('REDIS_CLUSTER_PORT', '6379')
            .split(',')
            .map((port) => parseInt(port, 10));

          const nodes = hosts.map((host, index) => ({
            host,
            port: ports[index] || 6379, // 使用对应的端口或默认端口6379
          }));

          return {
            type: 'cluster',
            nodes,
            options: {
              redisOptions: {
                password: configService.get<string>(
                  'REDIS_PASSWORD',
                  'example',
                ),
              },
            },
          };
        } else {
          // 单机模式配置
          return {
            type: 'single',
            url: `redis://${configService.get<string>('REDIS_HOST', 'localhost')}:${configService.get<number>('REDIS_PORT', 6379)}`,
            options: {
              password: configService.get<string>('REDIS_PASSWORD', 'example'),
            },
          };
        }
      },
    }),
  ],
})
export class RedisCommonModule {}
