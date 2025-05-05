import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Modal from '@/components/ui/modal/Modal';
import Input from '@/components/form/input/InputField';
import Select from '@/components/form/Select';
import Button from '@/components/ui/button/Button';
import { JobListing } from '@/types/job';

const jobSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  department: z.string().min(2, 'Department is required'),
  location: z.string().min(2, 'Location is required'),
  type: z.enum(['full-time', 'part-time', 'contract', 'internship']),
  experience: z.string().min(2, 'Experience requirements are required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  salary: z.object({
    min: z.number()
      .min(0, 'Minimum salary cannot be negative')
      .transform(val => Math.round(val)), // Round to whole numbers
    max: z.number()
      .min(0, 'Maximum salary cannot be negative')
      .transform(val => Math.round(val)), // Round to whole numbers
  }).refine(data => data.max >= data.min, {
    message: "Maximum salary must be greater than or equal to minimum salary",
    path: ["max"], // Show error on max field
  }),
  deadline: z.string().min(1, 'Deadline is required'),
  status: z.enum(['active', 'draft']).default('draft')
});

type JobFormData = z.infer<typeof jobSchema>;

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: JobFormData) => void;
  onUpdate: (data: JobFormData) => void;
  initialData: JobListing | null;
}

export default function CreateJobModal({ 
  isOpen, 
  onClose, 
  onCreate, 
  onUpdate,
  initialData 
}: CreateJobModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      title: '',
      department: '',
      location: '',
      type: 'full-time',
      experience: '',
      description: '',
      salary: {
        min: 0,
        max: 0,
      },
      deadline: new Date().toISOString().split('T')[0],
      status: 'draft'
    }
  });

  // Watch salary values for real-time validation
  const minSalary = watch('salary.min');
  const maxSalary = watch('salary.max');

  useEffect(() => {
    if (initialData) {
      setValue('title', initialData.title);
      setValue('department', initialData.department);
      setValue('location', initialData.location);
      setValue('type', initialData.type);
      setValue('experience', initialData.experience);
      setValue('description', initialData.description);
      setValue('salary.min', initialData.salary.min);
      setValue('salary.max', initialData.salary.max);
      setValue('deadline', initialData.deadline);
      setValue('status', initialData.status);
    }
  }, [initialData, setValue]);

  const onSubmit = async (data: JobFormData) => {
    try {
      setIsSubmitting(true);
      if (initialData) {
        await onUpdate(data);
      } else {
        await onCreate(data);
      }
      reset();
      onClose();
    } catch (error) {
      console.error('Error saving job:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Edit Job" : "Create New Job"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Job Title"
          {...register('title')}
          error={errors.title?.message}
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Department"
            {...register('department')}
            options={[
              { value: 'engineering', label: 'Engineering' },
              { value: 'marketing', label: 'Marketing' },
              { value: 'sales', label: 'Sales' }
            ]}
            error={errors.department?.message}
          />

          <Select
            label="Job Type"
            {...register('type')}
            options={[
              { value: 'full-time', label: 'Full Time' },
              { value: 'part-time', label: 'Part Time' },
              { value: 'contract', label: 'Contract' },
              { value: 'internship', label: 'Internship' }
            ]}
            error={errors.type?.message}
          />
        </div>

        <Input
          label="Location"
          {...register('location')}
          error={errors.location?.message}
        />

        <Input
          label="Experience Required"
          {...register('experience')}
          error={errors.experience?.message}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            type="number"
            label="Min Salary"
            {...register('salary.min', { 
              valueAsNumber: true,
            })}
            error={errors.salary?.min?.message}
            min={0}
          />

          <Input
            type="number"
            label="Max Salary"
            {...register('salary.max', { 
              valueAsNumber: true,
            })}
            error={errors.salary?.max?.message || 
              (minSalary > maxSalary ? "Maximum salary must be greater than minimum salary" : undefined)}
            min={minSalary || 0}
          />
        </div>

        <Input
          label="Description"
          {...register('description')}
          error={errors.description?.message}
          multiline
          rows={4}
        />

        <Input
          type="date"
          label="Deadline"
          {...register('deadline')}
          error={errors.deadline?.message}
          min={new Date().toISOString().split('T')[0]}
        />

        <Select
          label="Publication Status"
          {...register('status')}
          options={[
            { value: 'draft', label: 'Draft (Private)' },
            { value: 'active', label: 'Active (Published)' }
          ]}
          error={errors.status?.message}
          helperText="Draft jobs are private and can be published later. Active jobs are immediately visible to candidates."
        />

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : initialData ? 'Update Job' : 'Create Job'}
          </Button>
        </div>
      </form>
    </Modal>
  );
} 