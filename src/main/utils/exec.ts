import { exec, execFile } from 'node:child_process'
import { promisify } from 'node:util'

/**
 * Shared promisified exec utility for child processes in M-Toolbox
 */
export const execAsync = promisify(exec)

/**
 * Runs a program with an argument list and no shell, so arguments need no quoting
 */
export const execFileAsync = promisify(execFile)
