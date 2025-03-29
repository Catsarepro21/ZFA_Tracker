import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus } from "lucide-react";
import { Volunteer } from "@shared/schema";
import { cn } from "@/lib/utils";

interface VolunteerSidebarProps {
  volunteers: (Volunteer & { eventCount?: number })[];
  selectedVolunteer: Volunteer | null;
  onSelectVolunteer: (volunteer: Volunteer) => void;
  onAddVolunteer: () => void;
  isOpen: boolean;
  isLoading: boolean;
}

export default function VolunteerSidebar({
  volunteers,
  selectedVolunteer,
  onSelectVolunteer,
  onAddVolunteer,
  isOpen,
  isLoading
}: VolunteerSidebarProps) {
  return (
    <aside 
      className={cn(
        "bg-white w-64 shadow-lg flex flex-col h-full md:relative z-30",
        "transition-transform duration-300 ease-in-out",
        "fixed inset-y-0 left-0 md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="p-4 border-b">
        <h2 className="text-lg font-medium text-text-primary">Volunteers</h2>
      </div>
      
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-4 w-14" />
              </div>
            ))}
          </div>
        ) : volunteers.length > 0 ? (
          <ul className="volunteers-list">
            {volunteers.map((volunteer) => (
              <li 
                key={volunteer.id}
                className={cn(
                  "p-3 border-b hover:bg-background cursor-pointer transition-colors",
                  selectedVolunteer?.id === volunteer.id && "bg-background"
                )}
                onClick={() => onSelectVolunteer(volunteer)}
              >
                <div className="flex flex-col">
                  <div className="flex justify-between items-center">
                    <span>{volunteer.name}</span>
                    <span className="text-xs text-text-secondary">
                      {volunteer.eventCount || 0} events
                    </span>
                  </div>
                  {volunteer.email && (
                    <span className="text-xs text-text-secondary truncate max-w-[200px]">
                      {volunteer.email}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-6 text-center">
            <p className="text-sm text-text-secondary mb-4">No volunteers yet</p>
          </div>
        )}
      </ScrollArea>
      
      <div className="p-4 border-t mt-auto">
        <Button 
          onClick={onAddVolunteer}
          className="w-full bg-primary hover:bg-primary/90"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Don&apos;t See Your Name?
        </Button>
      </div>
    </aside>
  );
}
