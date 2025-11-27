import { Controller, Get, Head } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello() {
    return this.appService.getHello();
  }

  @Head()
  healthCheck() {
    return; // HEAD requests don't need a response body
  }
}
