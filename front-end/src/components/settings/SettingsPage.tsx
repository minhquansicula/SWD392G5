import React, { useState } from 'react';
import {
  Volume2,
  Moon,
  Sun,
  Monitor,
  Languages,
  Mic,
  Check,
  RotateCcw,
  Save,
  Play,
  CheckCircle2,
  Headphones,
  Sparkles,
} from 'lucide-react';
import { Language } from '../../utils/i18n';
import { UserAccount } from '../../types';

interface SettingsPageProps {
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  isSoundEnabled: boolean;
  setIsSoundEnabled: (enabled: boolean) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  currentUser?: UserAccount | null;
}

interface SystemSettingsData {
  volume: number;
  themeMode: 'light' | 'dark' | 'system';
  accentColor: string;
  sttEngine: string;
  sttLanguage: string;
  noiseSuppression: 'low' | 'medium' | 'high';
  silenceTimeout: number;
  ttsEngine: string;
  ttsVoice: string;
  ttsRate: number;
  ttsPitch: number;
}

const DEFAULT_SETTINGS: SystemSettingsData = {
  volume: 80,
  themeMode: 'light',
  accentColor: 'indigo',
  sttEngine: 'whisper-v3',
  sttLanguage: 'vi-VN',
  noiseSuppression: 'high',
  silenceTimeout: 2.0,
  ttsEngine: 'fpt-banmai',
  ttsVoice: 'vi-VN-HoaiMy',
  ttsRate: 1.0,
  ttsPitch: 1.0,
};

const STORAGE_SETTINGS_KEY = 'aives_system_settings';

