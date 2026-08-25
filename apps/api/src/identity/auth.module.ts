import { Module } from '@nestjs/common';

import {
  NoopAuthAuditSink,
  type AuthAuditSink,
  type AuthClock,
  type AuthConfig,
  type AuthStore,
  type AuthTokenGenerator,
  type IdentityProvider,
  secureAuthTokenGenerator,
  systemAuthClock,
  UnconfiguredIdentityProvider,
} from './auth.types';
import { AuthController } from './auth.controller';
import { AuthService } from './auth-service';
import { UnconfiguredAuthStore } from './auth-store';

export const AUTH_STORE = Symbol('AUTH_STORE');
export const IDENTITY_PROVIDER = Symbol('IDENTITY_PROVIDER');
export const AUTH_AUDIT_SINK = Symbol('AUTH_AUDIT_SINK');
export const AUTH_CLOCK = Symbol('AUTH_CLOCK');
export const AUTH_TOKEN_GENERATOR = Symbol('AUTH_TOKEN_GENERATOR');
export const AUTH_CONFIG = Symbol('AUTH_CONFIG');

export const DEFAULT_AUTH_CONFIG: AuthConfig = {
  // The application session is intentionally short-lived. The offline field
  // lease is a separate D-025 concern and is not represented by this value.
  sessionTtlMs: 15 * 60 * 1000,
};

@Module({
  controllers: [AuthController],
  providers: [
    { provide: AUTH_STORE, useClass: UnconfiguredAuthStore },
    { provide: IDENTITY_PROVIDER, useClass: UnconfiguredIdentityProvider },
    { provide: AUTH_AUDIT_SINK, useClass: NoopAuthAuditSink },
    { provide: AUTH_CLOCK, useValue: systemAuthClock },
    { provide: AUTH_TOKEN_GENERATOR, useValue: secureAuthTokenGenerator },
    { provide: AUTH_CONFIG, useValue: DEFAULT_AUTH_CONFIG },
    {
      provide: AuthService,
      useFactory: (
        store: AuthStore,
        identityProvider: IdentityProvider,
        auditSink: AuthAuditSink,
        clock: AuthClock,
        tokenGenerator: AuthTokenGenerator,
        config: AuthConfig,
      ) =>
        new AuthService({
          store,
          identityProvider,
          auditSink,
          clock,
          tokenGenerator,
          config,
        }),
      inject: [
        AUTH_STORE,
        IDENTITY_PROVIDER,
        AUTH_AUDIT_SINK,
        AUTH_CLOCK,
        AUTH_TOKEN_GENERATOR,
        AUTH_CONFIG,
      ],
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
