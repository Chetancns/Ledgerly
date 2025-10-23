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
  findAll(): Promise<Account[]> {
    return this.accountService.findAll();
  }
  @Get('/accountusers')
  findAllbyuser(@GetUser() user: { userId: string, email: string, name: string }): Promise<Account[] | null>{
    //console.log('[GET /accountuser] user:', user);
    return this.accountService.findAllByUser(user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Account | null> {
    //console.log(id);
    return this.accountService.findOne(id);
  }
  
  @Post()
  create(@GetUser() user: { userId: string, email: string, name: string },@Body() account: CreateAccountDto): Promise<Account> {
    return this.accountService.create(user.userId,account);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() account: Partial<Account>): Promise<Account|null> {
    return this.accountService.update(id, account);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.accountService.remove(id);
  }
  
}
