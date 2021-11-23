import { Timestamp } from "mongodb";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from "typeorm";
import User from "./User.entity";

@Entity()
export default class Friendship {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User)
  @JoinColumn()
  user1: User;

  @OneToOne(() => User)
  @JoinColumn()
  user2: User;

  @Column()
  status: string;
}
