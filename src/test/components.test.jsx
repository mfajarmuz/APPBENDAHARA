import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'

describe('UI Components', () => {
  it('renders Button correctly', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click Me</Button>)
    const btn = screen.getByText('Click Me')
    expect(btn).toBeInTheDocument()
    fireEvent.click(btn)
    expect(handleClick).toHaveBeenCalledOnce()
  })

  it('renders Card with children', () => {
    render(
      <Card>
        <div data-testid="card-child">Hello Card</div>
      </Card>
    )
    expect(screen.getByTestId('card-child')).toBeInTheDocument()
  })

  it('renders Badge with different variants', () => {
    const { rerender } = render(<Badge variant="success">Active</Badge>)
    expect(screen.getByText('Active')).toHaveClass('bg-emerald-100')

    rerender(<Badge variant="danger">Error</Badge>)
    expect(screen.getByText('Error')).toHaveClass('bg-red-100')
  })
})
