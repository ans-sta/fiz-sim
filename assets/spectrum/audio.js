// assets/spectrum/audio.js — mikrofons un divi analizatori uz tā paša signāla (spec. § 4.1–4.2).
// Mikrofona skaņa uz skaļruņiem netiek laista: analizatori iet uz klusu (gain 0) mezglu, lai pārlūks grafu darbina.
export const LOW_FFT = 32768; // zemās: 1,46 Hz solis, 0,68 s logs pie 48 kHz
export const HIGH_FFT = 8192; // augstās: 5,86 Hz solis, 0,17 s logs

const RAW = { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 };

export function micSupport() {
  return {
    secure: window.isSecureContext !== false,
    hasMedia: Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    hasAudio: Boolean(window.AudioContext || window.webkitAudioContext),
  };
}

// Jāizsauc tieši klikšķī (Safari citādi skaņu neatļauj)
export function createAudioContext() {
  const AC = window.AudioContext || window.webkitAudioContext;
  return new AC();
}

export async function startMic(ctx, { deviceId } = {}) {
  const device = deviceId ? { deviceId: { exact: deviceId } } : {};
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { ...RAW, ...device } });
  } catch (e) {
    if (!e || e.name !== 'OverconstrainedError') throw e;
    // Apstrādes prasības ir tikai vēlmes, tāpēc šī kļūda nāk no izvēlētās ierīces (atvienota) — ņem jebkuru mikrofonu
    stream = await navigator.mediaDevices.getUserMedia({ audio: { ...RAW } });
  }
  try {
    return await connect(ctx, stream);
  } catch (e) {
    stream.getTracks().forEach((t) => t.stop()); // citādi mikrofona indikators paliktu degam
    throw e;
  }
}

async function connect(ctx, stream) {
  if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
  const src = ctx.createMediaStreamSource(stream);
  const low = ctx.createAnalyser();
  low.fftSize = LOW_FFT;
  low.smoothingTimeConstant = 0.3;
  const high = ctx.createAnalyser();
  high.fftSize = HIGH_FFT;
  high.smoothingTimeConstant = 0.5;
  const sink = ctx.createGain();
  sink.gain.value = 0;
  src.connect(low);
  src.connect(high);
  low.connect(sink);
  high.connect(sink);
  sink.connect(ctx.destination);
  const track = stream.getAudioTracks()[0] || null;
  const settings = track && track.getSettings ? track.getSettings() : {};
  const lowBuf = new Float32Array(low.frequencyBinCount);
  const highBuf = new Float32Array(high.frequencyBinCount);
  return {
    sampleRate: ctx.sampleRate,
    lowBuf,
    highBuf,
    read() {
      low.getFloatFrequencyData(lowBuf);
      high.getFloatFrequencyData(highBuf);
    },
    track,
    settings,
    label: track ? track.label : '',
    deviceId: settings.deviceId || '',
    stop() {
      try { src.disconnect(); low.disconnect(); high.disconnect(); sink.disconnect(); } catch (e) { /* jau atvienots */ }
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}

// Mikrofonu saraksts (nosaukumi ir zināmi tikai pēc atļaujas); “default”/“communications” — Chrome aizstājēji, ne ierīces
export async function listMics() {
  try {
    const all = await navigator.mediaDevices.enumerateDevices();
    return all.filter((d) => d.kind === 'audioinput' && d.deviceId && d.deviceId !== 'default' && d.deviceId !== 'communications');
  } catch (e) {
    return [];
  }
}
