import { NotFoundException } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import { getDataSourceToken } from "@nestjs/typeorm"
import { Request, Response } from "express"
import { managedDatasourceInstance } from "fixtures/database"
import { express } from "fixtures/express"
import { post as postEntity } from "fixtures/models/post"
import { user as userEntity } from "fixtures/models/user"
import { Post } from "src/post.entity"
import { User } from "src/user.entity"
import { RouteModelBindingMiddleware } from "./route-model-binding.middleware"

describe("RouteModelBindingMiddleware", () => {
  const user = userEntity.entity()
  const post = postEntity.entity()
  const nonExistentId = crypto.randomUUID()
  let middleware: RouteModelBindingMiddleware

  beforeEach(async () => {
    const datasource = managedDatasourceInstance()
    await datasource
      .getRepository(User)
      .save([
        userEntity.entity(),
        userEntity.entity(),
        user,
        userEntity.entity(),
      ])

    await datasource
      .getRepository(Post)
      .save([postEntity.entity(), postEntity.entity(), post])

    const app: TestingModule = await Test.createTestingModule({
      providers: [
        RouteModelBindingMiddleware,
        { provide: getDataSourceToken(), useValue: datasource },
      ],
    }).compile()

    middleware = app.get(RouteModelBindingMiddleware)
  })

  describe(`Given a User Entity exists with the id ${user.id}`, () => {
    describe(`And a Post Entity exists with the id ${post.id}`, () => {
      describe(`And req.params.user has the value ${user.id}`, () => {
        describe(`And req.params.post has the value ${post.id}`, () => {
          let request: Partial<Request>
          beforeEach((done) => {
            request = express.request({
              params: { user: user.id, post: post.id },
            })

            void middleware.use(
              request as Request,
              express.response() as Response,
              done,
            )
          })

          it("should find the user and assign it to req.routeModels.user", (done) => {
            expect(request).toHaveProperty("routeModels.user", user)
            void middleware.use(
              request as Request,
              express.response() as Response,
              () => {
                done()
              },
            )
          })

          it("should find the post and assign it to req.routeModels.post", () => {
            expect(request).toHaveProperty("routeModels.post", post)
          })
        })
      })

      describe(`And req.params.USER has the value ${user.id}`, () => {
        describe(`And req.params.POST has the value ${post.id}`, () => {
          let request: Partial<Request>
          beforeEach((done) => {
            request = express.request({
              params: { USER: user.id, POST: post.id },
            })

            void middleware.use(
              request as Request,
              express.response() as Response,
              done,
            )
          })

          it("should find the user and assign it to req.routeModels.USER", (done) => {
            expect(request).toHaveProperty("routeModels.USER", user)
            void middleware.use(
              request as Request,
              express.response() as Response,
              () => {
                done()
              },
            )
          })

          it("should find the post and assign it to req.routeModels.POST", () => {
            expect(request).toHaveProperty("routeModels.POST", post)
          })
        })
      })

      describe("And req.params.user has the value ''", () => {
        it("should throw an error", () => {
          return expect(() =>
            middleware.use(
              express.request({ params: { user: "" } }) as Request,
              express.response() as Response,
              () => {},
            ),
          ).rejects.toThrow(
            "InvalidArgumentError: The id for User is not valid",
          )
        })
      })

      describe("And req.params.user has the value null", () => {
        it("should throw an error", () => {
          return expect(() =>
            middleware.use(
              express.request({
                params: { user: null as unknown as string },
              }) as Request,
              express.response() as Response,
              () => {},
            ),
          ).rejects.toThrow(
            "InvalidArgumentError: The id for User is not valid",
          )
        })
      })

      describe(`But no post exists with the id ${nonExistentId}`, () => {
        describe(`And req.params.post has the value ${nonExistentId}`, () => {
          it("should throw a NotFoundException", () => {
            return expect(
              middleware.use(
                express.request({
                  params: { user: user.id, post: nonExistentId },
                }) as Request,
                express.response() as Response,
                () => {},
              ),
            ).rejects.toThrowEquals(
              new NotFoundException(
                `Could not find Post with id ${nonExistentId}`,
              ),
            )
          })
        })
      })

      describe("And req.params.post has the value ''", () => {
        it("should throw an error", () => {
          return expect(() =>
            middleware.use(
              express.request({
                params: { user: user.id, post: "" },
              }) as Request,
              express.response() as Response,
              () => {},
            ),
          ).rejects.toThrow(
            "InvalidArgumentError: The id for Post is not valid",
          )
        })
      })

      describe("And req.params.post has the value null", () => {
        it("should throw an error", () => {
          return expect(() =>
            middleware.use(
              express.request({
                params: { user: user.id, post: null as unknown as string },
              }) as Request,
              express.response() as Response,
              () => {},
            ),
          ).rejects.toThrow(
            "InvalidArgumentError: The id for Post is not valid",
          )
        })
      })
    })

    describe(`Given no user exists with the id ${nonExistentId}`, () => {
      describe(`And req.params.user has the value ${nonExistentId}`, () => {
        it("should throw a NotFoundException", () => {
          return expect(
            middleware.use(
              express.request({
                params: { user: nonExistentId },
              }) as Request,
              express.response() as Response,
              () => {},
            ),
          ).rejects.toThrowEquals(
            new NotFoundException(
              `Could not find User with id ${nonExistentId}`,
            ),
          )
        })
      })
    })
  })

  describe("Security and Edge Cases", () => {
    describe("SQL Injection Protection", () => {
      it("should safely handle SQL injection attempts in user ID", () => {
        const sqlInjectionAttempts = [
          "1; DROP TABLE users;--",
          "1' OR '1'='1",
          "1' UNION SELECT * FROM users--",
          "admin'--",
        ]

        const promises = sqlInjectionAttempts.map((attempt) =>
          expect(
            middleware.use(
              express.request({
                params: { user: attempt },
              }) as Request,
              express.response() as Response,
              () => {},
            ),
          ).rejects.toThrowEquals(
            new NotFoundException(`Could not find User with id ${attempt}`),
          ),
        )

        return Promise.all(promises)
      })

      it("should safely handle SQL injection attempts in post ID", () => {
        const sqlInjectionAttempts = [
          "1; DELETE FROM posts WHERE 1=1;--",
          "1' OR '1'='1",
          "1; UPDATE posts SET title='hacked';--",
        ]

        const promises = sqlInjectionAttempts.map((attempt) =>
          expect(
            middleware.use(
              express.request({
                params: { user: user.id, post: attempt },
              }) as Request,
              express.response() as Response,
              () => {},
            ),
          ).rejects.toThrowEquals(
            new NotFoundException(`Could not find Post with id ${attempt}`),
          ),
        )

        return Promise.all(promises)
      })
    })

    describe("Case Sensitivity", () => {
      it("should handle lowercase entity names", async () => {
        // TypeORM is typically case-insensitive for entity names
        // This test documents the actual behavior
        const request = express.request({
          params: { user: user.id },
        }) as Request

        await middleware.use(request, express.response() as Response, () => {})
        expect(request).toHaveProperty("routeModels.user", user)
      })
    })

    describe("Reserved TypeORM Names", () => {
      it("should handle TypeORM reserved words as parameter names gracefully", () => {
        const reservedNames = ["repository", "manager", "metadata"]

        const promises = reservedNames.map(
          (name) =>
            expect(
              middleware.use(
                express.request({
                  params: { [name]: "123" },
                }) as Request,
                express.response() as Response,
                () => {},
              ),
            ).rejects.toThrow(), // Will throw because entity doesn't exist
        )

        return Promise.all(promises)
      })
    })
  })
})
