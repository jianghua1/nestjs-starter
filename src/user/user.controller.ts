import { Controller, Get, Optional, Version } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { MailerService } from '@nestjs-modules/mailer';

@Controller('user')
export class UserController {
  constructor(
    private userRepository: UserRepository,
    @Optional() private readonly mailerService: MailerService,
  ) {}

  @Get()
  @Version('1')
  async getHello(): Promise<any> {
    // console.log(this.connections);
    // mongoose
    // const res = await this.userModel.find();
    // prisma
    // const res = await this.prismaService.user.findMany({});
    // typeorm
    const res = await this.userRepository.find();
    return res;
  }
  @Get('mail')
  async sendMail(): Promise<any> {
    console.log('in');
    this.mailerService
      .sendMail({
        to: '1322928787@qq.com',
        from: 'imoocbrian@qq.com',
        subject: 'Testing Nest Mailermodule with template ✔',
        template: 'welcome', // The `.pug`, `.ejs` or `.hbs` extension is appended automatically.
        context: {
          // Data to be sent to template engine.
          name: 'toimc',
        },
      })
      .then(() => {
        console.log('sucessful');
      })
      .catch((err) => {
        console.log('🚀 ~ UserController ~ sendMail ~ err:', err);
      });
  }
}
