// Audio file validation constants and utilities

export const ACCEPTED_AUDIO_TYPES = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/mp4': 'm4a',
  'audio/ogg': 'ogg',
  'audio/flac': 'flac',
  'audio/x-flac': 'flac',
  'audio/aac': 'aac',
  'audio/webm': 'webm',
};

export const ACCEPTED_EXTENSIONS = ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac', 'webm'];

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
export const MIN_DURATION_SECONDS = 3;
export const MAX_DURATION_SECONDS = 15 * 60; // 15 minutes

export const ACCEPT_ATTR = '.mp3,.wav,.m4a,.ogg,.flac,.aac,.webm,audio/mpeg,audio/mp3,audio/wav,audio/m4a,audio/ogg,audio/flac,audio/aac,audio/webm';

/**
 * Validates an audio file's format and size.
 * Returns { valid, error } — error is a user-friendly string.
 */
export function validateAudioFile(file) {
  if (!file) return { valid: false, error: 'No file selected.' };

  // Size check
  if (file.size > MAX_FILE_SIZE) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return { valid: false, error: `File is ${mb} MB — maximum allowed is 50 MB.` };
  }

  // Format check — try MIME type first, fall back to extension
  let ext = ACCEPTED_AUDIO_TYPES[file.type];
  if (!ext) {
    const dotExt = file.name.split('.').pop()?.toLowerCase();
    if (dotExt && ACCEPTED_EXTENSIONS.includes(dotExt)) {
      ext = dotExt;
    }
  }

  if (!ext) {
    return {
      valid: false,
      error: `Unsupported format. Allowed: MP3, WAV, M4A, OGG, FLAC, AAC, WEBM.`,
    };
  }

  return { valid: true, ext };
}

/**
 * Reads audio duration from a file (via object URL) or a URL.
 * Returns a promise that resolves to duration in seconds, or rejects on error.
 */
export function readAudioDuration(fileOrUrl) {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const isFile = fileOrUrl instanceof File || fileOrUrl instanceof Blob;
    const url = isFile ? URL.createObjectURL(fileOrUrl) : fileOrUrl;
    let settled = false;

    const cleanup = () => {
      audio.removeAttribute('src');
      if (isFile) URL.revokeObjectURL(url);
    };

    const onLoaded = () => {
      if (settled) return;
      settled = true;
      const dur = audio.duration;
      cleanup();
      if (!dur || !isFinite(dur) || isNaN(dur)) {
        reject(new Error('Could not read audio duration — the file may be corrupted or an unsupported codec.'));
      } else {
        resolve(dur);
      }
    };

    const onError = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Audio file could not be decoded. The format may be unsupported or the file is corrupted.'));
    };

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('error', onError);
    audio.preload = 'metadata';
    audio.src = url;
    audio.load();

    // Safety timeout — 15 seconds
    setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(new Error('Timed out reading audio metadata.'));
      }
    }, 15000);
  });
}

/**
 * Validates duration is within allowed range.
 */
export function validateDuration(durationSeconds) {
  if (durationSeconds < MIN_DURATION_SECONDS) {
    return { valid: false, error: `Track is only ${durationSeconds.toFixed(0)}s long — minimum is 3 seconds.` };
  }
  if (durationSeconds > MAX_DURATION_SECONDS) {
    const mins = (durationSeconds / 60).toFixed(1);
    return { valid: false, error: `Track is ${mins} min long — maximum is 15 minutes.` };
  }
  return { valid: true };
}

/**
 * Verifies that an uploaded audio URL is playable by the browser.
 * Returns a promise that resolves to { playable, duration, error }.
 */
export function verifyPlayback(audioUrl) {
  return new Promise((resolve) => {
    const audio = new Audio();
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      audio.removeAttribute('src');
      resolve(result);
    };

    audio.addEventListener('canplaythrough', () => {
      finish({ playable: true, duration: audio.duration });
    });
    audio.addEventListener('loadedmetadata', () => {
      // Some browsers fire canplaythrough after metadata; if duration is valid, we're good
      if (audio.duration && isFinite(audio.duration)) {
        finish({ playable: true, duration: audio.duration });
      }
    });
    audio.addEventListener('error', () => {
      finish({ playable: false, duration: 0, error: 'Audio could not be played back after upload.' });
    });

    audio.preload = 'auto';
    audio.src = audioUrl;
    audio.load();

    setTimeout(() => {
      finish({ playable: false, duration: 0, error: 'Playback verification timed out.' });
    }, 20000);
  });
}