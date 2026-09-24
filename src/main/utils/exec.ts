import { exec } from 'node:child_process'
import { promisify } from 'node:util'

/**
 * Shared promisified exec utility for child processes in M-Toolbox
 */
export const execAsync = promisify(exec)
