# Code Refactoring Plan: Splitting Large Components

## 🎯 Goal: Follow SOLID Principles & Component Modularity

**Current Issues:**

- Large files with multiple responsibilities
- Mixed concerns in single classes
- Difficult to test and maintain
- Poor separation of concerns

**Solution:**
Split large components into smaller, focused modules following SOLID principles.

---

## 📊 Current Large Files Analysis

### 🔴 **Critical Refactoring Needed**

| File                 | Lines | Issues                                     | Refactoring Priority |
| -------------------- | ----- | ------------------------------------------ | -------------------- |
| `user.service.ts`    | 384   | Multiple responsibilities, mixed concerns  | 🚨 **HIGH**          |
| `auth.service.ts`    | 284   | Authentication + OAuth + tokens + password | 🚨 **HIGH**          |
| `auth.controller.ts` | 267   | Too many endpoints, verbose Swagger docs   | ⚠️ **MEDIUM**        |
| `user.schema.ts`     | 262   | Large schema with many decorators          | ⚠️ **MEDIUM**        |

---

## 🔧 Refactoring Strategy

### **1. UserService Decomposition (384 → ~80 lines each)**

#### **Current Issues:**

```typescript
@Injectable()
export class UserService {
  // ❌ Too many responsibilities:
  // - CRUD operations
  // - Caching logic
  // - Password management
  // - Query building
  // - OAuth provider lookup
  // - Cache invalidation
}
```

#### **✅ Solution: Split into 5 focused services**

```typescript
// 1. User CRUD Service (~80 lines)
@Injectable()
export class UserCrudService implements IUserCrudService {
  // Only basic CRUD operations
  async create(input: CreateUserInput): Promise<User>;
  async findOne(id: string): Promise<User | null>;
  async update(id: string, input: UpdateUserInput): Promise<User>;
  async remove(id: string): Promise<boolean>;
}

// 2. User Query Service (~80 lines)
@Injectable()
export class UserQueryService implements IUserQueryService {
  // Only query operations
  async findAll(pagination: PaginationInput): Promise<PaginatedUsersResponse>;
  async findByEmail(email: string): Promise<User | null>;
  async findByUsername(username: string): Promise<User | null>;
  async findByProvider(
    provider: AuthProvider,
    providerId: string,
  ): Promise<User | null>;
}

// 3. User Cache Service (~80 lines)
@Injectable()
export class UserCacheService implements IUserCacheService {
  // Only caching logic
  async getCachedUser(id: string): Promise<User | null>;
  async setCachedUser(user: User): Promise<void>;
  async invalidateUserCache(id: string): Promise<void>;
  async invalidateListCaches(): Promise<void>;
}

// 4. User Password Service (~80 lines)
@Injectable()
export class UserPasswordService implements IUserPasswordService {
  // Only password operations
  async verifyPassword(plain: string, hashed: string): Promise<boolean>;
  async updatePassword(userId: string, newPassword: string): Promise<boolean>;
  async setPasswordResetToken(userId: string, token: string): Promise<void>;
  async clearPasswordResetToken(userId: string): Promise<void>;
}

// 5. User Orchestrator Service (~80 lines)
@Injectable()
export class UserService implements IUserService {
  constructor(
    private readonly crudService: IUserCrudService,
    private readonly queryService: IUserQueryService,
    private readonly cacheService: IUserCacheService,
    private readonly passwordService: IUserPasswordService,
  ) {}

  // Orchestrates other services
  async create(input: CreateUserInput): Promise<User> {
    const user = await this.crudService.create(input);
    await this.cacheService.setCachedUser(user);
    return user;
  }
}
```

### **2. AuthService Decomposition (284 → ~70 lines each)**

#### **Current Issues:**

```typescript
@Injectable()
export class AuthService {
  // ❌ Too many responsibilities:
  // - User registration/login
  // - OAuth handling (Google, GitHub)
  // - JWT token generation/validation
  // - Password management
}
```

#### **✅ Solution: Split into 4 focused services**

