import { Inject, NestMiddleware, NotFoundException } from "@nestjs/common"
import { InjectDataSource } from "@nestjs/typeorm"
import { NextFunction, Request, Response } from "express"
import { DataSource } from "typeorm"
import { ROUTE_MODEL_BINDING_CONFIG } from "../constants/injection-tokens"
import {
  ResolverContext,
  RouteModelBindingConfig,
} from "../interfaces/route-model-binding-config.interface"

/**
 * The key under which route models are stored in the request object.
 */
const STORAGE_KEY = "routeModels"

/**
 * Middleware that binds route parameters to model instances by taking
 * the value of the parameter and looking up the corresponding model
 * in the database. If found, the model instance is assigned to
 * req.routeModels under the same key as the route parameter.
 */
export class RouteModelBindingMiddleware implements NestMiddleware {
  /**
   * Creates an instance of RouteModelBindingMiddleware.
   *
   * @param ds The data source to use for database operations.
   * @param config Configuration for route model binding behavior.
   */
  public constructor(
    @InjectDataSource() private readonly ds: DataSource,
    @Inject(ROUTE_MODEL_BINDING_CONFIG)
    private readonly config: RouteModelBindingConfig,
  ) {}

  /**
   * Middleware function to bind route parameters to model instances.
   *
   * Loops over all req.params and attempts to find a corresponding model instance
   * in the database. If found, it assigns the instance to req.routeModels under the
   * same key as the route parameter. If not found, it throws a NotFoundException.
   *
   * @throws NotFoundException if a model instance cannot be found for a route parameter.
   * @throws Error if a route parameter id is not valid.
   * @throws Error if the repository for a route parameter cannot be found.
   *
   * @param req The incoming request object.
   * @param _res The outgoing response object (not used).
   * @param next The next middleware function in the stack.
   */
  public async use(
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> {
    const routeModelKeys = Object.keys(req.params)

    // Initialize storage for route models
    req[STORAGE_KEY] = req[STORAGE_KEY] || {}

    for (const key of routeModelKeys) {
      const lowerKey = key.toLowerCase()
      const repo = this.ds.getRepository(lowerKey)

      const id = req.params[key]

      if (!id) {
        throw new Error(
          `InvalidArgumentError: The id for ${repo.metadata.name} is not valid`,
        )
      }

      // Build the resolver context
      const context: ResolverContext = {
        id,
        req,
        routeModels: req[STORAGE_KEY],
        paramName: key,
      }

      const where = await this.config.defaultResolver(context)
      const entity = await repo.findOne({
        where,
      })

      if (!entity) {
        throw new NotFoundException(
          `Could not find ${repo.metadata.name} with id ${id}`,
        )
      }

      req[STORAGE_KEY][key] = entity
    }

    next()
  }
}
