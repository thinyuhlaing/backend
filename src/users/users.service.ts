import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hashPassword, hashSecret } from './password.util';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserWithPassword } from './interfaces/user.interface';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly repository: UsersRepository) {}

  async create(dto: CreateUserDto): Promise<User> {
    await this.ensureUniqueLogin(dto.login);

    const user = await this.repository.create({
      ...dto,
      password: hashPassword(dto.password),
    });

    return this.sanitizeUser(user);
  }

  async findAll(): Promise<User[]> {
    const users = await this.repository.findAll();
    return users.map((user) => this.sanitizeUser(user));
  }

  async findOne(id: number): Promise<User> {
    const user = await this.repository.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }

  async update(id: number, dto: UpdateUserDto): Promise<User> {
    if (dto.login !== undefined) {
      await this.ensureUniqueLogin(dto.login, id);
    }

    const user = await this.repository.update(id, {
      ...dto,
      password: dto.password ? hashPassword(dto.password) : undefined,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }

  async remove(id: number) {
    const deleted = await this.repository.remove(id);
    if (!deleted) {
      throw new NotFoundException('User not found');
    }

    return { deleted: true };
  }

  async findByLogin(login: string): Promise<UserWithPassword | null> {
    return this.repository.findByLogin(login);
  }

  async findByIdWithPassword(id: number): Promise<UserWithPassword | null> {
    return this.repository.findById(id);
  }

  async storeRefreshToken(id: number, refreshToken: string): Promise<void> {
    await this.repository.updateRefreshTokenHash(id, hashSecret(refreshToken));
  }

  async clearRefreshToken(id: number): Promise<void> {
    await this.repository.updateRefreshTokenHash(id, null);
  }

  sanitizeUser(user: UserWithPassword): User {
    const {
      password: _password,
      refreshTokenHash: _refreshTokenHash,
      ...safeUser
    } = user;
    return safeUser;
  }

  private async ensureUniqueLogin(
    login: string,
    currentUserId?: number,
  ): Promise<void> {
    const existingUser = await this.repository.findByLogin(login);

    if (existingUser && existingUser.id !== currentUserId) {
      throw new ConflictException('Login already in use');
    }
  }
}
