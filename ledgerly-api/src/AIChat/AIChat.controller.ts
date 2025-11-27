import { Controller, Post, Body, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AiService } from './AIChat.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { GetUser } from '../common/decorators/user.decorator'
import { FileInterceptor } from '@nestjs/platform-express';
import type { Multer } from 'multer';
import * as multer from 'multer';

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @Post('/parse-transaction')
  async parseTransaction(
    @GetUser() user: { userId: string },
    @Body() body: { text: string;},
  ) {
    console.log(user,body.text);
    return this.aiService.parseTransactions(user.userId, body.text);}

  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  async image(@UploadedFile() file: Multer.File, @GetUser() user: { userId: string }) {
    return this.aiService.parseReceiptImage(user.userId, file.buffer);
  }

  
@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
@Post('audio')
@UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
async audio(@UploadedFile() file: Multer.File, @GetUser() user: { userId: string }) {
  return this.aiService.parseAudio(user.userId, file); // ✅ pass full file
}


  
}
