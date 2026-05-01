import '@testing-library/jest-dom'
import { vi } from 'vitest'

global.window.api = {
  invoke: vi.fn(),
}
