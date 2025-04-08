import { ApiProperty } from '@nestjs/swagger';

export class AccountOnline {
  @ApiProperty({
    description: '如果传入的用户在线, 那么将会返回true, 否则返回false',
  })
  online: boolean;
}
