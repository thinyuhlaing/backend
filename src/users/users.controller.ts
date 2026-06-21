import { Controller, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from './enums/user-role.enum';
import { UsersService } from './users.service';
import { AbstractBaseController } from 'src/common/base/base.controller';

// @UseGuards(AuthGuard, RolesGuard)
// @Roles(UserRole.INTERNAL_USER)
@Controller('users')
export class UsersController extends AbstractBaseController<
  CreateUserDto,
  UpdateUserDto
> {
  constructor(private readonly userService: UsersService) {
    super(userService);
  }
}
