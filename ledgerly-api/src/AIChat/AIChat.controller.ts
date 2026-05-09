import { BadRequestException, Body, Controller, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiService, ParsedTransactionDraft } from './AIChat.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { GetUser } from '../common/decorators/user.decorator';

type UploadedMulterFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
};

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('/parse-transaction')
  async parseTransaction(
    @GetUser() user: { userId: string },
    @Body() body: { text: string; preview?: boolean },
    @Query('preview') preview?: string,
  ) {
    const previewMode = preview === 'true' || body.preview === true;
    return this.aiService.parseTransactions(user.userId, body.text, 'text', { save: !previewMode });
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  async image(
    @UploadedFile() file: unknown,
    @GetUser() user: { userId: string },
    @Query('preview') preview?: string,
  ) {
    const uploaded = file as UploadedMulterFile | undefined;
    if (!uploaded?.buffer) {
      throw new BadRequestException('Image file is required');
    }
    const previewMode = preview === 'true';
    return this.aiService.parseReceiptImage(user.userId, uploaded.buffer, { save: !previewMode });
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('audio')
  @UseInterceptors(FileInterceptor('file'))
  async audio(
    @UploadedFile() file: unknown,
    @GetUser() user: { userId: string },
    @Query('preview') preview?: string,
  ) {
    const uploaded = file as UploadedMulterFile | undefined;
    if (!uploaded?.buffer) {
      throw new BadRequestException('Audio file is required');
    }
    const previewMode = preview === 'true';
    return this.aiService.parseAudio(user.userId, uploaded, { save: !previewMode });
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('save-transactions')
  async saveTransactions(
    @GetUser() user: { userId: string },
    @Body() body: { transactions: ParsedTransactionDraft[] },
  ) {
    return this.aiService.saveParsedTransactions(user.userId, body.transactions || []);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('chat')
  async chat(
    @GetUser() user: { userId: string },
    @Body() body: { question: string },
  ) {
    return this.aiService.askFinancialQuestion(user.userId, body.question);
  }
}
