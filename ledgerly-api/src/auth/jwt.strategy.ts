/* eslint-disable prettier/prettier */
import 'dotenv/config';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    

  constructor() {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
    } 
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwtSecret,
      ignoreExpiration: false,
    });
  }
   validate(payload: { sub: string; email: string ,name: string}) {
    return { userId: payload.sub, email: payload.email, name: payload.name };
  }
}
