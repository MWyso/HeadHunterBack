import { forwardRef, Module } from '@nestjs/common';
import { StudentService } from './student.service';
import { StudentController } from './student.controller';
import { AuthModule } from '../auth/auth.module';
import { StudentHrMethodsService } from './student-hr-methods.service';
import { HrModule } from '../hr/hr.module';

@Module({
  imports: [forwardRef(() => AuthModule), forwardRef(() => HrModule)],
  controllers: [StudentController],
  providers: [StudentService, StudentHrMethodsService],
  exports: [StudentService],
})
export class StudentModule {}
