/**
 * @fileoverview `Opaque<Type, Token>` constructs a unique type which is a subset of Type with a
 * specified unique token Token. It means that base type cannot be assigned to unique type by accident.
 * Good examples of opaque types include:
 * - JWTs or other tokens - these are special kinds of string used for authorization purposes.
 *   If your app uses multiple types of tokens each should be a separate opaque type to avoid confusion
 * - Specific currencies - amount of different currencies shouldn't be mixed
 * - Bitcoin address - special kind of string
 *
 * `type GithubAccessToken = Opaque<string, "GithubAccessToken">;`
 * `type USD = Opaque<number, "USD">;`
 * `type PositiveNumber = Opaque<number, "PositiveNumber">;
 *
 * More: https://github.com/ts-essentials/ts-essentials/blob/master/lib/opaque/README.md
 *
 * Copyright (c) 2018-2019 Chris Kaczor (github.com/krzkaczor)
 */

type StringLiteral<Type> = Type extends string ? (string extends Type ? never : Type) : never;

declare const __OPAQUE_TYPE__: unique symbol;

export type WithOpaque<Token extends string> = {
  readonly [__OPAQUE_TYPE__]: Token;
};

export type Opaque<Type, Token extends string> = Token extends StringLiteral<Token> ? Type & WithOpaque<Token> : never;
