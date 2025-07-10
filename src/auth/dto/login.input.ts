import { Field, InputType, PickType } from '@nestjs/graphql';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { User } from '../../user/user.schema';

@InputType()
export class LoginInput extends PickType(User, ['email'] as const, InputType) {
  @Field()
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @Field()
  @ApiProperty({
    description: 'User password',
    example: 'SecurePass123!',
    minLength: 6,
    format: 'password',
  })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;
}
