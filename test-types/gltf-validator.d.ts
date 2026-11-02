// For skinned-glb.test.ts (a dev dependency; not in the shipped build).
// The Khronos validator (npm gltf-validator) ships no types; this is the part
// the harness uses. https://github.com/KhronosGroup/glTF-Validator
declare module 'gltf-validator' {
  export interface ValidationMessage {
    code: string
    message: string
    /** 0 error, 1 warning, 2 info, 3 hint. */
    severity: 0 | 1 | 2 | 3
    pointer?: string
    offset?: number
  }
  export interface ValidationReport {
    uri?: string
    validatorVersion: string
    issues: {
      numErrors: number
      numWarnings: number
      numInfos: number
      numHints: number
      messages: ValidationMessage[]
      truncated: boolean
    }
    info?: Record<string, unknown>
  }
  export interface ValidationOptions {
    uri?: string
    format?: 'glb' | 'gltf'
    maxIssues?: number
    ignoredIssues?: string[]
    onlyIssues?: string[]
    severityOverrides?: Record<string, number>
    externalResourceFunction?: (uri: string) => Promise<Uint8Array>
  }
  export function validateBytes(
    data: Uint8Array,
    options?: ValidationOptions
  ): Promise<ValidationReport>
  export function version(): string
}
