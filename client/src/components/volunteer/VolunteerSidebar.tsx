import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus, X } from "lucide-react";
import { Volunteer } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();
  
  const handleSelectVolunteer = (volunteer: Volunteer) => {
    onSelectVolunteer(volunteer);
  };
  
  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/25 z-20"
          onClick={() => onSelectVolunteer(selectedVolunteer || volunteers[0])}
        />
      )}
      
      <aside 
        className={cn(
          "bg-white w-72 sm:w-64 shadow-lg flex flex-col h-full md:relative z-30",
          "transition-transform duration-300 ease-in-out",
          "fixed inset-y-0 left-0 md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-medium text-text-primary">Volunteers</h2>
          {isMobile && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => onSelectVolunteer(selectedVolunteer || volunteers[0])}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
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
          <ul className="volunteers-list pt-1">
            {volunteers.map((volunteer) => (
              <li 
                key={volunteer.id}
                className={cn(
                  "py-3 px-4 mb-1 hover:bg-background/80 cursor-pointer transition-colors rounded-md mx-1.5",
                  selectedVolunteer?.id === volunteer.id && "bg-background border-l-4 border-primary"
                )}
                onClick={() => onSelectVolunteer(volunteer)}
              >
                <div className="flex flex-col">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{volunteer.name}</span>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {volunteer.eventCount || 0} event{volunteer.eventCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {volunteer.email && (
                    <span className="text-xs text-text-secondary truncate max-w-[200px] mt-0.5">
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
    </>
  );
}
