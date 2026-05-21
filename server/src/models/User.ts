import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, length: 20 })
  username!: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash!: string;

  @Column({ length: 30, default: '游客' })
  nickname!: string;

  @Column({ name: 'avatar_url', length: 500, default: '' })
  avatarUrl!: string;

  @Column({ type: 'bigint', default: 10000 })
  coins!: number;

  @Column({ type: 'int', default: 0 })
  diamond!: number;

  @Column({ type: 'int', default: 1 })
  level!: number;

  @Column({ type: 'int', default: 0 })
  experience!: number;

  @Column({ name: 'win_count', type: 'int', default: 0 })
  winCount!: number;

  @Column({ name: 'lose_count', type: 'int', default: 0 })
  loseCount!: number;

  @Column({ name: 'total_games', type: 'int', default: 0 })
  totalGames!: number;

  @Column({ length: 20, default: 'active' })
  status!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'last_login_at' })
  lastLoginAt!: Date;
}
