import { Body, Controller, Delete, Get, Param, Post ,Put,Req,UseGuards} from '@nestjs/common';
import { GetUser } from '../common/decorators/user.decorator'
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RecurringService } from './recurring.service';

@UseGuards(JwtAuthGuard)
@Controller('recurring')
export class RecurringController {
  constructor(private readonly recurringService: RecurringService) {}

   @Get()
  async getAll(@GetUser() user: { userId: string}) {
    return this.recurringService.findAll(user.userId);
  }

  @Get(':id')
  async getOne(@Param('id') id: string, @GetUser() user: { userId: string}) {
    return this.recurringService.findOne(id, user.userId);
  }

  @Post()
  async create(@GetUser() user: { userId: string}, @Body() body) {
    //console.log('Creating recurring transaction for user:', user.userId, 'with data:', body);
    return this.recurringService.create({ ...body, userId: user.userId,createdAt: new Date() });
  }

  @Put(':id')
  async update(@Param('id') id: string, @GetUser() user: { userId: string}, @Body() body) {
    return this.recurringService.update(id, user.userId, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @GetUser() user: { userId: string}) {
    return this.recurringService.delete(id, user.userId);
  }
}