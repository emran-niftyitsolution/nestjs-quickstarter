import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommonModule } from '../common/common.module';
import {
  UserCacheService,
  UserCrudService,
  UserPasswordService,
  UserQueryService,
} from './services';
import { UserResolver } from './user.resolver';
import { User, UserSchema } from './user.schema';
import { UserService } from './user.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    CommonModule,
  ],
  providers: [
    // SOLID-based decomposed services
    UserCrudService,
    UserQueryService,
    UserCacheService,
    UserPasswordService,

    // Orchestrator service
    UserService,

    // GraphQL resolver
    UserResolver,
  ],
  exports: [
    UserService,
    UserCrudService,
    UserQueryService,
    UserCacheService,
    UserPasswordService,
  ],
})
export class UserModule {}
