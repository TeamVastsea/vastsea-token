import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateAccount } from './dto/create-account';
import { pbkdf2Sync, randomBytes } from 'crypto';
import { AUTH_EMAIL_CODE, ID_COUNTER, TOKEN_PAIR } from '@app/constant';
import { PrismaService } from '@app/prisma';
import { AutoRedis } from '@app/decorator';
import Redis, { Cluster } from 'ioredis';
import { GlobalCounterService } from '@app/global-counter';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@app/config';

@Injectable()
export class AccountService {
  private logger: Logger = new Logger(AccountService.name);
  constructor(
    private prisma: PrismaService,
    @AutoRedis() private redis: Redis | Cluster,
    private cnt: GlobalCounterService,
    private mail: MailerService,
    private config: ConfigService,
  ) {}
  async createAccount(body: CreateAccount) {
    const { email, password, profile } = body;
    const dbAccount = await this.prisma.account.findFirst({
      where: { email },
    });
    if (dbAccount) {
      throw new HttpException(`邮箱已存在`, HttpStatus.BAD_REQUEST);
    }
    const salt = randomBytes(64).toString('hex');
    const iterations = 1000;
    const hashPwd = this.hashPwd(password, salt, iterations);
    const id = await this.cnt.incr(ID_COUNTER.ACCOUNT);
    const account = await this.prisma.account.create({
      data: {
        id,
        password: hashPwd,
        email,
        salt,
        iterations: 1000,
        profile: {
          create: {
            ...profile,
            nick: profile.nick,
          },
        },
      },
      include: {
        profile: true,
      },
    });
    return { id: account.id, email: account.email, profile: account.profile };
  }
  async getEmailCode(email: string) {
    const emailCode = await this.redis.get(AUTH_EMAIL_CODE(email));
    if (!emailCode) {
      throw new HttpException('您需要先发送验证码', HttpStatus.BAD_REQUEST);
    }
    return emailCode;
  }
  async verifyCode(email: string, userCode: string, realCode: string) {
    if (userCode !== realCode) {
      throw new HttpException('验证码不正确', HttpStatus.BAD_REQUEST);
    }
    await this.redis.del(AUTH_EMAIL_CODE(email));
  }
  getAccountInfo(id: bigint) {
    return this.prisma.account.findFirst({
      where: { id },
    });
  }
  hashPwd(password: string, salt: string, iterations: number) {
    return pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
  }
  async createEmailCode(email: string) {
    if (await this.redis.exists(AUTH_EMAIL_CODE(email))) {
      throw new HttpException(
        '请不要重复发送验证码',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const account = await this.prisma.account.findFirst({
      where: { email },
    });
    if (account) {
      throw new HttpException('用户已存在', HttpStatus.BAD_REQUEST);
    }
    const code = randomBytes(80).toString('hex').slice(0, 16);
    const setCodeHandle = this.redis.set(AUTH_EMAIL_CODE(email), code);
    return (
      __TEST__
        ? Promise.resolve()
        : this.mail.sendMail({
            to: email,
            from: this.config.get('email.email'),
            subject: '欢迎注册',
            text: `验证码: ${code}\n有效期 ${Math.floor(this.config.get('cache.ttl.auth.emailCode') / 60)} 分钟
          `,
          })
    )
      .then(() => setCodeHandle)
      .then(() =>
        this.redis.expire(
          AUTH_EMAIL_CODE(email),
          this.config.get('cache.ttl.auth.emailCode'),
        ),
      )
      .then(() => this.redis.ttl(AUTH_EMAIL_CODE(email)))
      .catch((err) => this.logger.error(err.message, err.stack));
  }
  async userOnline(clientId: string, userId: bigint) {
    if (!(await this.getAccountInfo(userId))) {
      throw new HttpException('用户不存在', HttpStatus.NOT_FOUND);
    }
    return this.redis.exists(TOKEN_PAIR(userId.toString(), clientId, 'access'));
  }
}
