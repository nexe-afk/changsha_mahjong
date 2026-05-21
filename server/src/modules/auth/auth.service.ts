import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../../utils/database';
import { User } from '../../models/User';
import { config } from '../../config';

export class AuthService {
  private userRepo = AppDataSource.getRepository(User);

  async register(username: string, password: string, nickname: string): Promise<{ user: User; token: string }> {
    if (!username || username.length < 3 || username.length > 20) {
      throw new Error('用户名需要3-20个字符');
    }
    if (!password || password.length < 6 || password.length > 50) {
      throw new Error('密码需要6-50个字符');
    }
    if (!nickname || nickname.length > 20) {
      throw new Error('昵称不能为空且不超过20个字符');
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new Error('用户名只能包含字母、数字和下划线');
    }

    const existing = await this.userRepo.findOne({ where: { username } });
    if (existing) throw new Error('Username already exists');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = this.userRepo.create({ username, passwordHash, nickname });
    await this.userRepo.save(user);

    const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: config.jwtExpire });
    return { user, token };
  }

  async login(username: string, password: string): Promise<{ user: User; token: string }> {
    const user = await this.userRepo.findOne({ where: { username } });
    if (!user) throw new Error('User not found');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new Error('Invalid password');

    user.lastLoginAt = new Date();
    await this.userRepo.save(user);

    const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: config.jwtExpire });
    return { user, token };
  }

  async guestLogin(): Promise<{ user: User; token: string }> {
    const guestName = `游客${Date.now().toString().slice(-6)}`;
    const passwordHash = await bcrypt.hash(Math.random().toString(), 10);
    const user = this.userRepo.create({ username: `guest_${Date.now()}`, passwordHash, nickname: guestName });
    await this.userRepo.save(user);

    const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: config.jwtExpire });
    return { user, token };
  }

  verifyToken(token: string): { userId: number } {
    return jwt.verify(token, config.jwtSecret) as { userId: number };
  }
}
