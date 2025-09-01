/* eslint-disable prettier/prettier */
import 'dotenv/config';
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { Secret,SignOptions } from 'jsonwebtoken';

import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(@InjectRepository(User) private users: Repository<User>) {}

  async register(dto: RegisterDto) {
    const existing = await this.users.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.users.create({ email: dto.email, name: dto.name, passwordHash });
    await this.users.save(user);
    return this.sign(user);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return this.sign(user);
  }

  private sign(user: User) {
  const payload = { sub: user.id, email: user.email };
  const secret: Secret = process.env.JWT_SECRET;
  const expiresIn = (process.env.JWT_EXPIRES || '7d') as SignOptions['expiresIn'];

  const token = jwt.sign(payload, secret, { expiresIn });
  return {
    accessToken: token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  };
}

}
