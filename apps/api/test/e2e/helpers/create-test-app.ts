import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ModuleMetadata } from '@nestjs/common/interfaces';
import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';

export type TestAppContext = {
  app: INestApplication;
  mongoMemoryServer: MongoMemoryServer;
};

export async function createTestApp(options: {
  imports: NonNullable<ModuleMetadata['imports']>;
  configureTestingModule?: (builder: TestingModuleBuilder) => void;
  configureApp?: (app: INestApplication) => void;
}): Promise<TestAppContext> {
  const mongoMemoryServer = await MongoMemoryServer.create();
  const mongoUri = mongoMemoryServer.getUri();

  const moduleBuilder = Test.createTestingModule({
    imports: [MongooseModule.forRoot(mongoUri), ...options.imports],
  });

  options.configureTestingModule?.(moduleBuilder);

  const moduleRef = await moduleBuilder.compile();
  const app = moduleRef.createNestApplication();

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  options.configureApp?.(app);

  await app.init();

  return {
    app,
    mongoMemoryServer,
  };
}
