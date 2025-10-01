import { DynamicModule, Module } from "@nestjs/common"
import { ROUTE_MODEL_BINDING_CONFIG } from "../constants/injection-tokens"
import { RouteModelBindingConfig } from "../interfaces/route-model-binding-config.interface"
import { RouteModelBindingMiddleware } from "../middlewares/route-model-binding.middleware"

/**
 * Module that provides route model binding functionality for NestJS applications.
 * This module registers the RouteModelBindingMiddleware as a provider.
 */
@Module({})
export class RouteModelBindingModule {
  /**
   * Creates a dynamic module with the RouteModelBindingMiddleware provider.
   *
   * @param config Configuration for route model binding behavior with sensible defaults
   * @returns A DynamicModule configuration for the RouteModelBindingModule
   */
  public static forRoot(
    config: RouteModelBindingConfig = {
      defaultResolver: ({ id }) => ({ id }),
    },
  ): DynamicModule {
    return {
      module: RouteModelBindingModule,
      providers: [
        {
          provide: ROUTE_MODEL_BINDING_CONFIG,
          useValue: config,
        },
        RouteModelBindingMiddleware,
      ],
      exports: [RouteModelBindingMiddleware, ROUTE_MODEL_BINDING_CONFIG],
    }
  }
}
