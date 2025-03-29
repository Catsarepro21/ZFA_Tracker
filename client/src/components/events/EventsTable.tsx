import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Event } from "@shared/schema";
import { formatDate } from "@/lib/utils";
import { useState } from "react";

interface EventsTableProps {
  events: Event[];
  isLoading: boolean;
  isAdmin: boolean;
  onEdit: (event: Event) => void;
  onDelete: (eventId: number) => void;
}

type SortField = 'date' | 'event' | 'location' | 'hours';
type SortDirection = 'asc' | 'desc';

export default function EventsTable({
  events,
  isLoading,
  isAdmin,
  onEdit,
  onDelete
}: EventsTableProps) {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Default to descending for date, ascending for others
      setSortField(field);
      setSortDirection(field === 'date' ? 'desc' : 'asc');
    }
  };
  
  const sortedEvents = [...events].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'date':
        comparison = a.date.localeCompare(b.date);
        break;
      case 'event':
        comparison = a.event.localeCompare(b.event);
        break;
      case 'location':
        comparison = a.location.localeCompare(b.location);
        break;
      case 'hours':
        // Parse hours and minutes for proper numeric comparison
        const [aHours, aMinutes] = a.hours.split(':').map(Number);
        const [bHours, bMinutes] = b.hours.split(':').map(Number);
        const aTotalMinutes = aHours * 60 + aMinutes;
        const bTotalMinutes = bHours * 60 + bMinutes;
        comparison = aTotalMinutes - bTotalMinutes;
        break;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });
  if (isLoading) {
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Hours</TableHead>
              {isAdmin && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array(4).fill(0).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                {isAdmin && (
                  <TableCell>
                    <div className="flex space-x-2">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-6xl text-text-secondary mb-4">
          <Calendar className="mx-auto h-16 w-16 text-gray-300" />
        </div>
        <h3 className="text-lg font-medium text-text-primary mb-2">No Events Yet</h3>
        <p className="text-text-secondary mb-4">This volunteer doesn't have any recorded events.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead 
              className="cursor-pointer hover:text-primary transition-colors"
              onClick={() => handleSort('date')}
            >
              <div className="flex items-center gap-1">
                Date
                {sortField === 'date' && (
                  sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:text-primary transition-colors"
              onClick={() => handleSort('event')}
            >
              <div className="flex items-center gap-1">
                Event
                {sortField === 'event' && (
                  sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:text-primary transition-colors"
              onClick={() => handleSort('location')}
            >
              <div className="flex items-center gap-1">
                Location
                {sortField === 'location' && (
                  sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:text-primary transition-colors"
              onClick={() => handleSort('hours')}
            >
              <div className="flex items-center gap-1">
                Hours
                {sortField === 'hours' && (
                  sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </TableHead>
            {isAdmin && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedEvents.map((event) => (
            <TableRow key={event.id} className="hover:bg-background">
              <TableCell>{formatDate(event.date)}</TableCell>
              <TableCell>{event.event}</TableCell>
              <TableCell>{event.location}</TableCell>
              <TableCell>{event.hours}</TableCell>
              {isAdmin && (
                <TableCell>
                  <div className="flex space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-primary hover:text-primary/80 hover:bg-primary/10"
                      onClick={() => onEdit(event)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                      onClick={() => onDelete(event.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
