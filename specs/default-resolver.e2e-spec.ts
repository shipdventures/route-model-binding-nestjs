import { HttpStatus, INestApplication } from "@nestjs/common"
import { managedCustomAppInstance, setupCustomApp } from "fixtures/app/custom"
import { post as postEntity } from "fixtures/models/post"
import { user as userEntity } from "fixtures/models/user"
import { Post } from "src/post.entity"
import { User } from "src/user.entity"
import * as request from "supertest"
import { App } from "supertest/types"
import { DataSource } from "typeorm"

describe("Route Model Binding - Default Resolver", () => {
  describe("Soft Delete Support", () => {
    const activeUser = userEntity.entity()
    const deletedUser = userEntity.entity()
    const activePost = postEntity.entity()
    const deletedPost = postEntity.entity()
    let app: INestApplication<App>

    beforeEach(async () => {
      // Setup app with soft delete resolver
      await setupCustomApp({
        defaultResolver: ({ id }) => ({
          id,
          deletedAt: null, // Only find non-deleted entities
        }),
      })

      app = managedCustomAppInstance()
      const ds = app.get<DataSource>(DataSource)

      // Save users with soft delete status
      await ds.getRepository(User).save([
        activeUser,
        { ...deletedUser, deletedAt: new Date() }, // Soft deleted user
      ])

      // Save posts with soft delete status
      await ds.getRepository(Post).save([
        activePost,
        { ...deletedPost, deletedAt: new Date() }, // Soft deleted post
      ])
    })

    describe("When requesting an active user and active post", () => {
      it("should return both models successfully", () => {
        return request(app.getHttpServer())
          .get(`/users/${activeUser.id}/posts/${activePost.id}`)
          .expect(HttpStatus.OK)
          .expect((res) => {
            expect(res.body.user.id).toBe(activeUser.id)
            expect(res.body.post.id).toBe(activePost.id)
          })
      })
    })

    describe("When requesting a soft-deleted user", () => {
      it("should return 404 not found", () => {
        return request(app.getHttpServer())
          .get(`/users/${deletedUser.id}/posts/${activePost.id}`)
          .expect(HttpStatus.NOT_FOUND)
      })
    })

    describe("When requesting a soft-deleted post", () => {
      it("should return 404 not found", () => {
        return request(app.getHttpServer())
          .get(`/users/${activeUser.id}/posts/${deletedPost.id}`)
          .expect(HttpStatus.NOT_FOUND)
      })
    })

    describe("When both user and post are soft-deleted", () => {
      it("should return 404 not found", () => {
        return request(app.getHttpServer())
          .get(`/users/${deletedUser.id}/posts/${deletedPost.id}`)
          .expect(HttpStatus.NOT_FOUND)
      })
    })
  })

  describe("Without Default Resolver", () => {
    const user = userEntity.entity()
    const deletedUser = userEntity.entity()
    const post = postEntity.entity()
    let app: INestApplication<App>

    beforeEach(async () => {
      // Setup app without custom resolver
      await setupCustomApp() // No config provided

      app = managedCustomAppInstance()
      const ds = app.get<DataSource>(DataSource)

      // Save users with soft delete status
      await ds.getRepository(User).save([
        user,
        { ...deletedUser, deletedAt: new Date() }, // Soft deleted but should still be found
      ])

      // Save posts
      await ds.getRepository(Post).save([post])
    })

    describe("When requesting a soft-deleted user without resolver", () => {
      it("should still find and return the soft-deleted user", () => {
        return request(app.getHttpServer())
          .get(`/users/${deletedUser.id}/posts/${post.id}`)
          .expect(HttpStatus.OK)
          .expect((res) => {
            expect(res.body.user.id).toBe(deletedUser.id)
            expect(res.body.user.deletedAt).toBeTruthy()
            expect(res.body.post.id).toBe(post.id)
          })
      })
    })
  })
})
