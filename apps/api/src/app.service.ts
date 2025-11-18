import { Injectable } from '@nestjs/common';
import { WithErrorHandling } from './utils/with-error-handling.decorator';

@Injectable()
export class AppService {
  @WithErrorHandling('AppService', 'getData')
  getData(): { message: string } {
    return { message: 'Hello API' };
  }
}
