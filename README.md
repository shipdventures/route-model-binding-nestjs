# @neoma/route-model-binding

Laravel-inspired route model binding for NestJS applications. Automatically resolve database entities from route parameters with zero boilerplate.

## Why Route Model Binding?

If you've used Laravel, you know how elegant route model binding makes your controllers. Instead of manually fetching entities in every controller method, they're automatically resolved from route parameters.

This library brings that same developer experience to NestJS:

**Before (without this library):**

```typescript
@Get('/users/:userId/posts/:postId')
async getPost(
  @Param('userId') userId: string,
  @Param('postId') postId: string,
) {
  const user = await this.userRepository.findOne({ where: { id: userId } })
  if (!user) throw new NotFoundException('User not found')

  const post = await this.postRepository.findOne({ where: { id: postId } })
  if (!post) throw new NotFoundException('Post not found')

  return { user, post }
}
```

**After (with @neoma/route-model-binding):**

```typescript
@Get('/users/:user/posts/:post')
getPost(
  @RouteModel('user') user: User,
  @RouteModel('post') post: Post,
) {
  return { user, post }  // Entities are automatically resolved!
}
```

## Installation

```bash
npm install @neoma/route-model-binding
```

### Peer Dependencies

This library requires the following peer dependencies:

- `@nestjs/common` (^11.x)
- `@nestjs/core` (^11.x)
- `@nestjs/typeorm` (^11.x)
- `typeorm` (^0.3.27)

## Quick Start

### 1. Import the RouteModelBindingModule

```typescript
import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { 
  RouteModelBindingModule, 
  RouteModelBindingMiddleware 
} from "@neoma/route-model-binding"

@Module({
  imports: [
    TypeOrmModule.forRoot({
      // your TypeORM configuration
    }),
    RouteModelBindingModule.forRoot(), // Add this line
  ],
  controllers: [AppController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RouteModelBindingMiddleware).forRoutes(
      "users/:user",
      "users/:user/posts/:post",
      // Add other routes with model parameters here
    )
  }
}
```

### 2. Name your route parameters to match your entity names

The middleware automatically maps route parameters to TypeORM entities. The parameter name must match your entity name (case-sensitive).

```typescript
// If you have a User entity and a Post entity
@Get('/users/:user/posts/:post')  // :user will fetch User entity, :post will fetch Post entity
```

### 3. Use the @RouteModel decorator in your controllers

```typescript
import { Controller, Get } from "@nestjs/common"
import { RouteModel } from "@neoma/route-model-binding"
import { User } from "./entities/user.entity"
import { Post } from "./entities/post.entity"

@Controller()
export class AppController {
  @Get("/users/:user")
  getUser(@RouteModel("user") user: User) {
    return user // User is automatically fetched from database
  }

  @Get("/users/:user/posts/:post")
  getPost(@RouteModel("user") user: User, @RouteModel("post") post: Post) {
    return { user, post } // Both entities are automatically resolved
  }
}
```

## How It Works

1. **Route Parameter Naming**: When you define a route like `/users/:user`, the `:user` parameter tells the middleware to look for a `User` entity.

2. **Automatic Resolution**: The middleware intercepts incoming requests, extracts the parameter values (usually UUIDs or IDs), and queries the database using TypeORM.

3. **Entity Injection**: Found entities are attached to the request object and made available via the `@RouteModel` decorator.

4. **Automatic 404**: If an entity isn't found, the middleware automatically throws a `NotFoundException` with a descriptive message.

## API Reference

### RouteModelBindingModule

The module that provides route model binding functionality.

```typescript
RouteModelBindingModule.forRoot(config?: RouteModelBindingConfig)
```

**Parameters:**
- `config` (optional) - Configuration object for customizing resolution behavior

**Example:**
```typescript
import { RouteModelBindingModule } from "@neoma/route-model-binding"

@Module({
  imports: [
    RouteModelBindingModule.forRoot({
      defaultResolver: ({ id }) => ({ id, deletedAt: null }),
    }),
  ],
})
export class AppModule {}
```

### RouteModelBindingMiddleware

The middleware that handles the automatic resolution of entities. You must specify the routes that contain model parameters.

```typescript
import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common"
import { RouteModelBindingMiddleware } from "@neoma/route-model-binding"

export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RouteModelBindingMiddleware).forRoutes(
      "users/:user",
      "users/:user/posts/:post",
      "articles/:article",
      // List all routes that have model parameters
    )
  }
}
```

