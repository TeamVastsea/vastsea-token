import { JwtModule } from '@app/jwt';
import { PrismaModule, PrismaService } from '@app/prisma';
import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { PermissionModule } from './permission/permission.module';
import { ClusterModule, RedisModule } from '@liaoliaots/nestjs-redis';
import { ConfigModule, ConfigService, tomlLoader } from '@app/config';
import { join } from 'path';
import { GlobalCounterModule, GlobalCounterService } from '@app/global-counter';
import { APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { RoleModule } from './role/role.module';
import { RedisCacheModule } from '@app/redis-cache';
import { AuthModule } from './auth/auth.module';
import { readFileSync } from 'fs';
import { SuperSerializerInterceptor } from './super_serializer/super_serializer.interceptor';
import { ClientModule } from './client/client.module';
import { AuthGuard, PermissionGuard } from '../libs/guard';
import { AccountModule } from './account/account.module';
import { PermissionService } from './permission/permission.service';
import { RoleService } from './role/role.service';
import { AccountService } from './account/account.service';
import { randomBytes } from 'crypto';
import { Permission } from '@prisma/client';
import { AutoRedis } from '@app/decorator';
import Redis, { Cluster } from 'ioredis';
import { ID_COUNTER } from '@app/constant';
import { ZodValidationPipe } from 'nestjs-zod';
import { RequireClientPairGuard } from '../libs/guard/require-client-pair';

const permissions = [
  'CLIENT::GET::LIST',
  'CLIENT::GET::INFO',
  'CLIENT::CREATE',
  'CLIENT::REMOVE',
  'CLIENT::UPDATE',
  'ROLE::CREATE',
  'ROLE::REMOVE',
  'ROLE::UPDATE',
  'ROLE::GET::INFO',
  'ROLE::GET::LIST',
];

@Module({
  imports: [
    PrismaModule,
    JwtModule.forRoot({
      global: true,
      priKey: readFileSync(join(__dirname, 'keys/pri.pkcs8')).toString(),
      pubKey: readFileSync(join(__dirname, 'keys/pub.pem')).toString(),
      keyPairType: 'RS256',
    }),
    PermissionModule,
    ConfigModule.forRoot({
      loader: tomlLoader(
        join(
          __dirname,
          process.env.CI ? '../config.test.toml' : '../config.toml',
        ),
      ),
      global: true,
    }),
    process.env.REDIS_CLUSTER
      ? ClusterModule.forRootAsync(
          {
            inject: [ConfigService],
            useFactory(config: ConfigService) {
              return {
                config: config.get('redis.cluster'),
              };
            },
          },
          true,
        )
      : RedisModule.forRootAsync(
          {
            inject: [ConfigService],
            useFactory(config: ConfigService) {
              return {
                config: config.get('redis.standalone'),
              };
            },
          },
          true,
        ),
    GlobalCounterModule.forRoot({ global: true }),
    RedisCacheModule.forRoot({ global: true }),
    RoleModule,
    AuthModule,
    AccountModule,
    ClientModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SuperSerializerInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RequireClientPairGuard,
    },
  ],
})
export class AppModule implements OnModuleInit {
  private appName: string = process.env.APP_NAME ?? 'Vastsea Token';
  private logger: Logger = new Logger(this.appName);
  constructor(
    private permission: PermissionService,
    private role: RoleService,
    private account: AccountService,
    private prisma: PrismaService,
    private cnt: GlobalCounterService,
    @AutoRedis() private redis: Redis | Cluster,
  ) {}
  async onModuleInit() {
    const installed = await this.redis.get(`APP::LOCK`);
    if (installed) {
      this.logger.log(
        `${this.appName} look like initialization has been completed`,
      );
      this.logger.log(
        `If you want re install, please remove 'SITE::LOCK' in redis and drop database`,
      );
      return;
    }
    const password = __TEST__
      ? 'admin'
      : (process.env.ADMIN_PWD ??
        randomBytes(128).toString('base64').slice(0, 16));
    const email = process.env.ADMIN_EMAIL ?? 'admin@no-reply.com';
    const dbAdmin = await this.prisma.account.findFirst({
      where: {
        email,
      },
    });
    let permission = await this.prisma.permission.findFirst({
      where: {
        name: '*',
      },
    });
    try {
      if (!permission) {
        permission = await this.cretePermission('*', 'Super Permission');
      }
    } catch (err) {
      this.logger.error(err.message, err.stack);
      this.logger.error(`Create Super permission Fail.`);
      process.exit(-1);
    }
    const role = await this.createRole('Admin', [permission])
      .then((role) => role)
      .catch((err) => {
        this.logger.error(err.message, err.stack);
        this.logger.error(`Create Admin Role Fail.`);
        process.exit(-1);
      });
    if (!dbAdmin) {
      const admin = await this.account.createAccount({
        email,
        password,
        profile: {
          nick: 'Admin',
        },
      });
      await this.prisma.account.update({
        where: { id: admin.id },
        data: {
          role: {
            connect: {
              id: role.id,
            },
          },
        },
      });
      this.logger.log(`Create Admin Success`);
    }

    for (const p of permissions) {
      const res = await this.cretePermission(p, p);
      this.logger.log(`Create Permission ${res.name} Success`);
    }
    await this.initClient();
    await this.redis.set(`APP::LOCK`, new Date().toLocaleDateString());
    this.logger.log(`${this.appName} init success`);
    this.logger.log(`Welcome use ${this.appName}`);
    this.logger.log(`Admin Email: ${email}`);
    this.logger.log(`Admin Password: ${password}`);
  }
  cretePermission(name: string, desc: string) {
    return this.permission.createPermission({
      name,
      desc: desc ?? '',
      clientId: process.env.CLIENT_ID,
    });
  }
  createRole(name: string, permission: Permission[]) {
    return this.role.createRole({
      name,
      desc: 'admin',
      clientId: process.env.CLIENT_ID,
      permissions: permission.map((permission) => permission.id),
    });
  }
  async initClient() {
    const client = await this.prisma.client.findFirst({
      where: {
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
      },
    });
    if (client) {
      return client;
    }
    await this.prisma.client.create({
      data: {
        redirect: process.env.REDIRECT,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        id: await this.cnt.incr(ID_COUNTER.CLIENT),
        name: 'AuthServer',
      },
    });
  }
}
