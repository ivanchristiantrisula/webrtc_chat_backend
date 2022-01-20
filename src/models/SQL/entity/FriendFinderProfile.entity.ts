import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from "typeorm";
import User from "./User.entity";

@Entity()
export default class FriendFinderProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, (user) => user.friendFinderProfile)
  user: User;

  @Column({ nullable: true })
  MBTI: string;

  @Column("jsonb", { nullable: true })
  answers: object[];
}
