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
import { Client } from '@prisma/client';
import request from 'supertest';
import { LoginDto } from 'src/auth/dto/login.dto';
import { getCode, getToken } from './utils/login';
import { TokenPayload } from 'src/auth/dto/token-pair.dto';
import { OAUTH_CODE_ID_PAIR } from '@app/constant';

describe('Auth E2E test', () => {
  let app: INestApplication;
  let redis: Redis;
  let clientService: ClientService;
  const clients: Client[] = [];
  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();

    redis = app.get(getRedisToken(DEFAULT_REDIS_NAMESPACE));
    clientService = app.get(ClientService);
    await clear('sqlite');
    await redis.flushdb();
    await app.init();
    expect(redis).toBeDefined();
    await createUser(app, redis, 'test@no-reply.com', 'test');
    const client = await createClient(
      {
        name: 'test',
        redirect: 'http://redirect.test.org',
      },
      clientService,
    );
    clients.unshift(client);
  });

  describe('Login', () => {
    it('should redirect to client redirect', async () => {
      const { statusCode, header } = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@no-reply.com',
          password: 'test',
        } as LoginDto)
        .query({
          clientId: clients[0].clientId,
        });
      expect(statusCode).toBe(HttpStatus.FOUND);
      const to = header.location;
      expect(to).toBeDefined();
      const url = new URL(to);
      expect(url.origin).toBe(clients[0].redirect);
      expect(url.searchParams.get('ok')).toBe('true');
      expect(url.searchParams.get('code')).toBeDefined();
    });
    it('should redirect to redirect query, because client not found', async () => {
      const { statusCode, header } = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@no-reply.com',
          password: 'test',
        } as LoginDto)
        .query({
          clientId: 'not exists',
          redirect: 'http://example.org/',
        });
      expect(statusCode).toBe(HttpStatus.FOUND);
      const url = new URL(header.location);
      expect(url.href).toMatch('http://example.org/');
      expect(url.searchParams.get('ok')).toBe('false');
    });
    it('should redirect to common error redirect, because client not found and `redirect` query is undefined', async () => {
      const { statusCode, header } = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@no-reply.com',
          password: 'test',
        } as LoginDto)
        .query({
          clientId: 'not exists',
        });
      expect(statusCode).toBe(HttpStatus.FOUND);
      const url = new URL(header.location);
      expect(url.href).toMatch(process.env.COMMON_ERROR_REDIRECT);
      expect(url.searchParams.get('ok')).toBe('false');
    });
  });
  describe('GetToken', () => {
    it('should return tokenPair', async () => {
      const { code } = await getCode(
        {
          email: 'test@no-reply.com',
          password: 'test',
        },
        clients[0].clientId,
        app,
      );
      const { body, statusCode } = await request(app.getHttpServer())
        .get('/auth/token')
        .query({
          code,
          clientId: clients[0].clientId,
          clientSecret: clients[0].clientSecret,
        });
      expect(statusCode).toBe(HttpStatus.OK);
      const tokenPair = body as TokenPayload;
      expect(tokenPair.access_token).toBeDefined();
      expect(tokenPair.refresh_token).toBeDefined();
      expect(tokenPair.expire).toBeDefined();
      expect(tokenPair.expireAt).toBeDefined();
    });
    it('should throw unauthorized error, becuase code expire', async () => {
      const { code } = await getCode(
        { email: 'test@no-reply.com', password: 'test' },
        clients[0].clientId,
        app,
      );
      const key = OAUTH_CODE_ID_PAIR(code);
      await redis.del(key);
      const { statusCode } = await request(app.getHttpServer())
        .get('/auth/token')
        .query({
          code,
          clientId: clients[0].clientId,
          clientSecret: clients[0].clientSecret,
        });
      expect(statusCode).toBe(HttpStatus.BAD_REQUEST);
    });
    it('should return bad request, because client id invalid', async () => {
      const { code } = await getCode(
        { email: 'test@no-reply.com', password: 'test' },
        clients[0].clientId,
        app,
      );
      const key = OAUTH_CODE_ID_PAIR(code);
      await redis.del(key);
      const { statusCode } = await request(app.getHttpServer())
        .get('/auth/token')
        .query({
          code,
          clientId: 'clientId',
          clientSecret: clients[0].clientSecret,
        });
      expect(statusCode).toBe(HttpStatus.BAD_REQUEST);
    });
    it('should return bad request, because clientSecret invalid', async () => {
      const { code } = await getCode(
        { email: 'test@no-reply.com', password: 'test' },
        clients[0].clientId,
        app,
      );
      const key = OAUTH_CODE_ID_PAIR(code);
      await redis.del(key);
      const { statusCode } = await request(app.getHttpServer())
        .get('/auth/token')
        .query({
          code,
          clientId: clients[0].clientId,
          clientSecret: 'client secret',
        });
      expect(statusCode).toBe(HttpStatus.BAD_REQUEST);
    });
  });
  /**
   * Ignore now
   */
  describe('Get MailCode', () => {
    it.todo('Success');
    it.todo('Too Many Request');
  });
  describe('Refresh Token', () => {
    it('Invalid Refresh Token', async () => {
      const { statusCode } = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: 'refresh_token',
        })
        .query({
          clientId: clients[0].clientId,
          clientSecret: clients[0].clientSecret,
        });
      expect(statusCode).toBe(HttpStatus.BAD_REQUEST);
    });
    it('Refresh Token Expire', async () => {
      const { code } = await getCode(
        { email: 'test@no-reply.com', password: 'test' },
        clients[0].clientId,
        app,
      );
      expect(code).toBeDefined();
      const { refresh_token } = await getToken(
        code,
        clients[0].clientId,
        clients[0].clientSecret,
        app,
      );
      await redis.del(await redis.keys(`TOKEN::*::refresh`));
      const { body, statusCode } = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: refresh_token,
        })
        .query({
          clientId: clients[0].clientId,
          clientSecret: clients[0].clientSecret,
        });
      expect(statusCode).toBe(HttpStatus.BAD_REQUEST);
    });
    it('Client secret invalid', async () => {
      const { code } = await getCode(
        { email: 'test@no-reply.com', password: 'test' },
        clients[0].clientId,
        app,
      );
      expect(code).toBeDefined();
      const { refresh_token } = await getToken(
        code,
        clients[0].clientId,
        clients[0].clientSecret,
        app,
      );
      const { statusCode } = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: refresh_token,
        })
        .query({
          clientId: clients[0].clientId,
          clientSecret: 'clients[0].clientSecret',
        });
      expect(statusCode).toBe(HttpStatus.BAD_REQUEST);
    });
    it('Success', async () => {
      const { code } = await getCode(
        { email: 'test@no-reply.com', password: 'test' },
        clients[0].clientId,
        app,
      );
      expect(code).toBeDefined();
      const { access_token, refresh_token } = await getToken(
        code,
        clients[0].clientId,
        clients[0].clientSecret,
        app,
      );
      const { body, statusCode } = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: refresh_token,
        })
        .query({
          clientId: clients[0].clientId,
          clientSecret: clients[0].clientSecret,
        });
      expect(statusCode).toBe(HttpStatus.CREATED);
      expect(body.access_token).not.toBe(access_token);
    });
  });
});
