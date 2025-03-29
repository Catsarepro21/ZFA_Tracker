import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Volunteer, InsertVolunteer } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface VolunteerWithCount extends Volunteer {
  eventCount: number;
}

export function useVolunteers() {
  const queryClient = useQueryClient();
  
  const {
    data: volunteers,
    isLoading,
    error,
    refetch
  } = useQuery<VolunteerWithCount[]>({
    queryKey: ['/api/volunteers'],
  });
  
  const createMutation = useMutation({
    mutationFn: async (newVolunteer: InsertVolunteer) => {
      const response = await apiRequest('POST', '/api/volunteers', newVolunteer);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/volunteers'] });
    }
  });
  
  const addVolunteer = async (name: string) => {
    await createMutation.mutateAsync({ name });
  };
  
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<InsertVolunteer> }) => {
      const response = await apiRequest('PATCH', `/api/volunteers/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/volunteers'] });
    }
  });
  
  const updateVolunteerGoal = async (id: number, hourGoal: string) => {
    await updateMutation.mutateAsync({ id, data: { hourGoal } });
    // Also invalidate volunteer details if they're loaded
    queryClient.invalidateQueries({ queryKey: [`/api/volunteers/${id}`] });
  };
  
  return {
    volunteers,
    isLoading,
    error,
    addVolunteer,
    updateVolunteerGoal,
    refetch
  };
}
