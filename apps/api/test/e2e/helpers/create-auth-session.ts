import { INestApplication } from '@nestjs/common';
import request from 'supertest';

export async function createAuthSession(input: {
  app: INestApplication;
  email: string;
  name?: string;
  password?: string;
}): Promise<{ token: string }> {
  const name = input.name ?? 'Rodrigo Paiva';
  const password = input.password ?? 'StrongPassword123';

  await request(input.app.getHttpServer())
    .post('/auth/register')
    .send({
      name,
      email: input.email,
      password,
    })
    .expect(201);

  const loginResponse = await request(input.app.getHttpServer())
    .post('/auth/login')
    .send({
      email: input.email,
      password,
    })
    .expect(200);

  return {
    token: loginResponse.body.accessToken as string,
  };
}
