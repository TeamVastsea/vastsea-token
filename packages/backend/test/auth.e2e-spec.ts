import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { clear } from './utils/setup';
import Redis from 'ioredis';
import {
  DEFAULT_REDIS_NAMESPACE,
  getRedisToken,
} from '@liaoliaots/nestjs-redis';
import { createUser } from './utils/create-user';
import { ClientService } from '../src/client/client.service';
import { createClient } from './utils/create-client';
import { Client, PrismaClient } from '@prisma/client';
import request from 'supertest';
import { GlobalCounterService } from '@app/global-counter';
import { CLIENT_DEFAULT_ROLE, ID_COUNTER } from '@app/constant';
import { LoginDto } from 'src/auth/dto/login.dto';
import cookieParser from 'cookie-parser';

describe('Auth E2E test', () => {
  let app: INestApplication;
  let redis: Redis;
  let clientService: ClientService;
  let prisma: PrismaClient;
  let cnt: GlobalCounterService;
  const clients: Client[] = [];
  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    redis = app.get(getRedisToken(DEFAULT_REDIS_NAMESPACE));
    clientService = app.get(ClientService);
    cnt = app.get(GlobalCounterService);
    await clear('sqlite');
    await redis.flushdb();
    await app.init();
    expect(redis).toBeDefined();
    const account = await createUser(app, redis, 'test@no-reply.com', 'test');
    const roleId = await cnt.incr(ID_COUNTER.ROLE);
    const permissionId = await cnt.incr(ID_COUNTER.PERMISSION);
    const clientPk = await cnt.incr(ID_COUNTER.CLIENT);
    prisma = new PrismaClient();
    const client = await prisma.client.create({
      data: {
        id: clientPk,
        name: 'test',
        redirect: 'http://example.org',
        clientId: 'test',
        clientSecret: 'test',
        role: {
          create: {
            id: roleId,
            name: 'test.role',
            desc: '',
            clientId: 'test',
            permission: {
              create: {
                id: permissionId,
                name: 'test-client.default.permission',
                desc: '',
                clientId: 'test',
                client: {
                  connect: {
                    id: clientPk,
                  },
                },
              },
            },
          },
        },
      },
    });
    clients.unshift(client);
    const authClient = await prisma.client.findFirst({
      where: {
        clientId: process.env.CLIENT_ID,
      },
    });
    const permission = await prisma.permission.findFirst({
      where: {
        name: 'AUTH-SERVER::LOGIN',
      },
    });
    const testRoleId = await redis.incr(ID_COUNTER.ROLE);
    const role = await prisma.role.create({
      data: {
        id: testRoleId,
        name: 'TestRole',
        desc: '',
        clientId: process.env.CLIENT_ID,
        client: {
          connect: {
            id: authClient.id,
          },
        },
        permission: {
          connect: {
            id: permission.id,
          },
        },
      },
    });
    await prisma.account.update({
      where: {
        id: account.id,
      },
      data: {
        role: {
          connect: {
            id: role.id,
          },
        },
      },
    });
    await redis.set(CLIENT_DEFAULT_ROLE('test'), roleId.toString());
  });
  describe('GetCode', () => {
    it('Success', async () => {
      const { status, header } = await request(app.getHttpServer())
        .post('/auth/code')
        .query({
          clientId: clients[0].clientId,
          state: 'abc',
          type: 'code',
        })
        .send({
          email: 'admin@no-reply.com',
          password: 'admin',
        } as LoginDto);
      const url = new URL(header.location);
      expect(url.searchParams.get('ok')).toBe('true');
      expect(url.searchParams.get('state')).toBe('abc');
      expect(header['set-cookie'][0]).toContain('session-state');
      expect(url.origin).toBe(clients[0].redirect);
      expect(status).toBe(HttpStatus.FOUND);
    });
    it('Ignore login data if has session-state', async () => {
      const { headers } = await request(app.getHttpServer())
        .post('/auth/code')
        .query({
          clientId: clients[0].clientId,
          state: 'abc',
          type: 'code',
        })
        .send({
          email: 'admin@no-reply.com',
          password: 'admin',
        } as LoginDto);
      const { statusCode } = await request(app.getHttpServer())
        .post('/auth/session')
        .query({
          clientId: clients[0].clientId,
        })
        .set('Cookie', headers['set-cookie']);
      expect(statusCode).toBe(HttpStatus.CREATED);
    });
    it('If login other client, can ignore login data when login other valid client', async () => {
      const { headers } = await request(app.getHttpServer())
        .post('/auth/code')
        .query({
          clientId: clients[0].clientId,
          state: 'abc',
          type: 'code',
        })
        .send({
          email: 'admin@no-reply.com',
          password: 'admin',
        } as LoginDto);
      const { statusCode } = await request(app.getHttpServer())
        .post('/auth/session')
        .query({
          clientId: process.env.CLIENT_ID,
        })
        .set('Cookie', headers['set-cookie']);
      expect(statusCode).toBe(HttpStatus.CREATED);
    });
    it('Fail, Client not found', async () => {
      const { status, header } = await request(app.getHttpServer())
        .post('/auth/code')
        .query({
          clientId: 'not-found',
          state: 'abc',
          type: 'code',
        })
        .send({
          email: 'admin@no-reply.com',
          password: 'admin',
        } as LoginDto);
      const url = new URL(header.location);
      expect(url.searchParams.get('ok')).toBe('false');
      expect(url.searchParams.get('reason')).toBe('客户端不存在');
      expect(status).toBe(HttpStatus.FOUND);
    });
  });
  describe('GetToken', () => {
    it('Success', async () => {
      const { header } = await request(app.getHttpServer())
        .post('/auth/code')
        .query({
          clientId: clients[0].clientId,
          state: 'abc',
          type: 'code',
        })
        .send({
          email: 'admin@no-reply.com',
          password: 'admin',
        } as LoginDto);
      const url = new URL(header.location);
      const code = url.searchParams.get('code');
      const { statusCode } = await request(app.getHttpServer())
        .post('/auth/token')
        .query({ code });
      expect(statusCode).toBe(HttpStatus.CREATED);
    });
    it('Fail, code not exist', async () => {
      const { statusCode } = await request(app.getHttpServer())
        .post('/auth/token')
        .query({ code: 'wrong code' });
      expect(statusCode).toBe(HttpStatus.BAD_REQUEST);
    });
  });

  describe('Dashboard Login', () => {
    it('Success, Because is admin', async () => {
      const { status } = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@no-reply.com',
          password: 'admin',
        } as LoginDto);
      expect(status).toBe(HttpStatus.CREATED);
    });
    it('Success, Because has AUTH-SERVER::LOGIN permission', async () => {
      const { status } = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@no-reply.com',
          password: 'test',
        });
      expect(status).toBe(HttpStatus.CREATED);
    });
  });
});
