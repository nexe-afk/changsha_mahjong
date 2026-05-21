import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('shop_items')
export class ShopItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 50 })
  name!: string;

  @Column({ length: 20 })
  type!: string;

  @Column({ name: 'price_coins', type: 'int', default: 0 })
  priceCoins!: number;

  @Column({ name: 'price_diamond', type: 'int', default: 0 })
  priceDiamond!: number;

  @Column({ name: 'image_url', length: 500, default: '' })
  imageUrl!: string;

  @Column({ length: 500, default: '' })
  description!: string;

  @Column({ length: 20, default: 'active' })
  status!: string;
}
