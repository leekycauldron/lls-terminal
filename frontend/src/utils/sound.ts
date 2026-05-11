let doneAudio: HTMLAudioElement | null = null;

export function playDone() {
  if (!doneAudio) {
    doneAudio = new Audio('/done.mp3');
  }
  doneAudio.currentTime = 0;
  doneAudio.play().catch(() => {});
}