```typescript
// 1. Authentication Core Service (~70 lines)
@Injectable()
export class AuthCoreService implements IAuthCoreService {
  // Only login/register logic
  async register(input: RegisterInput): Promise<AuthResponse>
  async login(input: LoginInput): Promise<AuthResponse>
  async validateUser(userId: string): Promise<User | null>
  async getProfile(userId: string): Promise<User>
}

// 2. OAuth Service (~70 lines)
@Injectable()
export class OAuthService implements IOAuthService {
  // Only OAuth operations
  async googleLogin(profile: any): Promise<AuthResponse>
  async githubLogin(profile: any): Promise<AuthResponse>
  async handleOAuthCallback(provider: AuthProvider, profile: any): Promise<AuthResponse>
}

// 3. Token Service (~70 lines)
@Injectable()
export class TokenService implements ITokenService {
  // Only JWT operations
  async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }>
  async refreshToken(refreshToken: string): Promise<AuthResponse>
  async validateToken(token: string): Promise<JwtPayload | null>
}

// 4. Auth Password Service (~70 lines)
@Injectable()
export class AuthPasswordService implements IAuthPasswordService {
  // Only auth-related password operations
  async changePassword(userId: string, current: string, new: string): Promise<boolean>
  async forgotPassword(email: string): Promise<boolean>
  async resetPassword(token: string, newPassword: string): Promise<boolean>
}
```

### **3. AuthController Decomposition (267 → ~90 lines each)**

#### **Current Issues:**

```typescript
@Controller('auth')
export class AuthController {
  // ❌ Too many endpoints:
  // - Basic auth (register, login, refresh)
  // - Profile management
  // - OAuth endpoints (Google, GitHub)
  // - Password management
}
```

#### **✅ Solution: Split into 3 focused controllers**

```typescript
// 1. Auth Basic Controller (~90 lines)
@ApiTags('Authentication - Core')
@Controller('auth')
export class AuthController {
  // Only basic auth operations
  @Post('register') async register()
  @Post('login') async login()
  @Post('refresh') async refresh()
  @Get('me') async getProfile()
}

// 2. OAuth Controller (~90 lines)
@ApiTags('Authentication - OAuth')
@Controller('auth')
export class OAuthController {
  // Only OAuth operations
  @Get('google') async googleAuth()
  @Get('google/callback') async googleCallback()
  @Get('github') async githubAuth()
  @Get('github/callback') async githubCallback()
}

// 3. Password Controller (~90 lines)
@ApiTags('Authentication - Password')
@Controller('auth')
export class PasswordController {
  // Only password operations
  @Post('change-password') async changePassword()
  @Post('forgot-password') async forgotPassword()
  @Post('reset-password') async resetPassword()
}
```

### **4. User Schema Decomposition (262 → ~80 lines each)**

#### **Current Issues:**

```typescript
export class User {
  // ❌ Too many fields and decorators:
  // - Basic user info
  // - Authentication data
  // - OAuth provider data
  // - Audit fields
}
```

#### **✅ Solution: Split using composition**

```typescript
// 1. Base User Schema (~80 lines)
export class BaseUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  avatar?: string;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 2. Auth User Extension (~80 lines)
export class AuthUser extends BaseUser {
  password?: string;
  role?: UserRole;
  isEmailVerified?: boolean;
  emailVerificationToken?: string;
  lastLogin?: Date;
}

// 3. OAuth User Extension (~80 lines)
export class OAuthUser extends AuthUser {
  provider?: AuthProvider;
  providerId?: string;
}

// 4. Password Reset Extension (~80 lines)
export class User extends OAuthUser {
  passwordResetToken?: string;
  passwordResetExpires?: Date;
}
```

---

## 🏗️ Implementation Plan

### **Phase 1: Extract Interfaces (1 day)**

```typescript
// Create focused interfaces
export interface IUserCrudService { ... }
export interface IUserQueryService { ... }
export interface IUserCacheService { ... }
export interface IUserPasswordService { ... }

export interface IAuthCoreService { ... }
export interface IOAuthService { ... }
export interface ITokenService { ... }
export interface IAuthPasswordService { ... }
```

### **Phase 2: Create Service Components (2 days)**

```bash
# User service decomposition
src/user/services/
├── user-crud.service.ts
├── user-query.service.ts
├── user-cache.service.ts
├── user-password.service.ts
└── user.service.ts (orchestrator)

# Auth service decomposition
src/auth/services/
├── auth-core.service.ts
├── oauth.service.ts
├── token.service.ts
├── auth-password.service.ts
└── auth.service.ts (orchestrator)
```

