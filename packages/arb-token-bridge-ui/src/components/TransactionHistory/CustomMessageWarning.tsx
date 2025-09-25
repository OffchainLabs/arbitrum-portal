export const CustomMessageWarning = ({
  children
}: {
  children: React.ReactNode
}) => {
  return (
    <div className="border-orange-dark bg-orange text-orange-dark mt-4 flex items-center gap-1 rounded-md border p-2 text-sm lg:flex-nowrap">
      {children}
    </div>
  )
}
