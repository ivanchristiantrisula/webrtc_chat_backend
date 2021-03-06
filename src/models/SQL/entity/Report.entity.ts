import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  ManyToMany,
  OneToMany,
  ManyToOne,
} from "typeorm";
import User from "./User.entity";

@Entity()
export default class Report {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn()
  reporter: User;

  @ManyToOne(() => User)
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

  @Column({ nullable: true })
  isReporteeBanned: boolean;
}
