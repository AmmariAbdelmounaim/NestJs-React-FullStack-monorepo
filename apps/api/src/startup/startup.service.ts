import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersRepository } from '../users/users.repository';
import * as bcrypt from 'bcrypt';

@Injectable()
export class StartupService implements OnModuleInit {
  private readonly logger = new Logger(StartupService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.initializeAdmin();
  }

  private async initializeAdmin() {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD');
    const adminFirstName =
      this.configService.get<string>('ADMIN_FIRST_NAME') || 'Admin';
    const adminLastName =
      this.configService.get<string>('ADMIN_LAST_NAME') || 'User';

    // Skip initialization if credentials are not provided
    if (!adminEmail || !adminPassword) {
      this.logger.warn(
        'Admin credentials not provided. Skipping admin initialization.',
      );
      return;
    }

    try {
      // Check if admin user already exists
      const existingAdmin = await this.usersRepository.findByEmail(adminEmail);

      if (existingAdmin) {
        this.logger.log(`Admin user already exists: ${adminEmail}`);
        return;
      }

      // Hash the admin password
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      // Create admin user
      await this.usersRepository.create({
        email: adminEmail,
        firstName: adminFirstName,
        lastName: adminLastName,
        password: hashedPassword,
        role: 'ADMIN',
      });

      this.logger.log(`✓ Admin user initialized successfully: ${adminEmail}`);
    } catch (error) {
      this.logger.error(
        `Failed to initialize admin user: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Don't throw - allow application to start even if admin initialization fails
    }
  }
}
