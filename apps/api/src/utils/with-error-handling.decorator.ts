import { HttpException, Logger } from '@nestjs/common';

export const WithErrorHandling = (
  serviceName: string,
  methodName: string,
  errorMessage?: string | ((...args: unknown[]) => string),
  onError?: (error: unknown, context: { args: unknown[] }) => Promise<void>,
) => {
  // Create a logger instance for this service
  const logger = new Logger(serviceName);

  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: unknown, ...args: unknown[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        const msg = `${serviceName}: Error in ${methodName}: ${
          typeof errorMessage === 'function'
            ? errorMessage(...args)
            : errorMessage
              ? errorMessage + ', '
              : ''
        } ${error}`;
        logger.error(msg);
        if (onError) {
          await onError.call(this, error, { args });
        }
        // Preserve NestJS HttpException types (includes all HTTP exceptions)
        if (error instanceof HttpException) {
          throw error;
        }
        // For non-HTTP errors, wrap in a generic Error
        throw new Error(msg);
      }
    };

    return descriptor;
  };
};
