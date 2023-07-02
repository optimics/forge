import ora from 'ora'

interface Spinner {
  text: string
  succeed(text: string): void
  start(): void
  stop(): void
  isSpinning: boolean
}

class DummySpinner implements Spinner {
  text = ''
  isSpinning = false
  start() {}
  stop() {}
  succeed(_text: string) {}
}

const FINISHED = 100
const TEXT_PADDING = 3

export interface Job {
  name: string
  big?: boolean
  fn(): void | Promise<void>
  after?: () => void | Promise<void>
}

export class JobRunner {
  jobsDone = 0
  jobsStarted = 0
  jobsTotal = 0
  masterText = ''
  spinner: Spinner = new DummySpinner()

  constructor() {
    this.spinner =
      process.env.NODE_ENV !== 'test' && process.stdout.isTTY
        ? ora()
        : new DummySpinner()
  }

  addJobs(jobsCount: number): void {
    this.jobsTotal += jobsCount
  }

  startJob(job: Job): void {
    this.jobsStarted += 1
    this.spinner.text = job.name
    if (job.big) {
      this.masterText = job.name
    }
  }

  finishJob(job: Job) {
    this.jobsDone += 1
    if (job.big) {
      this.spinner.succeed(job.name)
    } else {
      this.spinner.text = this.masterText
      this.spinner.start()
    }
  }

  get prefixText() {
    const value = String(
      Math.round((this.jobsDone / this.jobsTotal) * FINISHED),
    )
    return `${' '.repeat(TEXT_PADDING - value.length)}${value}%`
  }

  async runJobs(jobs: Job[]): Promise<void> {
    this.addJobs(jobs.length)
    for (const job of jobs) {
      if (!this.spinner.isSpinning) {
        this.spinner.start()
      }
      this.startJob(job)
      await job.fn()
      this.finishJob(job)
      if (job.after) {
        await job.after()
      }
    }
  }
}