### **Phase 3: Split Controllers (1 day)**

```bash
# Auth controller decomposition
src/auth/controllers/
├── auth.controller.ts
├── oauth.controller.ts
└── password.controller.ts
```

### **Phase 4: Update Module Dependencies (1 day)**

```typescript
@Module({
  providers: [
    // User services
    UserCrudService,
    UserQueryService,
    UserCacheService,
    UserPasswordService,
    UserService, // orchestrator

    // Auth services
    AuthCoreService,
    OAuthService,
    TokenService,
    AuthPasswordService,
    AuthService, // orchestrator
  ],
})
export class AuthModule {}
```

### **Phase 5: Update Tests (2 days)**

```bash
# Split test files accordingly
src/user/services/*.spec.ts
src/auth/services/*.spec.ts
src/auth/controllers/*.spec.ts
```

---

## 📈 Benefits After Refactoring

### **SOLID Compliance**

#### **✅ Single Responsibility**

- Each service has one clear purpose
- Easy to understand and maintain
- Changes affect only one responsibility

#### **✅ Open/Closed**

- Services can be extended without modification
- New features add new services, don't modify existing

#### **✅ Liskov Substitution**

- All services implement focused interfaces
- Easy to substitute implementations

#### **✅ Interface Segregation**

- Focused interfaces for specific needs
- No forced dependencies on unused methods

#### **✅ Dependency Inversion**

- Services depend on abstractions (interfaces)
- Easy to mock and test

### **Testing Benefits**

```typescript
// Before: Hard to test 384-line UserService
describe('UserService', () => {
  // ❌ 50+ test cases in one file
  // ❌ Complex setup with many mocks
  // ❌ Tests are slow and brittle
});

// After: Easy to test focused services
describe('UserCrudService', () => {
  // ✅ 8-10 focused test cases
  // ✅ Simple setup with minimal mocks
  // ✅ Fast, reliable tests
});

describe('UserCacheService', () => {
  // ✅ 6-8 caching-specific tests
  // ✅ Easy to mock cache dependencies
});
```

### **Development Benefits**

- **Parallel Development**: Multiple developers can work on different services
- **Easier Debugging**: Smaller code units are easier to debug
- **Better Performance**: Lazy loading of unused services
- **Cleaner Git History**: Changes are more focused and easier to review

### **Maintenance Benefits**

- **Easier Refactoring**: Changes are isolated to specific services
- **Better Documentation**: Each service has clear purpose
- **Reduced Complexity**: Cognitive load is reduced
- **Future-Proof**: Easy to add new features without breaking existing code

---

## 🎯 File Size Targets After Refactoring

| Component Type   | Target Size  | Current   | After        |
| ---------------- | ------------ | --------- | ------------ |
| Service Files    | 60-80 lines  | 384 lines | 5 × 80 lines |
| Controller Files | 80-100 lines | 267 lines | 3 × 90 lines |
| Schema Files     | 80-120 lines | 262 lines | 4 × 80 lines |
| Interface Files  | 20-40 lines  | Mixed     | 8 × 30 lines |

---

## 🚀 Implementation Commands

```bash
# Step 1: Create service directories
mkdir -p src/user/services src/auth/services src/auth/controllers

# Step 2: Create interface files
touch src/user/interfaces/user-services.interface.ts
touch src/auth/interfaces/auth-services.interface.ts

# Step 3: Generate service files
touch src/user/services/{user-crud,user-query,user-cache,user-password}.service.ts
touch src/auth/services/{auth-core,oauth,token,auth-password}.service.ts

# Step 4: Generate controller files
touch src/auth/controllers/{oauth,password}.controller.ts

# Step 5: Update existing files
# Refactor existing user.service.ts and auth.service.ts to orchestrators
```

---

## ✅ Success Metrics

- **File Size**: No file > 150 lines
- **Test Coverage**: Maintain 85%+ coverage
- **Build Time**: No increase in build time
- **Performance**: No degradation in API response times
- **Code Quality**: Improved SonarQube scores
- **Developer Experience**: Faster development cycles

This refactoring plan transforms a monolithic codebase into a modular, maintainable architecture following SOLID principles and component-based design.
