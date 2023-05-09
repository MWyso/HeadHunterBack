import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Hr } from './entity/hr.entity';
import { ApiResponse, ConfirmResponse, CreateResponse } from '@Types';
import { AuthService } from '../auth/auth.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class HrService {
  constructor(
    @Inject(forwardRef(() => AuthService)) private authService: AuthService,
    private mailService: MailService,
  ) {}

  async getHrByEmail(email: string): Promise<Hr> {
    return await Hr.findOneBy({ email });
  }

  async getHrById(id: string): Promise<Hr> {
    return await Hr.findOneBy({ id });
  }

  async get(): Promise<Hr[]> {
    return await Hr.find();
  }

  async createHr(formData): Promise<ApiResponse<CreateResponse>> {
    if (await this.getHrByEmail(formData.email))
      throw new HttpException(
        {
          isSuccess: false,
          error: `Użytkownik o emailu ${formData.email} już istniej`,
        },
        HttpStatus.BAD_REQUEST,
      );
    try {
      const hr = new Hr();
      hr.email = formData.email;
      hr.fullName = formData.fullName;
      hr.company = formData.company;
      hr.maxReservedStudents = formData.maxReservedStudents;
      await hr.save();

      hr.verificationToken = await this.authService.getVerificationToken(formData.email);
      await hr.save();
      hr.activationUrl = await this.mailService.generateUrl(formData.email);
      await hr.save();

      return {
        isSuccess: true,
        payload: { id: hr.id },
      };
    } catch (e) {
      return { isSuccess: false, error: 'Ups... coś poszło nie tak.' };
    }
  }

  async confirmHrAccount(param): Promise<ApiResponse<ConfirmResponse>> {
    const hr = await this.getHrById(param.id);
    if (hr && param.token === hr.verificationToken) {
      try {
        await Hr.createQueryBuilder('hr').update(Hr).set({ active: true }).where('id=:id', { id: param.id }).execute();
        return {
          isSuccess: true,
          payload: { id: param.id },
        };
      } catch (e) {
        return { isSuccess: false, error: 'Ups... coś poszło nie tak.' };
      }
    }
    return { isSuccess: false, error: 'Ups... coś poszło nie tak.' };
  }
}
