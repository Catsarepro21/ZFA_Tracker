import { useState, useEffect } from "react";
import VolunteerSidebar from "@/components/volunteer/VolunteerSidebar";
import AddVolunteerModal from "@/components/volunteer/AddVolunteerModal";
import EventsTable from "@/components/events/EventsTable";
import AddEventModal from "@/components/events/AddEventModal";
import AdminModal from "@/components/admin/AdminModal";
import AdminPanel from "@/components/admin/AdminPanel";
import GoogleSyncModal from "@/components/admin/GoogleSyncModal";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import { useVolunteers } from "@/hooks/useVolunteers";
import { useEvents } from "@/hooks/useEvents";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Menu, User, PlusCircle, Settings, LogOut, ChevronLeft } from "lucide-react";
import { Volunteer, Event } from "@shared/schema";
import { calculateTotalHours } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);
  const [isAddVolunteerModalOpen, setIsAddVolunteerModalOpen] = useState(false);
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<Event | null>(null);
  const [eventToDelete, setEventToDelete] = useState<number | null>(null);

  const isMobile = useIsMobile();
  const { isAdmin, verifyAdmin, logout } = useAdmin();
  const { volunteers, isLoading: volunteersLoading, refetch: refetchVolunteers } = useVolunteers();
  const { 
    events, 
    isLoading: eventsLoading, 
    refetch: refetchEvents,
    addEvent,
    updateEvent,
    deleteEvent 
  } = useEvents(selectedVolunteer?.id);

  // Select first volunteer on initial load
  useEffect(() => {
    if (!selectedVolunteer && volunteers && volunteers.length > 0) {
      setSelectedVolunteer(volunteers[0]);
    }
  }, [volunteers, selectedVolunteer]);

  // Close sidebar on mobile when a volunteer is selected
  useEffect(() => {
    if (isMobile && selectedVolunteer) {
      setSidebarOpen(false);
    }
  }, [selectedVolunteer, isMobile]);

  const handleAddEvent = async (event: Omit<Event, 'id'>) => {
    if (selectedVolunteer) {
      await addEvent({
        ...event,
        volunteerId: selectedVolunteer.id
      });
      setIsAddEventModalOpen(false);
      refetchEvents();
    }
  };

  const handleEditEvent = async (event: Event) => {
    await updateEvent(event);
    setEventToEdit(null);
    setIsAddEventModalOpen(false);
    refetchEvents();
  };

  const handleConfirmDelete = async () => {
    if (eventToDelete !== null) {
      await deleteEvent(eventToDelete);
      setIsDeleteModalOpen(false);
      setEventToDelete(null);
      refetchEvents();
    }
  };

  const openEditModal = (event: Event) => {
    setEventToEdit(event);
    setIsAddEventModalOpen(true);
  };

  const openDeleteModal = (eventId: number) => {
    setEventToDelete(eventId);
    setIsDeleteModalOpen(true);
  };

  const totalHours = events ? calculateTotalHours(events) : '0:00';

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="bg-primary text-white p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden mr-2 text-white hover:bg-primary/80"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-medium">Volunteer Tracker</h1>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button 
              variant="destructive" 
              size="sm"
              className="text-white"
              onClick={() => logout()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          )}
          <Button 
            variant="secondary" 
            className="bg-secondary hover:bg-secondary/90 text-white"
            onClick={() => isAdmin ? setIsAdminPanelOpen(true) : setIsAdminModalOpen(true)}
          >
            <Settings className="mr-2 h-4 w-4" />
            Admin
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <VolunteerSidebar
          volunteers={(volunteers || []).sort((a, b) => a.name.localeCompare(b.name))}
          selectedVolunteer={selectedVolunteer}
          onSelectVolunteer={setSelectedVolunteer}
          onAddVolunteer={() => setIsAddVolunteerModalOpen(true)}
          isOpen={sidebarOpen}
          isLoading={volunteersLoading}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6">
          {selectedVolunteer ? (
            <div className="bg-white rounded-lg shadow-md">
              {/* Volunteer Header */}
              <div className="p-6 border-b flex flex-col gap-4">
                <div className="flex items-center md:hidden">
                  <Button 
                    variant="outline"
                    size="sm"
                    className="mr-2"
                    onClick={() => {
                      setSelectedVolunteer(null);
                      setSidebarOpen(true);
                    }}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                </div>
                <div className="flex flex-wrap justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-medium text-text-primary">
                      {selectedVolunteer.name}
                    </h2>
                    <p className="text-text-secondary mt-1">
                      Total Hours: <span className="font-medium">{totalHours}</span> • 
                      Events: <span className="font-medium">{events?.length || 0}</span>
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      setEventToEdit(null);
                      setIsAddEventModalOpen(true);
                    }}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Event
                  </Button>
                </div>
              </div>

              {/* Events Table */}
              <EventsTable
                events={events || []}
                isLoading={eventsLoading}
                isAdmin={isAdmin}
                onEdit={openEditModal}
                onDelete={openDeleteModal}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8">
              <User className="h-16 w-16 text-primary/30 mb-4" />
              <h2 className="text-xl font-medium mb-2">No Volunteer Selected</h2>
              <p className="text-text-secondary mb-4 text-center">
                Select a volunteer from the sidebar or add a new volunteer to get started.
              </p>
              <Button 
                onClick={() => setIsAddVolunteerModalOpen(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Volunteer
              </Button>
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <AddVolunteerModal
        isOpen={isAddVolunteerModalOpen}
        onClose={() => setIsAddVolunteerModalOpen(false)}
        onAddVolunteer={async (name) => {
          await refetchVolunteers();
          setIsAddVolunteerModalOpen(false);
        }}
      />

      <AddEventModal
        isOpen={isAddEventModalOpen}
        onClose={() => {
          setIsAddEventModalOpen(false);
          setEventToEdit(null);
        }}
        onSave={eventToEdit ? handleEditEvent : handleAddEvent}
        event={eventToEdit}
      />

      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onLogin={(success) => {
          setIsAdminModalOpen(false);
          if (success) {
            verifyAdmin(true);
            setIsAdminPanelOpen(true);
          }
        }}
      />

      <AdminPanel
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
        onSyncClick={() => {
          setIsAdminPanelOpen(false);
          setIsSyncModalOpen(true);
        }}
      />

      <GoogleSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
