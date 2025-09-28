import { HttpStatus, INestApplication } from "@nestjs/common"
import { managedAppInstance } from "fixtures/app"
import { post as postEntity } from "fixtures/models/post"
import { user as userEntity } from "fixtures/models/user"
import { Post } from "src/post.entity"
import { User } from "src/user.entity"
import * as request from "supertest"
import { App } from "supertest/types"
import { DataSource } from "typeorm"

describe("Route Model Binding", () => {
  const user = userEntity.entity()
  const post = postEntity.entity()

  const nonExistentId = crypto.randomUUID()
  let app: INestApplication<App>

  beforeEach(async () => {
    app = managedAppInstance()
    const ds = app.get<DataSource>(DataSource)

    await ds
      .getRepository(User)
      .save([
        userEntity.entity(),
        user,
        userEntity.entity(),
        userEntity.entity(),
      ])

    await ds
      .getRepository(Post)
      .save([postEntity.entity(), post, postEntity.entity()])
  })

  describe("GET /users/:user/posts/:post", () => {
    describe(`Given a user exists with the id ${user.id}`, () => {
      describe(`And a post exits with the id ${post.id}`, () => {
        describe(`When a request is made to /users/${user.id}/${post.id}`, () => {
          it(`should respond with a ${HttpStatus.OK} and return the user model with the id ${user.id} and post model with the id ${post.id}`, () => {
            return request(app.getHttpServer())
              .get(`/users/${user.id}/posts/${post.id}`)
              .expect(HttpStatus.OK)
              .expect({ user: { ...user }, post: { ...post } })
          })
        })
      })

      describe(`But no post exists with the id ${nonExistentId}`, () => {
        describe(`When a request is made to /users/${user.id}/posts/${nonExistentId}`, () => {
          it(`should respond with a ${HttpStatus.NOT_FOUND}`, () => {
            return request(app.getHttpServer())
              .get(`/users/${user.id}/posts/${nonExistentId}`)
              .expect(HttpStatus.NOT_FOUND)
              .expect({
                message: `Could not find Post with id ${nonExistentId}`,
                error: "Not Found",
                statusCode: HttpStatus.NOT_FOUND,
              })
          })
        })
      })
    })

    describe(`Given no user exists with the id ${nonExistentId}`, () => {
      describe(`When a request is made to /users/${nonExistentId}/post/${post.id}`, () => {
        it(`should respond with a ${HttpStatus.NOT_FOUND}`, () => {
          return request(app.getHttpServer())
            .get(`/users/${nonExistentId}/posts/${post.id}`)
            .expect(HttpStatus.NOT_FOUND)
            .expect({
              message: `Could not find User with id ${nonExistentId}`,
              error: "Not Found",
              statusCode: HttpStatus.NOT_FOUND,
            })
        })
      })
    })
  })

  describe("SQL Injection Protection", () => {
    describe("When SQL injection is attempted via route parameters", () => {
      it(`should safely handle SQL injection attempts and return ${HttpStatus.NOT_FOUND}`, async () => {
        // First verify we have users in the database
        const userCount = await app
          .get<DataSource>(DataSource)
          .getRepository(User)
          .count()

        expect(userCount).toBeGreaterThan(0)

        // Attempt various SQL injection patterns
        const injectionAttempts = [
          "1; DROP TABLE users;--",
          "1' OR '1'='1",
          "1' UNION SELECT * FROM users--",
          "admin'--",
          "1; DELETE FROM users WHERE 1=1;--",
        ]

        for (const attempt of injectionAttempts) {
          await request(app.getHttpServer())
            .get(`/users/${encodeURIComponent(attempt)}/posts/${post.id}`)
            .expect(HttpStatus.NOT_FOUND)
            .expect({
              message: `Could not find User with id ${attempt}`,
              error: "Not Found",
              statusCode: HttpStatus.NOT_FOUND,
            })
        }

        // Verify the users table still exists and has the same data
        const userCountAfter = await app
          .get<DataSource>(DataSource)
          .getRepository(User)
          .count()

        expect(userCountAfter).toBe(userCount)
      })

      it(`should handle SQL injection attempts in post parameter`, async () => {
        const postCount = await app
          .get<DataSource>(DataSource)
          .getRepository(Post)
          .count()

        expect(postCount).toBeGreaterThan(0)

        const injectionAttempts = [
          "1; DROP TABLE posts;--",
          "1' OR '1'='1",
          "1' UNION SELECT * FROM posts--",
          "admin'--",
          "1; DELETE FROM posts WHERE 1=1;--",
        ]

        for (const attempt of injectionAttempts) {
          await request(app.getHttpServer())
            .get(`/users/${user.id}/posts/${encodeURIComponent(attempt)}`)
            .expect(HttpStatus.NOT_FOUND)
            .expect({
              message: `Could not find Post with id ${attempt}`,
              error: "Not Found",
              statusCode: HttpStatus.NOT_FOUND,
            })
        }

        // Verify the posts table is intact
        const postCountAfter = await app
          .get<DataSource>(DataSource)
          .getRepository(Post)
          .count()

        expect(postCountAfter).toBe(postCount)
      })
    })
  })
})
