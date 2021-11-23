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

  @Column()
  user1: number;

  @Column()
  user2: number;

  @Column()
  status: string;
}
