import { Module } from '@nestjs/common';
import { CryptoController } from './crypto.controller';
import { CryptoService } from './crypto.service';
import { rsaKeysProvider } from './rsa-keys.provider';

@Module({
  controllers: [CryptoController],
  providers: [CryptoService, rsaKeysProvider],
})
export class CryptoModule {}
