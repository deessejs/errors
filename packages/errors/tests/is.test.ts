/**
 * Unit tests for the is() function.
 */

import { describe, it, expect } from 'vitest';
import { error, is } from '../src/index.js';

describe( 'is() function', () => {
  describe( 'basic usage', () => {
    it( 'should return true for exact match', () => {
      const TestError = error( { name: 'TestError' } );
      const err = TestError();

      expect( is( err, TestError ) ).toBe( true );
    } );

    it( 'should return false for non-matching types', () => {
      const ErrorA = error( { name: 'ErrorA' } );
      const ErrorB = error( { name: 'ErrorB' } );
      const err = ErrorA();

      expect( is( err, ErrorB ) ).toBe( false );
    } );

    it( 'should return false for null/undefined', () => {
      const TestError = error( { name: 'TestError' } );

      expect( is( null, TestError ) ).toBe( false );
      expect( is( undefined, TestError ) ).toBe( false );
    } );
  } );

  describe( 'single inheritance', () => {
    it( 'should return true for child error types', () => {
      const AppError = error( { name: 'AppError' } );
      const ValidationError = error( {
        name: 'ValidationError',
        inherits: AppError,
      } );
      const err = ValidationError();

      expect( is( err, ValidationError ) ).toBe( true );
      expect( is( err, AppError ) ).toBe( true );
    } );

    it( 'should return false for parent when checking child', () => {
      const AppError = error( { name: 'AppError' } );
      const ValidationError = error( {
        name: 'ValidationError',
        inherits: AppError,
      } );
      const err = AppError();

      expect( is( err, ValidationError ) ).toBe( false );
      expect( is( err, AppError ) ).toBe( true );
    } );
  } );

  describe( 'multiple inheritance', () => {
    it( 'should return true for errors inheriting from multiple parents', () => {
      const NetworkError = error( { name: 'NetworkError' } );
      const StorageError = error( { name: 'StorageError' } );
      const CombinedError = error( {
        name: 'CombinedError',
        inherits: [NetworkError, StorageError],
      } );
      const err = CombinedError();

      expect( is( err, CombinedError ) ).toBe( true );
      expect( is( err, NetworkError ) ).toBe( true );
      expect( is( err, StorageError ) ).toBe( true );
    } );

    it( 'should return true in deep inheritance chains', () => {
      const AppError = error( { name: 'AppError' } );
      const DomainError = error( {
        name: 'DomainError',
        inherits: AppError,
      } );
      const ValidationError = error( {
        name: 'ValidationError',
        inherits: DomainError,
      } );
      const err = ValidationError();

      expect( is( err, ValidationError ) ).toBe( true );
      expect( is( err, DomainError ) ).toBe( true );
      expect( is( err, AppError ) ).toBe( true );
    } );
  } );

  describe( 'native errors', () => {
    it( 'should work with SyntaxError', () => {
      try {
        JSON.parse( 'invalid' );
      } catch ( err ) {
        expect( is( err, SyntaxError ) ).toBe( true );
        expect( is( err, Error ) ).toBe( true );
      }
    } );

    it( 'should work with TypeError', () => {
      try {
        const fn: unknown = null;
        ( fn as { method: unknown } ).method();
      } catch ( err ) {
        expect( is( err, TypeError ) ).toBe( true );
      }
    } );

    it( 'should return false for native when checking custom', () => {
      const CustomError = error( { name: 'CustomError' } );

      try {
        JSON.parse( 'invalid' );
      } catch ( err ) {
        expect( is( err, CustomError ) ).toBe( false );
      }
    } );
  } );

  describe( 'edge cases', () => {
    it( 'should handle non-error values', () => {
      const TestError = error( { name: 'TestError' } );

      expect( is( 'string', TestError ) ).toBe( false );
      expect( is( 123, TestError ) ).toBe( false );
      expect( is( {}, TestError ) ).toBe( false );
      expect( is( [], TestError ) ).toBe( false );
    } );

    it( 'should handle native errors without factory marker', () => {
      const TestError = error( { name: 'TestError' } );
      const nativeErr = new Error( 'test' );

      expect( is( nativeErr, TestError ) ).toBe( false );
    } );

    it( 'should return false for native errors when checking factory', () => {
      const TestError = error( { name: 'TestError' } );
      const nativeErr = new Error( 'test' );

      expect( is( nativeErr, TestError ) ).toBe( false );
    } );
  } );

  describe( 'instanceof compatibility', () => {
    it( 'should return true for instanceof Error checks', () => {
      const TestError = error( { name: 'TestError' } );
      const err = TestError();

      expect( err instanceof Error ).toBe( true );
    } );

    it( 'should work alongside native instanceof', () => {
      const TestError = error( { name: 'TestError' } );
      const err = TestError();

      // Both should work
      expect( err instanceof Error ).toBe( true );
      expect( is( err, TestError ) ).toBe( true );
    } );
  } );
} );