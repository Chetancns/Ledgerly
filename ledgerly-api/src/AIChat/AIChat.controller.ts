import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiService } from './AIChat.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { GetUser } from '../common/decorators/user.decorator'

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('/parse-transaction')
  async parseTransaction(
    @GetUser() user: { userId: string },
    @Body() body: { text: string;},
  ) {
    console.log(user,body.text);
    return this.aiService.parseTransactions(user.userId, body.text);
  }
}
