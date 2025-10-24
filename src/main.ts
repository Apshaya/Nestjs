// import { NestFactory } from '@nestjs/core';
// import { ValidationPipe, Logger } from '@nestjs/common';
// import { AppModule } from './app.module';
// import { ConfigService } from '@nestjs/config';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);
//   const configService = app.get(ConfigService);
//   const logger = new Logger('Bootstrap');

//   // Validation
//   app.useGlobalPipes(
//     new ValidationPipe({
//       whitelist: true,
//       forbidNonWhitelisted: true,
//       transform: true,
//     }),
//   );

//   // Payload size limit (1MB)
//   app.use((req, res, next) => {
//     const contentLength = req.headers['content-length'];
//     if (contentLength && parseInt(contentLength) > 1048576) {
//       return res.status(413).json({ message: 'Payload too large (max 1MB)' });
//     }
//     next();
//   });

//   const port = configService.get<number>('port');
//   await app.listen(port);
//   logger.log(`Application running on: http://localhost:${port}`);
// }
// bootstrap();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, BadRequestException } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Validation with detailed error handling
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const messages = errors.map(error => 
          Object.values(error.constraints || {}).join(', ')
        ).join('; ');
        return new BadRequestException(messages || 'Validation failed');
      },
    }),
  );

  // Payload size limit (1MB)
  app.use((req, res, next) => {
    const contentLength = req.headers['content-length'];
    if (contentLength && parseInt(contentLength) > 1048576) {
      return res.status(413).json({ message: 'Payload too large (max 1MB)' });
    }
    next();
  });

  const port = configService.get<number>('port');
  await app.listen(port);
  logger.log(` Application running on: http://localhost:${port}`);
}
bootstrap();