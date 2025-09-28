import { Controller, Get } from "@nestjs/common"
import { User } from "./user.entity"
import { Post } from "./post.entity"
import { RouteModel } from "@neoma/route-model-binding"

@Controller()
export class AppController {
  @Get("/users/:user/posts/:post")
  public getUser(
    @RouteModel("user") user: User,
    @RouteModel("post") post: Post,
  ): { user: User; post: Post } {
    return { user, post }
  }
}
