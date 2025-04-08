import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClientService } from '../../src/client/client.service';
import { Request } from 'express';
import { RequiredClientPairKey } from '@app/decorator';

@Injectable()
export class RequireClientPairGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly clientService: ClientService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredClientPair: boolean = this.reflector.getAllAndOverride(
      RequiredClientPairKey,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredClientPair) {
      return true;
    }
    const req: Request = context.switchToHttp().getRequest();
    if (typeof req.query.clientId !== 'string') {
      throw new HttpException('clientId 错误', HttpStatus.BAD_REQUEST);
    }
    if (typeof req.query.clientSecret !== 'string') {
      throw new HttpException('clientSecret 错误', HttpStatus.BAD_REQUEST);
    }
    const clientId = req.query.clientId.toString();
    const clientSecret = req.query.clientSecret.toString();
    if (!clientId) {
      throw new HttpException('clientId 不能为空', HttpStatus.BAD_REQUEST);
    }
    if (!clientSecret) {
      throw new HttpException('clientSecret 不能为空', HttpStatus.BAD_REQUEST);
    }
    const client = await this.clientService.findClientByClientId(clientId);
    if (!client) {
      throw new HttpException('客户端不存在', HttpStatus.NOT_FOUND);
    }
    if (clientSecret !== client.clientSecret) {
      throw new HttpException('客户端密钥错误', HttpStatus.NOT_FOUND);
    }
    return true;
  }
}
