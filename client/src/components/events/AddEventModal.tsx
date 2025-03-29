import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCurrentDate, isValidHoursFormat } from "@/lib/utils";
import { Event } from "@shared/schema";
import { useIsMobile } from "@/hooks/use-mobile";

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Event | Omit<Event, 'id'>) => Promise<void>;
  event?: Event | null;
}

export default function AddEventModal({
  isOpen,
  onClose,
  onSave,
  event
}: AddEventModalProps) {
  const [eventName, setEventName] = useState("");
  const [location, setLocation] = useState("");
  const [hours, setHours] = useState("");
  const [date, setDate] = useState(getCurrentDate());
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isMobile = useIsMobile();
  const { toast } = useToast();

  // Reset form when modal opens or selected event changes
  useEffect(() => {
    if (event) {
      setEventName(event.event);
      setLocation(event.location);
      setHours(event.hours);
      setDate(event.date);
    } else {
      setEventName("");
      setLocation("");
      setHours("");
      setDate(getCurrentDate());
    }
  }, [event, isOpen]);

  const handleUseCurrentDate = () => {
    setDate(getCurrentDate());
  };

  const validateHours = (): boolean => {
    if (!isValidHoursFormat(hours)) {
      toast({
        title: "Invalid Format",
        description: "Hours must be in HH:MM format (e.g. 2:30)",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!eventName.trim() || !location.trim() || !hours.trim() || !date.trim()) {
      toast({
        title: "Error",
        description: "All fields are required",
        variant: "destructive"
      });
      return;
    }
    
    if (!validateHours()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const eventData = {
        ...(event ? { id: event.id } : {}),
        volunteerId: event?.volunteerId || 0, // This will be set properly by the parent component
        event: eventName.trim(),
        location: location.trim(),
        hours: hours.trim(),
        date: date.trim()
      };
      
      await onSave(eventData as Event);
      
      toast({
        title: "Success",
        description: event ? "Event updated successfully" : "Event added successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save event",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`sm:max-w-md ${isMobile ? 'p-4 sm:p-6' : ''}`}>
        <DialogHeader className={isMobile ? 'pb-2' : ''}>
          <DialogTitle>{event ? "Edit Event" : "Add New Event"}</DialogTitle>
          {isMobile && (
            <DialogDescription className="text-xs">
              Record volunteer hours for tracking and reporting.
            </DialogDescription>
          )}
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 py-2 sm:py-4">
          <div className="space-y-2">
            <Label htmlFor="event-name">Event Name</Label>
            <Input
              id="event-name"
              placeholder="What did you volunteer for?"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="event-location">Location</Label>
            <Input
              id="event-location"
              placeholder="Where did the event take place?"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="event-hours">Hours (Hours:Minutes)</Label>
            <Input
              id="event-hours"
              placeholder="e.g. 2:30"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              disabled={isSubmitting}
              required
            />
            <p className="text-xs text-muted-foreground">Format: Hours:Minutes (e.g. 2:30)</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="event-date">Date</Label>
            <Input
              id="event-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-primary hover:text-primary/80"
            onClick={handleUseCurrentDate}
            disabled={isSubmitting}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Use Current Date
          </Button>
          
          <DialogFooter className={`pt-2 sm:pt-4 ${isMobile ? 'flex-col gap-2 sm:flex-row' : ''}`}>
            {isMobile ? (
              <>
                <Button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {event ? "Update Event" : "Save Event"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="w-full"
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={isSubmitting}
                >
                  {event ? "Update Event" : "Save Event"}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
