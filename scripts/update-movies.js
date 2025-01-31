import { UpdateScheduler } from '../src/services/scheduler';

async function main() {
  const scheduler = new UpdateScheduler();
  await scheduler.updateMovies();
}

main().catch(console.error); 