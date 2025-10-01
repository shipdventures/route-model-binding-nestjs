import { Request } from "express"
import { FindOptionsWhere } from "typeorm"

/**
 * Context provided to resolver functions containing all information
 * needed to construct a database query for route model binding.
 */
export interface ResolverContext {
  /** The value of the route parameter (e.g., the ID or slug) */
  id: string
  /** The Express request object */
  req: Request
  /** Previously resolved route models in the current request */
  routeModels: Record<string, any>
  /** The name of the route parameter being resolved (e.g., 'user', 'post') */
  paramName: string
}

/**
 * Function that generates a TypeORM where clause for finding an entity.
 * Can return the where clause synchronously or as a Promise.
 */
export type ResolverFunction = (
  context: ResolverContext,
) => FindOptionsWhere<any> | Promise<FindOptionsWhere<any>>

/**
 * Configuration options for the RouteModelBinding module.
 */
export interface RouteModelBindingConfig {
  /**
   * Default resolver function applied to all route parameters
   * unless overridden by a specific resolver.
   *
   * @example
   * defaultResolver: ({ id }) => ({ id, deletedAt: null })
   */
  defaultResolver: ResolverFunction
}
