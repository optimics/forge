import { CodeError } from './errors.js'
import { ChildProcess, spawn } from 'child_process'

export const log = (
  message: string,
  { clear = false, padding = 0, newline = true } = {},
) => {
  if (clear) {
    process.stdout.write('\r')
  }
  if (padding) {
    process.stdout.write(Array(padding).fill(' ').join(''))
  }
  process.stdout.write(message)
  if (newline) {
    process.stdout.write('\n')
  }
}

type ExitCall = () => void
interface ProcessConfig {
  inst?: ChildProcess
}

const SIGINT = 2
const SIGTERM = 15

function coverProcess(cfg: ProcessConfig): ExitCall {
  const terminate = (signal: number) => () => {
    if (cfg.inst) {
      cfg.inst.kill(signal)
    }
  }
  const exit = terminate(SIGINT)
  const term = terminate(SIGTERM)
  const int = terminate(SIGINT)
  process.on('exit', exit)
  process.on('SIGTERM', term)
  process.on('SIGINT', int)
  return () => {
    process.removeListener('exit', exit)
    process.removeListener('SIGTERM', term)
    process.removeListener('SIGINT', int)
  }
}

export async function execute(
  cmd: string,
  args: string[],
  options?: Record<string, unknown>,
): Promise<void> {
  return await new Promise((resolve, reject) => {
    const cfg: ProcessConfig = {}
    const clear = coverProcess(cfg)
    let stderr = ''

    const inst = spawn(cmd, args, options)
    cfg.inst = inst
    inst.stderr.on('data', (data: string) => {
      stderr += data
    })
    inst.on('close', (code: number | null) => {
      clear()
      if (code === 0) {
        resolve()
      } else {
        const err = new CodeError(
          `The npm command "${cmd} ${args.join(' ')}" failed`,
        )
        err.code = code
        err.stack = err.stack += stderr
        reject(err)
      }
    })
    inst.on('error', (e: Error) => {
      e.stack = e.stack += stderr
      reject(e)
    })
  })
}
