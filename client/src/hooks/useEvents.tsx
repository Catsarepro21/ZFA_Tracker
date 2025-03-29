import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Event, InsertEvent } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface VolunteerDetails {
  volunteer: {
    id: number;
    name: string;
    email?: string | null;
    hourGoal?: string | null;
  };
  events: Event[];
  stats: {
    totalEvents: number;
    totalHours: string;
    progressPercentage: number;
    hourGoal: string | null;
  };
}

export function useEvents(volunteerId?: number) {
  const queryClient = useQueryClient();
  
  const {
    data: volunteerDetails,
    isLoading,
    error,
    refetch
  } = useQuery<VolunteerDetails>({
    queryKey: volunteerId ? [`/api/volunteers/${volunteerId}`] : undefined,
    enabled: !!volunteerId,
  });
  
  const createMutation = useMutation({
    mutationFn: async (newEvent: InsertEvent) => {
      const response = await apiRequest('POST', '/api/events', newEvent);
      return response.json();
    },
    onSuccess: () => {
      if (volunteerId) {
        queryClient.invalidateQueries({ queryKey: [`/api/volunteers/${volunteerId}`] });
      }
    }
  });
  
  const updateMutation = useMutation({
    mutationFn: async (event: Event) => {
      const response = await apiRequest('PUT', `/api/events/${event.id}`, {
        volunteerId: event.volunteerId,
        event: event.event,
        location: event.location,
        hours: event.hours,
        date: event.date
      });
      return response.json();
    },
    onSuccess: () => {
      if (volunteerId) {
        queryClient.invalidateQueries({ queryKey: [`/api/volunteers/${volunteerId}`] });
      }
    }
  });
  
  const deleteMutation = useMutation({
    mutationFn: async (eventId: number) => {
      await apiRequest('DELETE', `/api/events/${eventId}`, { password: localStorage.getItem('adminPassword') || '' });
    },
    onSuccess: () => {
      if (volunteerId) {
        queryClient.invalidateQueries({ queryKey: [`/api/volunteers/${volunteerId}`] });
      }
    }
  });
  
  const addEvent = async (event: InsertEvent) => {
    await createMutation.mutateAsync(event);
  };
  
  const updateEvent = async (event: Event) => {
    await updateMutation.mutateAsync(event);
  };
  
  const deleteEvent = async (eventId: number) => {
    await deleteMutation.mutateAsync(eventId);
  };
  
  return {
    events: volunteerDetails?.events || [],
    stats: volunteerDetails?.stats,
    isLoading,
    error,
    addEvent,
    updateEvent,
    deleteEvent,
    refetch
  };
}
