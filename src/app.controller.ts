import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  Query,
  Version,
} from '@nestjs/common';

import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
// import { InjectRedis } from '@nestjs-modules/ioredis';
// import Redis from 'ioredis';

@Controller()
export class AppController {
  constructor(@Inject(CACHE_MANAGER) private cacheManger: Cache) {}

  @Get()
  @Version('2')
  async getHellov2(@Query('token') token): Promise<any> {
    // const res = await this.prismaService1.user.findMany();
    // return res;
    // const res = await this.redis.get('token');
    // await this.redis.set('token', token || 'default token', 'EX', 60 * 10);
    const res = await this.cacheManger.get('token');
    await this.cacheManger.set('token', token || 'default token');
    return {
      token: res,
    };
  }

  @Post(':id')
  @Version('1')
  async postHello(
    @Query('page') page: string,
    @Param('id') id: string,
    @Body() body: any,
    @Headers('x-tenant-id') tenantId: string,
  ): Promise<any> {
    console.log('🚀 ~ AppController ~ postHello ~ page:', page);
    return {
      page,
      id,
      body,
      tenantId,
    };
  }
}
