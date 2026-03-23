import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <p className="text-xl text-foreground mb-2">Page not found</p>
        <p className="text-muted-foreground mb-8">The page you're looking for doesn't exist.</p>
        <Link href="/dashboard">
          <Button className="bg-primary hover:bg-primary/90">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}
