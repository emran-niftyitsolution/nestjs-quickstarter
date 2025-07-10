import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { HydratedDocument } from 'mongoose';
import * as mongoosePaginate from 'mongoose-paginate-v2';
import * as mongooseUniqueValidator from 'mongoose-unique-validator';

export type UserDocument = HydratedDocument<User>;

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
}

export enum AuthProvider {
  LOCAL = 'LOCAL',
  GOOGLE = 'GOOGLE',
  GITHUB = 'GITHUB',
}

@ObjectType()
@Schema({
  timestamps: true,
})
export class User {
  @Field(() => ID)
  @ApiProperty({
    description: 'Unique user identifier',
    example: '64f5b2c3d1e5f7g8h9i0j1k2',
    readOnly: true,
  })
  id: string;

  @Field()
  @ApiProperty({
    description: 'User email address (unique)',
    example: 'user@example.com',
    format: 'email',
    uniqueItems: true,
  })
  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @Field({ nullable: true })
  @ApiPropertyOptional({
    description: 'User first name',
    example: 'John',
    minLength: 2,
    maxLength: 50,
  })
  @Prop({
    required: false,
    trim: true,
    minlength: 2,
    maxlength: 50,
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  firstName?: string;

  @Field({ nullable: true })
  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Doe',
    minLength: 2,
    maxLength: 50,
  })
  @Prop({
    required: false,
    trim: true,
    minlength: 2,
    maxlength: 50,
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Last name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  lastName?: string;

  @Field({ nullable: true })
  @ApiPropertyOptional({
    description: 'Unique username (letters, numbers, and underscores only)',
    example: 'john_doe',
    minLength: 3,
    maxLength: 30,
    pattern: '^[a-zA-Z0-9_]+$',
    uniqueItems: true,
  })
  @Prop({
    required: false,
    unique: true,
    sparse: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
  })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(30, { message: 'Username must not exceed 30 characters' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only contain letters, numbers, and underscores',
  })
  username?: string;

  @Prop({
    required: false,
    minlength: 6,
  })
  password?: string;

  @Field(() => String, { nullable: true })
  @ApiPropertyOptional({
    description: 'User role in the system',
    enum: UserRole,
    enumName: 'UserRole',
    example: UserRole.USER,
    default: UserRole.USER,
  })
  @Prop({
    type: String,
    enum: UserRole,
    default: UserRole.USER,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @Field(() => String, { nullable: true })
  @ApiPropertyOptional({
    description: 'Authentication provider used for registration',
    enum: AuthProvider,
    enumName: 'AuthProvider',
    example: AuthProvider.LOCAL,
    default: AuthProvider.LOCAL,
  })
  @Prop({
    type: String,
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  @IsOptional()
  @IsEnum(AuthProvider)
  provider?: AuthProvider;

  @Field({ nullable: true })
  @ApiPropertyOptional({
    description: 'External provider user ID (for OAuth)',
    example: '1234567890',
  })
  @Prop()
  @IsOptional()
  @IsString()
  providerId?: string;

  @Field({ nullable: true })
  @ApiPropertyOptional({
    description: 'User avatar image URL',
    example: 'https://example.com/avatar.jpg',
    format: 'uri',
  })
  @Prop()
  @IsOptional()
  @IsString()
  avatar?: string;

  @Field({ nullable: true })
  @ApiPropertyOptional({
    description: 'Whether user email has been verified',
    example: true,
    default: false,
  })
  @Prop({
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isEmailVerified?: boolean;

  @Field({ nullable: true })
  @ApiPropertyOptional({
    description: 'Whether user account is active',
    example: true,
    default: true,
  })
  @Prop({
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Prop()
  emailVerificationToken?: string;

  @Prop()
  passwordResetToken?: string;

  @Prop()
  passwordResetExpires?: Date;

  @Field({ nullable: true })
  @ApiPropertyOptional({
    description: 'Last login timestamp',
    example: '2024-01-15T10:30:00.000Z',
    format: 'date-time',
  })
  @Prop()
  lastLogin?: Date;

  @Field()
  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
    format: 'date-time',
    readOnly: true,
  })
  createdAt: Date;

  @Field()
  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T10:30:00.000Z',
    format: 'date-time',
    readOnly: true,
  })
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Add plugins
UserSchema.plugin(mongooseUniqueValidator, {
  message: '{PATH} must be unique',
});
UserSchema.plugin(mongoosePaginate);

// Add indexes
// Note: email and username indexes are automatically created by unique: true
// UserSchema.index({ email: 1 }); // ❌ REMOVED - duplicate of unique: true
// UserSchema.index({ username: 1 }); // ❌ REMOVED - duplicate of unique: true
UserSchema.index({ provider: 1, providerId: 1 }); // Composite index for OAuth lookups
UserSchema.index({ createdAt: -1 }); // Performance index for sorting by creation date
