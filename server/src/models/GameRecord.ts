import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('game_records')
export class GameRecord {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'room_id', type: 'int' })
  roomId!: number;

  @Column({ name: 'round_number', type: 'int' })
  roundNumber!: number;

  @Column({ name: 'dealer_id', type: 'int' })
  dealerId!: number;

  @Column({ type: 'json' })
  initialHands!: object;

  @Column({ type: 'json' })
  actions!: object;

  @Column({ type: 'json' })
  result!: object;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
