import { Metadata } from 'next'
import { MissionsFAQs } from '@/portal/components/Missions/MissionsFAQs'
import { Card } from '@/portal/components/Card'
import { MissionsList } from '@/portal/components/Missions/MissionsList'

const metadataContent = {
  title: 'Arbitrum Ecosystem Missions',
  description:
    'Welcome to Ecosystem Missions! Dive into Arbitrum — quests, campaigns, and community events await.'
}

// Generate server-side metadata for this page
export function generateMetadata(): Metadata {
  return {
    title: metadataContent.title,
    description: metadataContent.description,
    openGraph: {
      title: metadataContent.title,
      description: metadataContent.description,
      locale: 'en_US',
      type: 'website'
    },
    twitter: {
      card: 'summary_large_image',
      title: metadataContent.title,
      description: metadataContent.description
    }
  }
}

type OptionalMissionsPageParams = {
  searchParams: {
    project?: string
  }
}

export default function MissionsPage(params: OptionalMissionsPageParams) {
  return (
    <div className="relative mx-auto flex w-full max-w-[1000px] flex-col gap-[80px]">
      {/* Banner Image */}
      <Card className="relative top-0 flex w-full flex-col justify-end bg-[#1C4DDE] p-[45px] lg:h-[350px]">
        <div className="z-10 mx-auto w-full max-w-[700px]">
          Ecosystem Missions
        </div>

        <div className="z-10 my-8 text-2xl text-white/50 lg:text-4xl">
          <span className="text-white">Welcome to Ecosystem Missions!</span>
          <br />
          Dive into Arbitrum — quests, campaigns, and community events await.
        </div>
      </Card>

      {/* Missions */}
      <div className="flex flex-col gap-4">
        <MissionsList />
      </div>

      {/* FAQs */}
      <div className="relative z-10 flex flex-col gap-6">
        <MissionsFAQs />
      </div>
    </div>
  )
}
