import { Controller, Get, Post, Body,Put ,Delete, Param, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './user.entity';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { GetUser } from '../common/decorators/user.decorator'
import { UpdateUserDto } from './dto/UpdateUserDto';
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  findAll(): Promise<User[]> {
    return this.userService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<User |null > {
    return this.userService.findOne(id);
    }
    
    @Get(':email')
    findbyEmail(@Param('email') email: string): Promise<User | null>{
        return this.userService.findByEmail(email);
        }

  @Post()
  create(@Body() user: User): Promise<User> {
    return this.userService.create(user);
  }

  @Put('')
  update(@GetUser() user: { userId: string, email: string, name: string }, @Body() updateUser: UpdateUserDto): Promise<User | null> {
    return this.userService.update(user.userId, updateUser);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.userService.remove(id);
  }
}
