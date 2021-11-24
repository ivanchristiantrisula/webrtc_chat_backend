import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from "typeorm";
import User from "./User.entity";

@Entity()
export default class Report {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User)
  @JoinColumn()
  reporter: User;

  @OneToOne(() => User)
  @JoinColumn()
  reportee: User;

  @Column()
  type: string;

  @Column()
  category: string;

  @Column({ nullable: true })
  proof: string;

  @Column()
  description: string;

  @Column()
  status: string;

  @Column()
  timestamp: Date;

  @Column({ nullable: true })
  closedDate: Date;
}
