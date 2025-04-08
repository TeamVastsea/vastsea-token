import { ApiException } from '@nanogiants/nestjs-swagger-api-exception-decorator';
import {
  applyDecorators,
  BadRequestException,
  SetMetadata,
} from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';

export const RequiredClientPairKey = Symbol();

/**
 * @description 被该修饰器修饰的接口, 如果提供了 client-id 那么必须提供client-secret.
 */
export const RequireClientPair = () => {
  return applyDecorators(
    SetMetadata(RequiredClientPairKey, true),
    ApiException(() => BadRequestException, {
      description:
        '当 clientId 或 clientSecret 不为字符串或任意一项为空时, 会抛出 400 Bad Request 错误. message会阐述错误原因',
    }),
    ApiQuery({
      name: 'clientId',
      description: '平台注册客户端时颁发的 clientId.',
      type: String,
      required: true,
    }),
    ApiQuery({
      name: 'clientSecret',
      description: '平台注册客户端时颁发的 clientSecret.',
      type: String,
      required: true,
    }),
  );
};
