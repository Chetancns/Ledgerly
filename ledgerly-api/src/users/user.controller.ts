import { Controller, Put, Body, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './user.entity';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { GetUser } from '../common/decorators/user.decorator'
import { UpdateUserDto } from './dto/UpdateUserDto';
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Put('')
  update(@GetUser() user: { userId: string, email: string, name: string }, @Body() updateUser: UpdateUserDto): Promise<User | null> {
    return this.userService.update(user.userId, updateUser);
  }
}
