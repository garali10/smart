import { JobListing } from '@/types/job';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import Badge from '@/components/ui/badge/Badge';
import Button from '@/components/ui/button/Button';

interface JobListingTableProps {
  jobs: JobListing[];
  onEdit: (job: JobListing) => void;
  onDelete: (id: string) => void;
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export default function JobListingTable({
  jobs,
  onEdit,
  onDelete,
}: JobListingTableProps) {
  if (!jobs.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        No jobs found
      </div>
    );
  }

  return (
    <div className="max-w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableCell>Title</TableCell>
            <TableCell>Department</TableCell>
            <TableCell>Location</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Salary Range</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Deadline</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job._id}>
              <TableCell className="font-medium">{job.title}</TableCell>
              <TableCell>{job.department}</TableCell>
              <TableCell>{job.location}</TableCell>
              <TableCell>
                <Badge color="info">{job.type}</Badge>
              </TableCell>
              <TableCell>
                ${job.salary.min.toLocaleString()} - ${job.salary.max.toLocaleString()}
              </TableCell>
              <TableCell>
                <Badge
                  color={job.status === 'active' ? 'success' : 'warning'}
                >
                  {job.status}
                </Badge>
              </TableCell>
              <TableCell>{formatDate(job.deadline)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={() => onEdit(job)} 
                    variant="outline" 
                    size="sm"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => onDelete(job._id)}
                    variant="danger"
                    size="sm"
                  >
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}