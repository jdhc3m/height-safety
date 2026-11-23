import {
  JobWorkflowFailure,
  type JobAssignmentRecord,
  type JobAssignmentResult,
  type JobPackSnapshot,
  type JobRecord,
  type JobWorkflowStore,
} from './job-workflow.types';
import type {
  AnchorRecord,
  SiteRecord,
} from '../site-register/site-register.types';

function key(companyId: string, value: string): string {
  return `${companyId}\u0000${value}`;
}

function copyDate(value: Date): Date {
  return new Date(value.getTime());
}

function copyJob(job: JobRecord): JobRecord {
  return {
    ...job,
    createdAt: copyDate(job.createdAt),
    updatedAt: copyDate(job.updatedAt),
  };
}

function copyAssignment(assignment: JobAssignmentRecord): JobAssignmentRecord {
  return {
    ...assignment,
    assignedAt: copyDate(assignment.assignedAt),
    claimedAt: assignment.claimedAt ? copyDate(assignment.claimedAt) : null,
  };
}

function copySite(site: SiteRecord): SiteRecord {
  return {
    ...site,
    createdAt: copyDate(site.createdAt),
    updatedAt: copyDate(site.updatedAt),
  };
}

function copyAnchor(anchor: AnchorRecord): AnchorRecord {
  return {
    ...anchor,
    createdAt: copyDate(anchor.createdAt),
    updatedAt: copyDate(anchor.updatedAt),
  };
}

function copyPackSnapshot(snapshot: JobPackSnapshot): JobPackSnapshot {
  return {
    ...snapshot,
    site: copySite(snapshot.site),
    anchors: snapshot.anchors.map(copyAnchor),
  };
}

export class InMemoryJobWorkflowStore implements JobWorkflowStore {
  private readonly jobs = new Map<string, JobRecord>();
  private readonly assignments = new Map<string, JobAssignmentRecord>();
  private readonly primaryAssignments = new Map<string, JobAssignmentRecord>();
  private readonly jobPackSnapshots = new Map<string, JobPackSnapshot>();

  createJob(job: JobRecord): void {
    const jobKey = key(job.companyId, job.jobId);
    if (this.jobs.has(jobKey)) {
      throw new JobWorkflowFailure('CONFLICT', 'job already exists');
    }
    if (
      [...this.jobs.values()].some(
        (existing) =>
          existing.companyId === job.companyId &&
          existing.reference === job.reference,
      )
    ) {
      throw new JobWorkflowFailure('CONFLICT', 'job reference already exists');
    }
    this.jobs.set(jobKey, copyJob(job));
  }

  getJob(companyId: string, jobId: string): JobRecord | undefined {
    const job = this.jobs.get(key(companyId, jobId));
    return job ? copyJob(job) : undefined;
  }

  listJobs(companyId: string): readonly JobRecord[] {
    return [...this.jobs.values()]
      .filter((job) => job.companyId === companyId)
      .map(copyJob);
  }

  getPrimaryAssignment(
    companyId: string,
    jobId: string,
  ): JobAssignmentRecord | undefined {
    const assignment = this.primaryAssignments.get(key(companyId, jobId));
    return assignment ? copyAssignment(assignment) : undefined;
  }

  releaseJob(
    companyId: string,
    jobId: string,
    updatedAt: Date,
    packSnapshot?: JobPackSnapshot,
  ): JobRecord {
    const jobKey = key(companyId, jobId);
    const existing = this.jobs.get(jobKey);
    if (!existing) {
      throw new JobWorkflowFailure('NOT_FOUND', 'job was not found');
    }
    if (existing.workflowStatus === 'released') {
      return copyJob(existing);
    }
    if (existing.workflowStatus !== 'draft') {
      throw new JobWorkflowFailure(
        'CONFLICT',
        'only draft jobs can be released',
        this.getPrimaryAssignment(companyId, jobId),
      );
    }
    if (!packSnapshot) {
      throw new JobWorkflowFailure(
        'CONFLICT',
        'released jobs require a versioned job pack snapshot',
      );
    }
    if (
      packSnapshot.companyId !== companyId ||
      packSnapshot.jobId !== jobId ||
      packSnapshot.jobPackVersion !== existing.jobPackVersion ||
      packSnapshot.site.companyId !== companyId ||
      packSnapshot.site.siteId !== existing.siteId ||
      packSnapshot.site.jurisdiction !== existing.jurisdiction ||
      packSnapshot.anchors.some(
        (anchor) =>
          anchor.companyId !== companyId || anchor.siteId !== existing.siteId,
      )
    ) {
      throw new JobWorkflowFailure(
        'CONFLICT',
        'job pack snapshot does not match the job',
      );
    }

    const released: JobRecord = {
      ...existing,
      workflowStatus: 'released',
      updatedAt: copyDate(updatedAt),
    };
    this.jobs.set(jobKey, copyJob(released));
    this.jobPackSnapshots.set(jobKey, copyPackSnapshot(packSnapshot));
    return copyJob(released);
  }

