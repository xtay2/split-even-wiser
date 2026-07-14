import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <div className="text-center py-5">
      <h1 className="h4">Page not found</h1>
      <Link to="/groups">Back to groups</Link>
    </div>
  )
}
