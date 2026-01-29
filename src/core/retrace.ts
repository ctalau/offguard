import { ReTrace } from './ReTrace';

/**
 * Main retrace function
 *
 * De-obfuscates a stack trace using a ProGuard mapping file.
 *
 * @param stackTrace The obfuscated stack trace string
 * @param mapping The ProGuard mapping file content
 * @returns The de-obfuscated stack trace
 */
export function retrace(stackTrace: string, mapping: string): string {
  const retracer = new ReTrace();
  return retracer.retrace(stackTrace, mapping);
}