  getJobPackSnapshot(
    companyId: string,
    jobId: string,
    jobPackVersion: number,
  ): JobPackSnapshot | undefined {
    const snapshot = this.jobPackSnapshots.get(key(companyId, jobId));
    if (!snapshot || snapshot.jobPackVersion !== jobPackVersion) {
      return undefined;
    }
    return copyPackSnapshot(snapshot);
  }

  createPrimaryAssignment(
    companyId: string,
    jobId: string,
    assignment: JobAssignmentRecord,
    updatedAt: Date,
  ): JobAssignmentResult {
    const jobKey = key(companyId, jobId);
    const existingJob = this.jobs.get(jobKey);
    if (!existingJob) {
      throw new JobWorkflowFailure('NOT_FOUND', 'job was not found');
    }
    if (
      assignment.companyId !== companyId ||
      assignment.jobId !== jobId ||
      assignment.isPrimary !== true
    ) {
      throw new JobWorkflowFailure(
        'INVALID_INPUT',
        'primary assignment does not match job',
      );
    }

    const existingAssignment = this.primaryAssignments.get(jobKey);
    if (existingAssignment) {
      if (
        assignment.assignmentType === 'claimed' &&
        existingAssignment.assignmentType === 'claimed' &&
        existingAssignment.inspectorUserId === assignment.inspectorUserId
      ) {
        return {
          job: copyJob(existingJob),
          assignment: copyAssignment(existingAssignment),
          replayed: true,
        };
      }
      throw new JobWorkflowFailure(
        'CONFLICT',
        'job already has a primary inspector',
        existingAssignment,
      );
    }
    if (existingJob.workflowStatus !== 'released') {
      throw new JobWorkflowFailure(
        'CONFLICT',
        'only released jobs can be assigned',
      );
    }
    if (this.assignments.has(key(companyId, assignment.assignmentId))) {
      throw new JobWorkflowFailure('CONFLICT', 'assignment already exists');
    }

    const assigned: JobRecord = {
      ...existingJob,
      workflowStatus: 'assigned',
      updatedAt: copyDate(updatedAt),
    };
    this.jobs.set(jobKey, copyJob(assigned));
    this.assignments.set(
      key(companyId, assignment.assignmentId),
      copyAssignment(assignment),
    );
    this.primaryAssignments.set(jobKey, copyAssignment(assignment));
    return {
      job: copyJob(assigned),
      assignment: copyAssignment(assignment),
      replayed: false,
    };
  }
}

export class UnconfiguredJobWorkflowStore implements JobWorkflowStore {
  private unavailable(): never {
    throw new JobWorkflowFailure(
      'PERSISTENCE_UNAVAILABLE',
      'job workflow persistence adapter is not configured',
    );
  }

  createJob(_job: JobRecord): void {
    this.unavailable();
  }

  getJob(_companyId: string, _jobId: string): JobRecord | undefined {
    return this.unavailable();
  }

  listJobs(_companyId: string): readonly JobRecord[] {
    return this.unavailable();
  }

  getPrimaryAssignment(
    _companyId: string,
    _jobId: string,
  ): JobAssignmentRecord | undefined {
    return this.unavailable();
  }

  releaseJob(
    _companyId: string,
    _jobId: string,
    _updatedAt: Date,
    _packSnapshot?: JobPackSnapshot,
  ): JobRecord {
    return this.unavailable();
  }

  getJobPackSnapshot(
    _companyId: string,
    _jobId: string,
    _jobPackVersion: number,
  ): JobPackSnapshot | undefined {
    return this.unavailable();
  }

  createPrimaryAssignment(
    _companyId: string,
    _jobId: string,
    _assignment: JobAssignmentRecord,
    _updatedAt: Date,
  ): JobAssignmentResult {
    return this.unavailable();
  }
}
