import { Field, ID, InputType, PartialType, PickType } from '@nestjs/graphql';
import { User } from '../user.schema';

@InputType()
export class UpdateUserInput extends PartialType(
  PickType(
    User,
    [
      'firstName',
      'lastName',
      'username',
      'role',
      'provider',
      'providerId',
      'avatar',
      'isActive',
      'isEmailVerified',
    ] as const,
    InputType,
  ),
) {
  @Field(() => ID)
  id: string;
}
