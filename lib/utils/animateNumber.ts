// Utility to animate a number from start to end value
export function animateNumber(
  start: number,
  end: number,
  duration: number,
  onUpdate: (value: number) => void,
  onComplete?: () => void
) {
  const startTime = Date.now()
  const difference = end - start

  const animate = () => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    
    // Easing function (ease-out cubic for smoother animation)
    const eased = 1 - Math.pow(1 - progress, 3)
    
    const current = start + (difference * eased)
    onUpdate(current) // No rounding for smoother animation
    
    if (progress < 1) {
      requestAnimationFrame(animate)
    } else {
      onUpdate(end) // Ensure final value is exact
      onComplete?.()
    }
  }

  requestAnimationFrame(animate)
}

