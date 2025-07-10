import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

@InputType()
export class PaginationInput {
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @Field({ nullable: true })
  @IsOptional()
  sortBy?: string;

  @Field({ nullable: true })
  @IsOptional()
  sortOrder?: string;

  @Field({ nullable: true })
  @IsOptional()
  search?: string;
}

@ObjectType()
export class PaginationInfo {
  @Field(() => Int)
  totalDocs: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  totalPages: number;

  @Field(() => Boolean)
  hasPrevPage: boolean;

  @Field(() => Boolean)
  hasNextPage: boolean;

  @Field(() => Int, { nullable: true })
  prevPage?: number;

  @Field(() => Int, { nullable: true })
  nextPage?: number;
}