### @RouteModel Decorator

Extracts the resolved entity from the request.

```typescript
@RouteModel(parameterName: string): ParameterDecorator
```

**Parameters:**

- `parameterName` - The name of the route parameter (without the colon)

**Example:**

```typescript
@Get('/articles/:article')
getArticle(@RouteModel('article') article: Article) {
  return article
}
```

## Advanced Usage

### Custom Resolvers

You can customize how entities are resolved by providing a default resolver function. This is useful for implementing features like soft delete filtering, multi-tenancy, or custom query logic.

```typescript
import { RouteModelBindingModule } from "@neoma/route-model-binding"

@Module({
  imports: [
    RouteModelBindingModule.forRoot({
      // Custom default resolver for all entities
      defaultResolver: ({ id }) => ({
        id,
        deletedAt: null, // Only find non-soft-deleted entities
      }),
    }),
  ],
})
export class AppModule implements NestModule {
  // ... middleware configuration
}
```

#### Resolver Function

The resolver function receives a context object and returns a TypeORM where clause:

```typescript
type ResolverFunction = (context: ResolverContext) => FindOptionsWhere<any> | Promise<FindOptionsWhere<any>>

interface ResolverContext {
  id: string                    // The route parameter value
  req: Request                  // Express request object  
  routeModels: Record<string, any>  // Previously resolved models
  paramName: string             // The parameter name (e.g., 'user')
}
```

#### Common Use Cases

**Soft Delete Support:**
```typescript
RouteModelBindingModule.forRoot({
  defaultResolver: ({ id }) => ({
    id,
    deletedAt: null, // Exclude soft-deleted entities
  }),
})
```

**Multi-tenancy:**
```typescript
RouteModelBindingModule.forRoot({
  defaultResolver: ({ id, req }) => ({
    id,
    tenantId: req.user?.tenantId, // Scope to current tenant
  }),
})
```

**Complex Authorization:**
```typescript
RouteModelBindingModule.forRoot({
  defaultResolver: async ({ id, req, routeModels }) => {
    return {
      id,
      [Op.or]: [
        { ownerId: req.user?.id },
        { public: true },
        { teamId: routeModels.team?.id }, // Access to previously resolved models
      ],
    }
  },
})
```

### Error Handling

When an entity is not found, the middleware throws a NestJS `NotFoundException` with a message like:

```
Could not find User with id 123e4567-e89b-12d3-a456-426614174000
```

You can catch and customize these errors using NestJS exception filters if needed.

## TypeORM Entity Requirements

Your entities must be registered with TypeORM and the entity name must match the route parameter name:

```typescript
@Entity()
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  name: string

  // ... other fields
}
```

Route parameter `:user` will map to the `User` entity class.

## Comparison with Laravel

If you're coming from Laravel, here's how this library compares:

| Laravel                                  | @neoma/route-model-binding           |
| ---------------------------------------- | ------------------------------------ |
| `Route::get('/users/{user}', ...)`       | `@Get('/users/:user')`               |
| Automatic injection via type-hinting     | Use `@RouteModel('user')` decorator  |
| Customizable via `resolveRouteBinding()` | Custom resolvers via `forRoot()`     |
| Soft-deleted model handling              | ✅ Via custom resolvers              |
| Custom binding keys                      | ✅ Via custom resolvers              |
| Multi-tenancy support                    | ✅ Via custom resolvers              |

## Contributing

Contributions are welcome! This library aims to bring a small part of Laravel's developer experience to the NestJS ecosystem.

### Development Setup

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build the library
npm run build

# Lint the code
npm run lint
```

## Roadmap

- [x] Support for custom binding queries (via default resolver)
- [x] Soft-delete support (via custom resolvers)
- [x] Custom resolution logic (via default resolver)
- [ ] Per-parameter resolvers (entity-specific resolution)
- [ ] Support for custom binding keys (e.g., resolve by slug instead of id)
- [ ] Route model binding for non-TypeORM ORMs
- [ ] Nested relationship loading
- [ ] Optional bindings (don't throw 404)
- [ ] Custom error handling per resolver

## License

MIT

## Credits

Inspired by [Laravel's Route Model Binding](https://laravel.com/docs/routing#route-model-binding) - bringing the elegance of Laravel to the NestJS ecosystem.

## Support

If you find this library helpful, please consider giving it a star on GitHub!

Found a bug or have a feature request? [Open an issue](https://github.com/shipdventures/neoma-route-model-binding/issues)
