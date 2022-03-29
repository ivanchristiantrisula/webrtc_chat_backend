import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  OneToOne,
  JoinColumn,
} from "typeorm";
import Friendship from "./Friendship.entity";
import FriendFinderProfile from "./FriendFinderProfile.entity";

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
  bio: string = "Hi im new!";

  @Column({ default: true })
  profilepicture: string =
    "https://res.cloudinary.com/dkrfnxthx/image/upload/v1642180170/default_cldnqh.png";

  @Column({ nullable: true })
  banReportID: string;

  @Column({ nullable: true })
  banDate: Date;

  @Column({ default: true })
  isBanned: Boolean = false;

  @Column({ default: true })
  isVerified: Boolean = false;

  @OneToOne(() => FriendFinderProfile, (ffp) => ffp.user)
  @JoinColumn()
  friendFinderProfile: FriendFinderProfile;

  @OneToMany(() => Friendship, (friendship) => friendship.user1)
  friends: Friendship[];
}
