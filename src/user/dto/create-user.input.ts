import { Field, InputType, OmitType } from '@nestjs/graphql';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { User } from '../user.schema';

@InputType()
export class CreateUserInput extends OmitType(
  User,
  [
    '_id',
    'createdAt',
    'updatedAt',
    'emailVerificationToken',
    'passwordResetToken',
    'passwordResetExpires',
    'lastLogin',
    'isActive',
  ] as const,
  InputType,
) {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password?: string;
}
