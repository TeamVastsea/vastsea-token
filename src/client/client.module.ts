import { Module } from '@nestjs/common';
import { ClientService } from './client.service';
import { ClientController } from './client.controller';
import { ClientCache } from './client.cache';

@Module({
  controllers: [ClientController],
  providers: [ClientService, ClientCache],
  exports: [ClientService],
})
export class ClientModule {}
