import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"

@Entity()
export class Post {
  @PrimaryGeneratedColumn("uuid")
  public id: string

  @Column()
  public content: string
}
