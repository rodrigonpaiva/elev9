import 'reflect-metadata';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { disconnect } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

import { AuthModule } from '../../src/modules/auth/auth.module';
import { UsersModule } from '../../src/modules/users/users.module';

describe('Users Create Profile E2E', () => {
  let app: INestApplication;
  let mongoMemoryServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoMemoryServer = await MongoMemoryServer.create();
    const mongoUri = mongoMemoryServer.getUri();

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(mongoUri), AuthModule, UsersModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await disconnect();
    await mongoMemoryServer.stop();
  });

  it('register + login + create profile success', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Rodrigo Paiva',
        email: 'profile-success@email.com',
        password: 'StrongPassword123',
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'profile-success@email.com',
        password: 'StrongPassword123',
      })
      .expect(200);

    const response = await request(app.getHttpServer())
      .post('/users/profile')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .send({
        name: '  Rodrigo Paiva  ',
        birthDate: '1994-06-15',
        gender: 'male',
      })
      .expect(201);

    expect(response.body).toEqual({
      userProfile: {
        id: expect.any(String),
        authUserId: expect.any(String),
        name: 'Rodrigo Paiva',
        birthDate: '1994-06-15T00:00:00.000Z',
        gender: 'male',
        language: 'en-US',
        timezone: 'UTC',
        status: 'active',
        createdAt: expect.any(String),
      },
    });
  });

  it('creating profile twice returns 409', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Rodrigo Paiva',
        email: 'profile-duplicate@email.com',
        password: 'StrongPassword123',
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'profile-duplicate@email.com',
        password: 'StrongPassword123',
      })
      .expect(200);

    const token = loginResponse.body.accessToken;

    await request(app.getHttpServer())
      .post('/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Rodrigo Paiva',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Rodrigo Paiva',
      })
      .expect(409);

    expect(response.body).toEqual({
      code: 'USER_PROFILE_ALREADY_EXISTS',
      message: 'User profile already exists.',
    });
  });

  it('without token returns 401', async () => {
    const response = await request(app.getHttpServer())
      .post('/users/profile')
      .send({
        name: 'Rodrigo Paiva',
      })
      .expect(401);

    expect(response.body).toEqual({
      code: 'AUTH_INVALID_SESSION',
      message: 'Invalid session.',
    });
  });
});
