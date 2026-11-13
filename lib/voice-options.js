export const DEFAULT_VOICE_PRESET = 'daniel-test';

export const VOICE_OPTIONS = [
  {
    id: 'daniel-test',
    label: 'Daniel — English — Test voice',
    shortLabel: 'Daniel',
    language: 'English',
    status: 'test',
    detail: 'Approved for prototype testing. Preview and synthesis depend on the configured voice service.',
    previewAvailable: false,
  },
  {
    id: 'indian-english-male',
    label: 'Indian English — Male',
    shortLabel: 'Indian male',
    language: 'English',
    status: 'configured-unverified',
    detail: 'Voice ID is configured, but account access and commercial rights are not verified.',
    previewAvailable: false,
  },
  {
    id: 'indian-english-female',
    label: 'Indian English — Female',
    shortLabel: 'Indian female',
    language: 'English',
    status: 'configured-unverified',
    detail: 'Voice ID is configured, but account access and commercial rights are not verified.',
    previewAvailable: false,
  },
];

const VOICE_IDS = new Set(VOICE_OPTIONS.map((voice) => voice.id));

export function isVoicePreset(value) {
  return typeof value === 'string' && VOICE_IDS.has(value);
}

export function voiceOption(value) {
  return VOICE_OPTIONS.find((voice) => voice.id === value) || VOICE_OPTIONS[0];
}
