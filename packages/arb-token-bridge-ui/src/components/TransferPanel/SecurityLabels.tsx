import {
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

export function SecurityGuaranteed() {
  return (
    <div className="flex">
      <div className="bg-lime-dark text-lime flex h-fit items-center space-x-1 rounded p-2 text-xs">
        <CheckCircleIcon height={16} />
        <span>Security guaranteed by Ethereum</span>
      </div>
    </div>
  )
}

export function SecurityNotGuaranteed() {
  return (
    <div className="flex">
      <div className="bg-orange-dark text-orange flex h-fit items-center space-x-1 rounded p-2 text-xs">
        <ExclamationTriangleIcon height={16} />
        <span>Security not guaranteed by Arbitrum</span>
      </div>
    </div>
  )
}
