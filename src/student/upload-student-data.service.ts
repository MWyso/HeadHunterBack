import { Injectable } from '@nestjs/common';
import { parse } from 'csv-parse';
import { Readable } from 'stream';
import { Student } from './entity/student.entity';
import { StudentService } from './student.service';
import { AuthService } from '../auth/auth.service';
import { UploadStudentsDto } from './dto';
import { ApiResponse } from '@Types';
import { MailService } from '../mail/mail.service';

@Injectable()
export class UploadStudentDataService {
  constructor(
    private authService: AuthService,
    private studentService: StudentService,
    private mailService: MailService,
  ) {}

  async uploadFile(file): Promise<ApiResponse<object>> {
    const records = [];
    const students = await this.studentService.get();
    const parser = parse({
      delimiter: ';',
      trim: true,
      columns: true,
      cast: true,
    });
    try {
      parser.on('readable', async () => {
        let record: UploadStudentsDto;
        while ((record = parser.read()) !== null) {
          const data = new Student();
          data.email = record.email;
          data.courseCompletion = Number(record.courseCompletion);
          data.courseEngagement = Number(record.courseEngagement);
          data.projectDegree = Number(record.projectDegree);
          data.teamProjectDegree = Number(record.teamProjectDegree);
          data.scrumProjectUrls = record.scrumProjectUrls;
          if (!students.some((std) => std.email == record.email)) {
            await data.save();
            data.verificationToken = await this.authService.getVerificationToken(record.email);
            await data.save();
            data.activationUrl = await this.mailService.generateUrl(record.email);
            await data.save();
            records.push(data);
          }
        }
      });
      parser.on('error', function (err) {
        console.error(err.message);
      });
      const stream = Readable.from(file.buffer).pipe(parser);
      await new Promise((resolve, reject) => {
        stream.on('end', resolve);
        stream.on('error', reject);
      });
      await Promise.all(records);

      return { isSuccess: true, payload: { numberAddedStudents: records.length } };
    } catch (e) {
      return { isSuccess: false, error: 'Ups... coś poszło nie tak.' };
    }
  }
}