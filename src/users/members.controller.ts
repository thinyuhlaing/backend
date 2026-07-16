import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from 'src/auth/auth.guard';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from './enums/user-role.enum';
import type { User } from './interfaces/user.interface';
import { UsersService } from './users.service';

@Controller('members')
export class MembersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
  ) {
    const opts = {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      q: q ?? undefined,
    };
    return this.usersService.findMembers(opts);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findMember(id);
  }

  // @UseGuards(AuthGuard, RolesGuard)
  // @Roles(UserRole.INTERNAL_USER)
  @Post()
  create(@Body() dto: CreateMemberDto) {
    return this.usersService.createMember(dto);
  }

  // @UseGuards(AuthGuard)
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @Req() req: Request & { user?: User },
  ) {
    // if (dto.password && req.user?.userRole !== UserRole.INTERNAL_USER) {
    //   throw new ForbiddenException('Only Admin can update or reset passwords');
    // }

    return this.usersService.updateMember(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.removeMember(id);
  }
}
