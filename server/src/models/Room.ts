import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'room_number', unique: true, length: 6 })
  roomNumber!: string;

  @Column({ name: 'room_type', length: 10 })
  roomType!: string;

  @Column({ name: 'base_score', type: 'int', default: 10 })
  baseScore!: number;

  @Column({ length: 20, default: 'waiting' })
  status!: string;

  @Column({ name: 'player_0_id', type: 'int', nullable: true })
  player0Id!: number | null;

  @Column({ name: 'player_1_id', type: 'int', nullable: true })
  player1Id!: number | null;

  @Column({ name: 'player_2_id', type: 'int', nullable: true })
  player2Id!: number | null;

  @Column({ name: 'player_3_id', type: 'int', nullable: true })
  player3Id!: number | null;

  @Column({ name: 'current_round', type: 'int', default: 0 })
  currentRound!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column({ name: 'finished_at', type: 'timestamp', nullable: true })
  finishedAt!: Date | null;
}
