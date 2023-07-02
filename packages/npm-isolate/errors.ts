export class CodeError extends Error {
  code: number | null = null
}

export class PrivatePackageError extends Error {
  isPrivate = true
}

export class PackageDoesNotExistError extends Error {
  code: number | null

  static fromError(error: CodeError): PackageDoesNotExistError {
    const result = new this(error.message, error.code)
    result.stack = error.stack
    return result
  }

  constructor(message: string, code: number | null) {
    super(message)
    this.code = code
  }
}
