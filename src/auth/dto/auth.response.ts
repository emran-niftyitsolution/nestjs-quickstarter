import { Field, ObjectType } from '@nestjs/graphql';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../user/user.schema';

@ObjectType()
export class AuthResponse {
  @Field(() => User)
  @ApiProperty({
    description: 'Authenticated user information',
    type: () => User,
  })
  user: User;

  @Field()
  @ApiProperty({
    description: 'JWT access token for API authentication',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NGY1YjJjM2QxZTVmN2c4aDlpMGoxazIiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlIjoiVVNFUiIsImlhdCI6MTYzMTIzNDU2NywiZXhwIjoxNjMxMjM4MTY3fQ.signature',
    format: 'jwt',
  })
  accessToken: string;

  @Field()
  @ApiProperty({
    description: 'JWT refresh token for token renewal',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NGY1YjJjM2QxZTVmN2c4aDlpMGoxazIiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTYzMTIzNDU2NywiZXhwIjoxNjMxODM5MzY3fQ.signature',
    format: 'jwt',
  })
  refreshToken: string;
}

@ObjectType()
export class LogoutResponse {
  @Field()
  @ApiProperty({
    description: 'Indicates if logout was successful',
    example: true,
  })
  success: boolean;

  @Field()
  @ApiProperty({
    description: 'Logout result message',
    example: 'Successfully logged out',
  })
  message: string;
}
