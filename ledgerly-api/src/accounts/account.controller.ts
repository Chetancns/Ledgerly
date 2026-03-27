import { Controller, Get, Post, Body, Param, Put, Delete ,UseGuards} from '@nestjs/common';
import { AccountService } from './account.service';
import { Account } from './account.entity';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { GetUser } from '../common/decorators/user.decorator';
import { CreateAccountDto } from './dto/CreateAccountDto'
@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get()
  findAll(@GetUser() user: { userId: string }): Promise<Account[] | null> {
    return this.accountService.findAllByUser(user.userId);
  }
  @Get('/accountusers')
  findAllbyuser(@GetUser() user: { userId: string, email: string, name: string }): Promise<Account[] | null>{
    //console.log('[GET /accountuser] user:', user);
    return this.accountService.findAllByUser(user.userId);
  }

  @Get(':id')
  findOne(@GetUser() user: { userId: string }, @Param('id') id: string): Promise<Account | null> {
    return this.accountService.findOne(user.userId, id);
  }
  
  @Post()
  create(@GetUser() user: { userId: string, email: string, name: string },@Body() account: CreateAccountDto): Promise<Account> {
    return this.accountService.create(user.userId,account);
  }

  @Put(':id')
  update(@GetUser() user: { userId: string }, @Param('id') id: string, @Body() account: Partial<Account>): Promise<Account|null> {
    return this.accountService.update(user.userId, id, account);
  }

  @Delete(':id')
  remove(@GetUser() user: { userId: string }, @Param('id') id: string): Promise<void> {
    return this.accountService.remove(user.userId, id);
  }
  
}
