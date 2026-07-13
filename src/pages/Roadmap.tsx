import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Compass } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PageLoader from "@/components/PageLoader";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type CurriculumTopic = Database["public"]["Tables"]["curriculum_topics"]["Row"];

interface SystemSection {
  system: string;
  topics: CurriculumTopic[];
}

/**
 * Level-0 rows name a system; level-1 rows are its topics. Sections follow the
 * order their level-0 row appears in, and a system with topics but no level-0
 * row still renders rather than silently vanishing.
 */
const groupBySystem = (rows: CurriculumTopic[]): SystemSection[] => {
  const sections = new Map<string, SystemSection>();

  for (const row of rows) {
    let section = sections.get(row.system);
    if (!section) {
      section = { system: row.system, topics: [] };
      sections.set(row.system, section);
    }
    if (row.level > 0) section.topics.push(row);
  }

  return [...sections.values()].filter((s) => s.topics.length > 0);
};

const Roadmap = () => {
  const navigate = useNavigate();

  const topicsQuery = useQuery({
    queryKey: ["curriculum-topics"],
    queryFn: async (): Promise<CurriculumTopic[]> => {
      const { data, error } = await supabase
        .from("curriculum_topics")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const sections = useMemo(
    () => groupBySystem(topicsQuery.data ?? []),
    [topicsQuery.data]
  );
  const topicCount = sections.reduce((n, s) => n + s.topics.length, 0);

  // "18 high-yield cardiovascular topics" while only one system ships; drops
  // the system name once there are several.
  const countLabel =
    sections.length === 1
      ? `${topicCount} high-yield ${sections[0].system.toLowerCase()} topics`
      : `${topicCount} high-yield topics across ${sections.length} systems`;

  const openSheetFor = (title: string) => {
    navigate("/sheets", { state: { topic: title } });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Roadmap
          </h1>
          <p className="text-sm text-muted-foreground">
            High-yield topics organized by system. Tap any topic to generate a
            study sheet.
          </p>
        </div>

        {topicsQuery.isLoading ? (
          <PageLoader context="sheets" />
        ) : topicsQuery.isError ? (
          <div className="rounded-lg border border-border bg-card p-6 text-center space-y-3">
            <p className="text-sm font-medium text-foreground">
              Couldn't load the roadmap
            </p>
            <p className="text-xs text-muted-foreground">
              Check your connection and try again.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => topicsQuery.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : sections.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-10 text-center space-y-2">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <Compass className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Curriculum loading soon
            </p>
            <p className="text-xs text-muted-foreground">
              High-yield topics are on their way. In the meantime, you can
              generate a sheet on any topic you like.
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {countLabel}
            </p>

            <Accordion
              type="multiple"
              defaultValue={sections.map((s) => s.system)}
              className="rounded-lg border border-border bg-card px-4"
            >
              {sections.map((section) => (
                <AccordionItem
                  key={section.system}
                  value={section.system}
                  className="border-b last:border-b-0"
                >
                  <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline">
                    <span className="flex items-center gap-2.5">
                      {section.system}
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {section.topics.length}
                      </span>
                    </span>
                  </AccordionTrigger>

                  <AccordionContent>
                    <div className="flex flex-wrap gap-2 pb-2">
                      {section.topics.map((topic) => (
                        <Button
                          key={topic.id}
                          variant="outline"
                          onClick={() => openSheetFor(topic.title)}
                          aria-label={`Generate a study sheet on ${topic.title}`}
                          className="h-auto min-h-[44px] whitespace-normal rounded-lg px-4 py-2.5 text-left text-[13px] font-medium leading-snug text-foreground hover:border-primary/50 hover:bg-accent"
                        >
                          {topic.title}
                        </Button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Roadmap;
