export default function Loading() {
  return (
    <div className="px-6 py-8 max-w-4xl mx-auto animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded-lg mb-8" />
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
      </div>
      <div className="h-64 bg-gray-200 rounded-xl" />
    </div>
  )
}
