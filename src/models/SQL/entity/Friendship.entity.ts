import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  ManyToMany,
  ManyToOne,
} from "typeorm";
import User from "./User.entity";

@Entity()
export default class Friendship {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.id)
  user1: User;

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn()
  user2: User;

  @Column()
  status: string;
}
