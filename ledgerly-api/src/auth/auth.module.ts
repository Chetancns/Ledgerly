import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { User } from '../users/user.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import * as jwt from 'jsonwebtoken';
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule,

    // Access Token configuration
    JwtModule.register({
      secret: process.env.JWT_SECRET,                // ACCESS TOKEN SECRET
      signOptions: {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN as jwt.SignOptions['expiresIn'] || '15m' // ACCESS TOKEN EXPIRES
      },
    }),

    // Refresh Token configuration
    JwtModule.register({
      secret: process.env.JWT_REFRESH_SECRET,                // REFRESH TOKEN SECRET
      signOptions: {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN as jwt.SignOptions['expiresIn'] || '7d',  // REFRESH TOKEN EXPIRES
      },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [PassportModule, JwtModule],
})
export class AuthModule {}
