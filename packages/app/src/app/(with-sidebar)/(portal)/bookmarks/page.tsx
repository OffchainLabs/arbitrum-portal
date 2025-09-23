import dynamic from 'next/dynamic'

const MyProjects = dynamic(
  () => import('@/portal/components/MyProjects').then(mod => mod.MyProjects),
  {
    ssr: false
  }
)

export default function Page() {
  return <MyProjects />
}
