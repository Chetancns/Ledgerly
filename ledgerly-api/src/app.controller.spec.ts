import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return api metadata', () => {
      expect(appController.getHello()).toEqual(
        expect.objectContaining({
          name: 'Ledgerly API',
          version: '1.0.0',
          status: 'running',
          endpoints: expect.objectContaining({
            transactions: '/transactions',
            reports: '/reports',
          }),
        }),
      );
    });
  });
});
