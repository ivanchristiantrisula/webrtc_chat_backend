import { Timestamp } from "mongodb";
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import Friendship from "./Friendship.entity";

@Entity()
export default class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  password: string;

  @Column({ unique: true })
  email: string;

  @Column()
  username: string;

  @Column({ default: true })
  MBTI: string = "";

  @Column({ default: true })
  bio: string = "";

  @Column({ default: true })
  profilepicture: string = "default";

  @Column({ nullable: true })
  banReportID: string;

  @Column({ nullable: true })
  banDate: Date; // TODO : CEK DI CODING MANUAL SET TIMESTAMP

  @Column({ default: true })
  isBanned: Boolean = false;

  @Column({ default: true })
  isVerified: Boolean = false;

  @OneToMany(() => Friendship, (friendship) => friendship.user1)
  friends: Friendship[];
}
