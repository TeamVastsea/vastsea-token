import {
  DEFAULT_REDIS_NAMESPACE,
  getRedisToken,
} from '@liaoliaots/nestjs-redis';
import { createUser } from './utils/create-user';
import { clear } from './utils/setup';
import { AppModule } from '../src/app.module';
import { HttpStatus, INestApplication } from '@nestjs/common';
import Redis from 'ioredis';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { CreateClient } from '../src/client/dto/create-client';
import { login } from './utils/login';
import { createClient } from './utils/create-client';
import { ClientService } from '../src/client/client.service';
import { UpdateClient } from 'src/client/dto/update-client';

describe('Client E2E test', () => {
  let app: INestApplication;
  let redis: Redis;
  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    redis = app.get(getRedisToken(DEFAULT_REDIS_NAMESPACE));
    await clear('sqlite');
    await redis.flushdb();
    await app.init();
    expect(redis).toBeDefined();
    await createUser(app, redis, 'test@no-reply.com', 'test');
  }, 60 * 1000);
  describe('Create Client', () => {
    it('Success', async () => {
      const { access_token } = await login(
        'admin@no-reply.com',
        'admin',
        process.env.CLIENT_ID,
        app,
      );
      const { statusCode } = await request(app.getHttpServer())
        .post('/client/')
        .auth(access_token, { type: 'bearer' })
        .send({
          name: 'Test Client',
          desc: 'Test Client',
          redirect: 'http://exmaple.com',
        } as CreateClient);
      expect(statusCode).toBe(HttpStatus.CREATED);
    });
    it('Fail, Permision deined', async () => {
      const { access_token } = await login(
        'test@no-reply.com',
        'test',
        process.env.CLIENT_ID,
        app,
      );
      const { statusCode } = await request(app.getHttpServer())
        .post('/client/')
        .auth(access_token, { type: 'bearer' })
        .send({
          name: 'Test Client',
          desc: 'Test Client',
          redirect: 'http://exmaple.com',
        } as CreateClient);
      expect(statusCode).toBe(HttpStatus.FORBIDDEN);
    });
  });
  describe('Delete Client', () => {
    it('Success', async () => {
      const client = await createClient(
        { name: 'Test Client', desc: 'Test', redirect: '' },
        app.get(ClientService),
      );
      const { access_token } = await login(
        'admin@no-reply.com',
        'admin',
        process.env.CLIENT_ID,
        app,
      );
      const { statusCode } = await request(app.getHttpServer())
        .delete(`/client/${client.id}`)
        .auth(access_token, { type: 'bearer' });
      expect(statusCode).toBe(HttpStatus.OK);
    });
    it('Client Not found', async () => {
      const { access_token } = await login(
        'admin@no-reply.com',
        'admin',
        process.env.CLIENT_ID,
        app,
      );
      const { body, statusCode } = await request(app.getHttpServer())
        .delete(`/client/123456789`)
        .auth(access_token, { type: 'bearer' });
      expect(statusCode).toBe(HttpStatus.NOT_FOUND);
      expect(body.message).toBeDefined();
      expect(body.message).not.toMatch('/client/abc');
    });
    it('Fail, Permision deined', async () => {
      const client = await createClient(
        { name: 'Test Client', desc: 'Test', redirect: '' },
        app.get(ClientService),
      );
      const { access_token } = await login(
        'test@no-reply.com',
        'test',
        process.env.CLIENT_ID,
        app,
      );
      const { statusCode } = await request(app.getHttpServer())
        .delete(`/client/${client.id}`)
        .auth(access_token, { type: 'bearer' });
      expect(statusCode).toBe(HttpStatus.FORBIDDEN);
    });
  });
  describe('Update Client', () => {
    it('Success', async () => {
      const client = await createClient(
        { name: 'Test Client', desc: 'Test', redirect: '' },
        app.get(ClientService),
      );
      const { access_token } = await login(
        'admin@no-reply.com',
        'admin',
        process.env.CLIENT_ID,
        app,
      );
      const { statusCode } = await request(app.getHttpServer())
        .patch(`/client/${client.id}`)
        .send({
          name: 'Test Client 2',
        } as UpdateClient)
        .auth(access_token, { type: 'bearer' });
      expect(statusCode).toBe(HttpStatus.OK);
      const { body } = await request(app.getHttpServer())
        .get(`/client/${client.id}`)
        .auth(access_token, { type: 'bearer' });
      expect(body.name).toBe('Test Client 2');
    });
    it('Client Not found', async () => {
      const { access_token } = await login(
        'admin@no-reply.com',
        'admin',
        process.env.CLIENT_ID,
        app,
      );
      const { body, status } = await request(app.getHttpServer())
        .get(`/client/123123123`)
        .auth(access_token, { type: 'bearer' });
      console.log(body);
      expect(status).toBe(HttpStatus.NOT_FOUND);
      expect(body.message).not.toContain('/client');
    });
    it('Fail, Permision deined', async () => {
      const client = await createClient(
        { name: 'Test Client', desc: 'Test', redirect: '' },
        app.get(ClientService),
      );
      const { access_token } = await login(
        'test@no-reply.com',
        'test',
        process.env.CLIENT_ID,
        app,
      );
      const { statusCode } = await request(app.getHttpServer())
        .patch(`/client/${client.id}`)
        .send({
          name: 'Test Client 2',
        } as UpdateClient)
        .auth(access_token, { type: 'bearer' });
      expect(statusCode).toBe(HttpStatus.FORBIDDEN);
    });
  });
  describe('Get Client Info', () => {
    it('Success', async () => {
      const client = await createClient(
        { name: 'Test Client', desc: 'Test', redirect: '' },
        app.get(ClientService),
      );
      const { access_token } = await login(
        'admin@no-reply.com',
        'admin',
        process.env.CLIENT_ID,
        app,
      );
      const { statusCode } = await request(app.getHttpServer())
        .get(`/client/${client.id}`)
        .auth(access_token, { type: 'bearer' });
      expect(statusCode).toBe(HttpStatus.OK);
    });
    it('Client Not found', async () => {
      const { access_token } = await login(
        'admin@no-reply.com',
        'admin',
        process.env.CLIENT_ID,
        app,
      );
      const { statusCode } = await request(app.getHttpServer())
        .get(`/client/114514`)
        .auth(access_token, { type: 'bearer' });
      expect(statusCode).toBe(HttpStatus.NOT_FOUND);
    });
    it('Fail, Permision deined', async () => {
      const client = await createClient(
        { name: 'Test Client', desc: 'Test', redirect: '' },
        app.get(ClientService),
      );
      const { access_token } = await login(
        'test@no-reply.com',
        'test',
        process.env.CLIENT_ID,
        app,
      );
      const { statusCode } = await request(app.getHttpServer())
        .get(`/client/${client.id}`)
        .auth(access_token, { type: 'bearer' });
      expect(statusCode).toBe(HttpStatus.FORBIDDEN);
    });
  });
  describe('Get Client List', () => {
    const clientData = Array.from({ length: 100 })
      .fill(0)
      .map((_, idx) => `client-${idx}`);
    it('Success', async () => {
      for (const name of clientData) {
        await createClient(
          {
            name,
            desc: name,
            redirect: '',
          },
          app.get(ClientService),
        );
      }
      const { access_token } = await login(
        'admin@no-reply.com',
        'admin',
        process.env.CLIENT_ID,
        app,
      );
      const { body, statusCode } = await request(app.getHttpServer())
        .get('/client/')
        .auth(access_token, { type: 'bearer' })
        .query({ size: 20 });
      expect(statusCode).toBe(HttpStatus.OK);
      expect(body.data).toHaveLength(20);
      const { body: b2 } = await request(app.getHttpServer())
        .get('/client')
        .auth(access_token, { type: 'bearer' })
        .query({ size: 20, preId: body.data.at(-1).id });
      expect(b2.data[0].id).not.toBe(body.data.at(-1).id);
    });
    it('Fail, Permision deined', async () => {
      for (const name of clientData) {
        await createClient(
          {
            name,
            desc: name,
            redirect: '',
          },
          app.get(ClientService),
        );
      }
      const { access_token } = await login(
        'test@no-reply.com',
        'test',
        process.env.CLIENT_ID,
        app,
      );
      const { statusCode } = await request(app.getHttpServer())
        .get('/client/')
        .auth(access_token, { type: 'bearer' })
        .query({ size: 20 });
      expect(statusCode).toBe(HttpStatus.FORBIDDEN);
    });
  });
});
