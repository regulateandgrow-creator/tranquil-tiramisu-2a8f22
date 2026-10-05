import { Greeting } from "@/components/dashboard/Greeting";
import { IntelligenceHero } from "@/components/dashboard/IntelligenceHero";
import { MyBodyToday } from "@/components/dashboard/MyBodyToday";
import { MyFoundation } from "@/components/dashboard/MyFoundation";
import { WorksForMe } from "@/components/dashboard/WorksForMe";
import { LifeIsLifing } from "@/components/dashboard/LifeIsLifing";
import { GrownThought } from "@/components/dashboard/GrownThought";
import { demoUser } from "@/lib/demo/user";
import { demoFoundation } from "@/lib/demo/foundation";
import { demoInsights } from "@/lib/demo/insights";

export default function HomePage() {
  return (
    <div className="space-y-10 lg:space-y-12">
      <Greeting firstName={demoUser.firstName} />

      <IntelligenceHero />

      <MyBodyToday />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <MyFoundation pillars={demoFoundation} />
        </div>
        <div className="xl:col-span-2 xl:self-start xl:pt-[4.6rem]">
          <GrownThought />
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <WorksForMe insights={demoInsights} />
        <LifeIsLifing />
      </div>
    </div>
  );
}