export const SettingsPage: React.FC<SettingsPageProps> = ({
  isDarkMode,
  setIsDarkMode,
  isSoundEnabled,
  setIsSoundEnabled,
  language,
  setLanguage,
  currentUser,
}) => {
  const isVi = language === 'vi';

  // Load custom settings from localStorage or defaults
  const [settings, setSettings] = useState<SystemSettingsData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SETTINGS_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Error reading settings from localStorage:', e);
    }
    return {
      ...DEFAULT_SETTINGS,
      themeMode: isDarkMode ? 'dark' : 'light',
    };
  });

  const [activeTab, setActiveTab] = useState<'general' | 'audio' | 'ai'>('general');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPlayingTestSound, setIsPlayingTestSound] = useState(false);
  const [isPlayingTtsSample, setIsPlayingTtsSample] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Play test chime sound using Web Audio API
  const handlePlayTestSound = () => {
    if (!isSoundEnabled) {
      showToast(isVi ? 'Âm thanh hiện đang tắt. Vui lòng bật âm thanh trước.' : 'Sound is muted. Enable sound first.');
      return;
    }

    try {
      setIsPlayingTestSound(true);
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const gainNode = ctx.createGain();
      gainNode.gain.value = (settings.volume / 100) * 0.3;
      gainNode.connect(ctx.destination);

      // Play 2 pleasant chime frequencies (D5 -> A5)
      const playTone = (freq: number, delay: number, dur: number) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
        osc.connect(gainNode);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + dur);
      };

      playTone(587.33, 0, 0.25);
      playTone(880.0, 0.15, 0.4);

      setTimeout(() => {
        setIsPlayingTestSound(false);
      }, 600);
    } catch (err) {
      console.error('Web Audio error:', err);
      setIsPlayingTestSound(false);
    }
  };

  // Play TTS voice sample using browser SpeechSynthesis
  const handlePlayTtsSample = () => {
    if (isPlayingTtsSample) return;

    setIsPlayingTtsSample(true);
    const sampleText = isVi
      ? 'Xin chào, tôi là trợ lý khảo thí AI AIVES. Buổi thi vấn đáp của bạn đã sẵn sàng.'
      : 'Hello, I am the AIVES oral examination assistant. Your viva session is ready.';

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(sampleText);
      utterance.lang = settings.sttLanguage === 'en-US' ? 'en-US' : 'vi-VN';
      utterance.rate = settings.ttsRate;
      utterance.pitch = settings.ttsPitch;
      utterance.volume = isSoundEnabled ? settings.volume / 100 : 0;

      utterance.onend = () => setIsPlayingTtsSample(false);
      utterance.onerror = () => setIsPlayingTtsSample(false);

      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => {
        setIsPlayingTtsSample(false);
      }, 2500);
    }
  };

  // Handle Theme mode change
  const handleThemeModeSelect = (mode: 'light' | 'dark' | 'system') => {
    setSettings((prev) => ({ ...prev, themeMode: mode }));
    if (mode === 'dark') {
      setIsDarkMode(true);
    } else if (mode === 'light') {
      setIsDarkMode(false);
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDark);
    }
  };

  // Save all settings to localStorage
  const handleSaveSettings = () => {
    try {
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
      showToast(isVi ? 'Đã lưu cài đặt hệ thống thành công!' : 'System settings saved successfully!');
    } catch (err) {
      console.error('Failed to save settings:', err);
      showToast(isVi ? 'Không thể lưu cài đặt vào bộ nhớ' : 'Failed to save settings to storage');
    }
  };

  // Reset to default
  const handleResetDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    setIsDarkMode(false);
    setIsSoundEnabled(true);
    setLanguage('vi');
    try {
      localStorage.removeItem(STORAGE_SETTINGS_KEY);
      showToast(isVi ? 'Đã khôi phục cài đặt mặc định' : 'Restored default settings');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl bg-emerald-600 text-white border border-emerald-500 text-sm font-semibold animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-md border border-indigo-200 dark:border-indigo-800">
              {isVi ? 'Cấu hình hệ thống' : 'System Configuration'}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              AIVES v2.5
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {isVi ? 'Cài Đặt Hệ Thống' : 'System Settings'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isVi
              ? 'Tùy chỉnh giao diện, âm thanh phản hồi, ngôn ngữ và cấu hình mô hình nhận dạng giọng nói STT / TTS'
              : 'Customize appearance, audio feedback, localization, and speech recognition STT / TTS models'}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isVi ? 'Đặt lại mặc định' : 'Reset Defaults'}</span>
          </button>
          <button
            onClick={handleSaveSettings}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isVi ? 'Lưu cấu hình' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'general'
              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Monitor className="w-4 h-4" />
          <span>{isVi ? 'Giao diện & Ngôn ngữ' : 'Appearance & Language'}</span>
        </button>

        <button
          onClick={() => setActiveTab('audio')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'audio'
              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Volume2 className="w-4 h-4" />
          <span>{isVi ? 'Âm thanh phản hồi' : 'Audio & Feedback'}</span>
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'ai'
              ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shadow-2xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>{isVi ? 'Mô hình Giọng nói (STT & TTS)' : 'Speech AI (STT & TTS)'}</span>
        </button>
      </div>

      {/* TAB 1: APPEARANCE & LANGUAGE */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Theme card */}
          <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isVi ? 'Giao diện & Chủ đề màu' : 'Theme & Display'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isVi ? 'Tùy chỉnh chế độ hiển thị sáng, tối hoặc tự động' : 'Switch between Light, Dark, or System mode'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              {/* Light Option */}
              <button
                type="button"
                onClick={() => handleThemeModeSelect('light')}
                className={`relative flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all cursor-pointer ${
                  settings.themeMode === 'light'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 font-bold ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                }`}
              >
                {settings.themeMode === 'light' && (
                  <Check className="w-3.5 h-3.5 absolute top-2 right-2 text-indigo-600" />
                )}
                <Sun className="w-5 h-5 mb-2 text-amber-500" />
                <span className="text-xs">{isVi ? 'Sáng' : 'Light'}</span>
              </button>

              {/* Dark Option */}
              <button
                type="button"
                onClick={() => handleThemeModeSelect('dark')}
                className={`relative flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all cursor-pointer ${
                  settings.themeMode === 'dark'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 font-bold ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                }`}
              >
                {settings.themeMode === 'dark' && (
                  <Check className="w-3.5 h-3.5 absolute top-2 right-2 text-indigo-600" />
                )}
                <Moon className="w-5 h-5 mb-2 text-indigo-500" />
                <span className="text-xs">{isVi ? 'Tối' : 'Dark'}</span>
              </button>

              {/* System Option */}
              <button
                type="button"
                onClick={() => handleThemeModeSelect('system')}
                className={`relative flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all cursor-pointer ${
                  settings.themeMode === 'system'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 font-bold ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                }`}
              >
                {settings.themeMode === 'system' && (
                  <Check className="w-3.5 h-3.5 absolute top-2 right-2 text-indigo-600" />
                )}
                <Monitor className="w-5 h-5 mb-2 text-slate-500" />
                <span className="text-xs">{isVi ? 'Hệ thống' : 'System'}</span>
              </button>
            </div>
          </div>

          {/* Language card */}
          <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                <Languages className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isVi ? 'Ngôn ngữ hiển thị' : 'Display Language'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isVi ? 'Chọn ngôn ngữ giao diện của hệ thống AIVES' : 'Choose default UI localized language'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              {/* Vietnamese */}
              <button
                type="button"
                onClick={() => setLanguage('vi')}
                className={`relative flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                  language === 'vi'
                    ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold ring-2 ring-purple-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                }`}
              >
                <span className="text-2xl">VN</span>
                <div className="text-left">
                  <p className="text-xs font-bold">Tiếng Việt</p>
                  <p className="text-[10px] text-slate-400">Việt Nam (Mặc định)</p>
                </div>
                {language === 'vi' && (
                  <Check className="w-4 h-4 ml-auto text-purple-600" />
                )}
              </button>

              {/* English */}
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`relative flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                  language === 'en'
                    ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold ring-2 ring-purple-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                }`}
              >
                <span className="text-2xl">EN</span>
                <div className="text-left">
                  <p className="text-xs font-bold">English</p>
                  <p className="text-[10px] text-slate-400">International</p>
                </div>
                {language === 'en' && (
                  <Check className="w-4 h-4 ml-auto text-purple-600" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIO & SOUND FEEDBACK */}
      {activeTab === 'audio' && (
        <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-6 max-w-3xl">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {isVi ? 'Âm thanh phòng thi & Phản hồi' : 'Examination Audio Feedback'}
              </h3>
              <p className="text-xs text-slate-400">
                {isVi
                  ? 'Cấu hình âm báo ca thi, tiếng chuông chuyển câu hỏi và mức âm lượng tổng'
                  : 'Configure exam alert chimes, turn transitions, and master volume'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Toggle sound switch */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {isVi ? 'Bật hiệu ứng âm thanh phòng thi' : 'Enable Examination Sound Effects'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {isVi
                    ? 'Phát chuông thông báo khi bắt đầu thi, hết giờ và hoàn thành vấn đáp'
                    : 'Plays audio cues upon session start, time warning, and submission'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  isSoundEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isSoundEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Volume slider */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isVi ? 'Mức âm lượng hệ thống' : 'Master Volume Level'}
                </span>
                <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {settings.volume}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.volume}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, volume: Number(e.target.value) }))
                }
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* Test sound button */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handlePlayTestSound}
                disabled={isPlayingTestSound}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-semibold shadow-md shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <Play className={`w-3.5 h-3.5 ${isPlayingTestSound ? 'animate-ping' : ''}`} />
                <span>{isVi ? 'Phát âm thanh thử nghiệm' : 'Test Audio Chime'}</span>
              </button>
              <span className="text-xs text-slate-400">
                {isVi ? 'Kiểm tra mức âm lượng chuông thông báo phòng thi' : 'Check notification chime volume level'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SPEECH RECOGNITION (STT) & TEXT TO SPEECH (TTS) */}
      {activeTab === 'ai' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* STT Section */}
          <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isVi ? 'Nhận diện Giọng nói (STT)' : 'Speech-to-Text (STT)'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isVi ? 'Cấu hình bộ phân tích câu trả lời của thí sinh' : 'Transcribe candidate voice into text in real time'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isVi ? 'Công nghệ STT' : 'STT Engine'}
                </label>
                <select
                  value={settings.sttEngine}
                  onChange={(e) => setSettings((prev) => ({ ...prev, sttEngine: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="whisper-v3">OpenAI Whisper Large-v3 (Khuyến nghị - Độ chính xác 98%)</option>
                  <option value="fpt-ai-voice">FPT.AI Speech Recognition (Tối ưu riêng giọng 3 miền)</option>
                  <option value="google-speech-v2">Google Cloud Speech-to-Text v2</option>
                  <option value="browser-native">Web Speech API (Độ trễ thấp &lt; 200ms)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isVi ? 'Ngôn ngữ nhận dạng chính' : 'Target Recognition Language'}
                </label>
                <select
                  value={settings.sttLanguage}
                  onChange={(e) => setSettings((prev) => ({ ...prev, sttLanguage: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="vi-VN">Tiếng Việt (vi-VN)</option>
                  <option value="en-US">English (en-US)</option>
                  <option value="auto">Tự động nhận diện song ngữ (Auto Detect)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isVi ? 'Độ nhạy lọc tiếng ồn phòng thi' : 'Noise Suppression Sensitivity'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSettings((prev) => ({ ...prev, noiseSuppression: lvl }))}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        settings.noiseSuppression === lvl
                          ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-400'
                          : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      {lvl === 'low' ? (isVi ? 'Thấp' : 'Low') : lvl === 'medium' ? (isVi ? 'Vừa' : 'Medium') : (isVi ? 'Cao (Chuẩn)' : 'High')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* TTS Section */}
          <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isVi ? 'Giọng Giám khảo Khảo thí (TTS)' : 'Examiner Voice (TTS)'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isVi ? 'Cấu hình giọng đọc AI đặt câu hỏi vấn đáp cho sinh viên' : 'Configure synthetic AI examiner voice and speech cadence'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isVi ? 'Công nghệ TTS' : 'TTS Provider Engine'}
                </label>
                <select
                  value={settings.ttsEngine}
                  onChange={(e) => setSettings((prev) => ({ ...prev, ttsEngine: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                >
                  <option value="fpt-banmai">FPT.AI BanMai (Chuẩn khảo thí học đường Việt Nam)</option>
                  <option value="google-neural2">Google Cloud Neural2 (Giọng đọc AI tự nhiên)</option>
                  <option value="openai-tts1-hd">OpenAI TTS-1 HD (Biểu cảm, phản hồi nhanh)</option>
                  <option value="azure-neural">Azure Cognitive Speech Natural</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isVi ? 'Giọng đọc Giám khảo' : 'Examiner Voice Persona'}
                </label>
                <select
                  value={settings.ttsVoice}
                  onChange={(e) => setSettings((prev) => ({ ...prev, ttsVoice: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                >
                  <option value="vi-VN-HoaiMy">Cô Hoài My (Nữ - Giọng Bắc truyền cảm, rõ chữ)</option>
                  <option value="vi-VN-NamMinh">Thầy Nam Minh (Nam - Giọng Nam dõng dạc, nghiêm nghị)</option>
                  <option value="vi-VN-ThaoVy">Cô Thảo Vy (Nữ - Giọng Trung nhẹ nhàng)</option>
                  <option value="en-US-Jenny">Ms. Jenny (Female - US Academic Neutral)</option>
                </select>
              </div>

              {/* Rate slider */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isVi ? 'Tốc độ đặt câu hỏi' : 'Questioning Speed'}
                  </label>
                  <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                    {settings.ttsRate}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.3"
                  step="0.1"
                  value={settings.ttsRate}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, ttsRate: Number(e.target.value) }))
                  }
                  className="w-full accent-purple-600 cursor-pointer"
                />
              </div>

              {/* Listen sample button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handlePlayTtsSample}
                  disabled={isPlayingTtsSample}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-[0.99] text-white text-xs font-semibold shadow-md shadow-purple-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Play className={`w-3.5 h-3.5 ${isPlayingTtsSample ? 'animate-spin' : ''}`} />
                  <span>
                    {isPlayingTtsSample
                      ? isVi
                        ? 'Đang đọc mẫu...'
                        : 'Speaking sample...'
                      : isVi
                      ? 'Nghe thử giọng mẫu'
                      : 'Preview Voice Sample'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
