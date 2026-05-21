import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @Column({ name: 'order_type', length: 20 })
  orderType!: string;

  @Column({ type: 'int' })
  amount!: number;

  @Column({ name: 'coins_change', type: 'int' })
  coinsChange!: number;

  @Column({ name: 'payment_method', length: 20, default: '' })
  paymentMethod!: string;

  @Column({ length: 20, default: 'pending' })
  status!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
