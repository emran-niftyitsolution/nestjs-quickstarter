import { Field, InputType, PickType } from '@nestjs/graphql';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsNotWhitespace } from '../../common/decorators/is-not-whitespace.decorator';
import { User } from '../../user/user.schema';

@InputType()
export class RegisterInput extends PickType(
  User,
  ['firstName', 'lastName', 'username'] as const,
  InputType,
) {
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
    description: 'User password (minimum 6 characters)',
    example: 'SecurePass123!',
    minLength: 6,
    format: 'password',
  })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @Field({ nullable: true })
  @ApiPropertyOptional({
    description: 'User first name',
    example: 'John',
    minLength: 2,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  @IsNotWhitespace({
    message: 'First name must not be empty or contain only whitespace',
  })
  firstName?: string;

  @Field({ nullable: true })
  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Doe',
    minLength: 2,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Last name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  @IsNotWhitespace({
    message: 'Last name must not be empty or contain only whitespace',
  })
  lastName?: string;

  @Field({ nullable: true })
  @ApiPropertyOptional({
    description: 'Unique username (letters, numbers, and underscores only)',
    example: 'john_doe',
    minLength: 3,
    maxLength: 30,
    pattern: '^[a-zA-Z0-9_]+$',
  })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(30, { message: 'Username must not exceed 30 characters' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only contain letters, numbers, and underscores',
  })
  username?: string;
}
