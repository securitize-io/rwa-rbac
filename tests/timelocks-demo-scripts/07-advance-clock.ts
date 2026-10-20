import { advanceClock, context, print, run } from './common';

run(async () => {
  const { state, connection } = context();
  const seconds = state.timeLock + 1;
  await advanceClock(connection, seconds);
  print('Surfpool clock advanced', { seconds });
});
