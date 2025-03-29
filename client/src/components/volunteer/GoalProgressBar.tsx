import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { AwardIcon, PencilIcon } from 'lucide-react';
import { isValidHoursFormat } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface GoalProgressBarProps {
  totalHours: string;
  hourGoal: string | null;
  progressPercentage: number;
  onUpdateGoal: (hourGoal: string) => Promise<void>;
  isAdmin: boolean;
}

export default function GoalProgressBar({ 
  totalHours, 
  hourGoal, 
  progressPercentage,
  onUpdateGoal,
  isAdmin
}: GoalProgressBarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [goal, setGoal] = useState(hourGoal || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleSaveGoal = async () => {
    if (!goal) {
      toast({
        title: "Hour goal cannot be empty",
        variant: "destructive"
      });
      return;
    }

    if (!isValidHoursFormat(goal)) {
      toast({
        title: "Invalid hour format",
        description: "Please use the format HH:MM, e.g. 20:30",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsUpdating(true);
      await onUpdateGoal(goal);
      setIsEditing(false);
      toast({
        title: "Goal updated",
        description: `Hour goal updated to ${goal}`,
      });
    } catch (error) {
      toast({
        title: "Failed to update goal",
        description: "An error occurred while updating the hour goal",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getProgressColor = () => {
    if (progressPercentage >= 100) return 'bg-green-500';
    if (progressPercentage >= 75) return 'bg-blue-500';
    if (progressPercentage >= 50) return 'bg-yellow-500';
    return 'bg-primary';
  };

  return (
    <div className="mt-2 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center mb-2">
        <AwardIcon className="h-5 w-5 text-primary mr-2" />
        <h3 className="font-medium text-lg">Volunteer Hour Goal</h3>
      </div>

      {isEditing ? (
        <div className="flex items-center gap-2 mt-2">
          <Input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Hour goal (HH:MM)"
            className="max-w-[150px]"
          />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsEditing(false)}
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button 
            size="sm" 
            onClick={handleSaveGoal}
            disabled={isUpdating}
          >
            Save
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm text-gray-600">
            {hourGoal ? (
              <span>
                <span className="font-semibold">{totalHours}</span> of <span className="font-semibold">{hourGoal}</span> hours completed
              </span>
            ) : (
              <span>No hour goal set yet</span>
            )}
          </div>
          {isAdmin && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 ml-2" 
              onClick={() => setIsEditing(true)}
            >
              <PencilIcon className="h-3.5 w-3.5 mr-1" />
              {hourGoal ? 'Edit Goal' : 'Set Goal'}
            </Button>
          )}
        </div>
      )}

      {hourGoal && !isEditing && (
        <>
          <Progress 
            value={progressPercentage > 100 ? 100 : progressPercentage} 
            className="h-2.5 mt-2"
            indicatorClassName={getProgressColor()}
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-500">0%</span>
            <span className="text-xs text-gray-500">{progressPercentage}%</span>
            <span className="text-xs text-gray-500">100%</span>
          </div>
        </>
      )}

      {!hourGoal && !isEditing && isAdmin && (
        <p className="text-sm text-gray-500 mt-1">
          Set a goal to track volunteer progress.
        </p>
      )}

      {!hourGoal && !isEditing && !isAdmin && (
        <p className="text-sm text-gray-500 mt-1">
          No hour goal has been set for this volunteer.
        </p>
      )}
    </div>
  );
}