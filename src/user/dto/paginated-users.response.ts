import { Field, ObjectType } from '@nestjs/graphql';
import { PaginationInfo } from '../../common/dto/pagination.dto';
import { User } from '../user.schema';

@ObjectType()
export class PaginatedUsersResponse {
  @Field(() => [User])
  docs: User[];

  @Field(() => PaginationInfo)
  pagination: PaginationInfo;
}
