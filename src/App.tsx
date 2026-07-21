import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Volume2,
  VolumeX,
  Download,
  Play,
  Pause,
  Sparkles,
  RefreshCw,
  Sliders,
  Languages,
  Speech,
  Trash2,
  Activity,
  Check,
  HelpCircle,
  Laptop,
  AlertCircle,
  FileText,
  Cloud,
  LogOut,
  UploadCloud,
  RotateCcw
} from "lucide-react";
import {
  initAuth,
  googleSignIn,
  logout,
  listDriveFiles,
  downloadDriveFile,
  uploadTextToDrive,
  uploadAudioToDrive,
  type DriveFile
} from "./googleDrive";

// Types
type EngineType = "gemini" | "local";

interface ToneSettings {
  cheerful: boolean;
  formal: boolean;
  dramatic: boolean;
  discourse: boolean;
  maleKid: boolean;
  femaleKid: boolean;
  adultMale: boolean;
  adultFemale: boolean;
}

// Text Presets
const PRESETS = {
  en: [
    {
      title: "🎙️ Tech Announcement",
      text: "Welcome to the future of voice interface technology. This high-fidelity synthesizer is powered by advanced neural speech models, offering exceptionally natural articulation, expressive cadence, and human-like emotional range. Adjust the sliders to customize your signature acoustic profile."
    },
    {
      title: "🎭 Shakespearean Monologue",
      text: "To be, or not to be, that is the question: Whether 'tis nobler in the mind to suffer the slings and arrows of outrageous fortune, or to take arms against a sea of troubles and by opposing end them."
    },
    {
      title: "⚡ Quick Tongue Twister",
      text: "Peter Piper picked a peck of pickled peppers. A peck of pickled peppers Peter Piper picked. If Peter Piper picked a peck of pickled peppers, where's the peck of pickled peppers Peter Piper picked?"
    }
  ],
  hi: [
    {
      title: "🌸 सुंदर अभिवादन (Hindi Greeting)",
      text: "नमस्ते! भारत के सबसे शक्तिशाली ध्वनि संश्लेषण इंजन में आपका स्वागत है। यहाँ आप अपनी आवाज़ की गति, शैली और हाव-भाव को बदल सकते हैं। हमारी नई भारतीय हस्ताक्षर आवाज़ें आपको बेहद प्राकृतिक अनुभव प्रदान करेंगी।"
    },
    {
      title: "📜 प्रेरणादायक कविता (Hindi Poem)",
      text: "कोशिश करने वालों की कभी हार नहीं होती, लहरों से डरकर नौका पार नहीं होती। नन्हीं चींटी जब दाना लेकर चलती है, चढ़ती दीवारों पर सौ बार फिसलती है। मन का विश्वास रगों में साहस भरता है, चढ़कर गिरना, गिरकर चढ़ना न अखरता है।"
    },
    {
      title: "💼 व्यवसायिक संदेश (Hindi Formal)",
      text: "प्रिय ग्राहकों, हमारी सेवा का उपयोग करने के लिए धन्यवाद। हम आपको सूचित करना चाहते हैं कि नई सुविधाओं और सुरक्षा सुधारों के साथ हमारा नया संस्करण अब लाइव हो चुका है। कृपया अपनी प्रतिक्रिया हमारे साथ साझा करें।"
    }
  ]
};

export default function App() {
  // Input Text
  const [text, setText] = useState<string>(
    "Welcome to the future of voice interface technology. This high-fidelity synthesizer is powered by advanced neural speech models, offering exceptionally natural articulation."
  );
  const [sampleIndex, setSampleIndex] = useState<number>(0);

  // Engines & Languages
  const [engine, setEngine] = useState<EngineType>("local");
  const [language, setLanguage] = useState<"en" | "hi">("en");

  // Voices
  const [geminiVoice, setGeminiVoice] = useState<string>("Kore");
  const [localVoiceName, setLocalVoiceName] = useState<string>("");
  const [localVoices, setLocalVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Controls
  const [vocalVelocity, setVocalVelocity] = useState<number>(1.0);
  const [vocalPitch, setVocalPitch] = useState<number>(1.0);
  const [audioGain, setAudioGain] = useState<number>(1.0);
  const [tone, setTone] = useState<ToneSettings>({
    cheerful: false,
    formal: false,
    dramatic: false,
    discourse: false,
    maleKid: false,
    femaleKid: false,
    adultMale: false,
    adultFemale: false,
  });

  // States
  const [loading, setLoading] = useState<boolean>(false);
  const [playing, setPlaying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Google Drive & Auth States
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [loadingDrive, setLoadingDrive] = useState<boolean>(false);
  const [savingToDrive, setSavingToDrive] = useState<boolean>(false);

  // Initialize Firebase Auth / Google OAuth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setAccessToken(token);
        setNeedsAuth(false);
        fetchDriveFiles(token);
      },
      () => {
        setGoogleUser(null);
        setAccessToken(null);
        setNeedsAuth(true);
        setDriveFiles([]);
      }
    );
    return () => unsubscribe();
  }, []);

  const fetchDriveFiles = async (token: string) => {
    setLoadingDrive(true);
    try {
      const files = await listDriveFiles(token);
      setDriveFiles(files);
    } catch (err: any) {
      console.warn("Failed to fetch Google Drive files:", err);
    } finally {
      setLoadingDrive(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setSuccessMsg(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setAccessToken(result.accessToken);
        setNeedsAuth(false);
        setSuccessMsg("Logged in with Google successfully!");
        fetchDriveFiles(result.accessToken);
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google.");
    }
  };

  const handleGoogleLogout = async () => {
    setError(null);
    setSuccessMsg(null);
    try {
      await logout();
      setGoogleUser(null);
      setAccessToken(null);
      setNeedsAuth(true);
      setDriveFiles([]);
      setSuccessMsg("Logged out successfully.");
    } catch (err: any) {
      setError("Failed to sign out.");
    }
  };

  const handleSaveScriptToDrive = async () => {
    if (!accessToken) {
      setError("Please sign in with Google first.");
      return;
    }
    if (!text.trim()) {
      setError("No script content to save.");
      return;
    }
    setSavingToDrive(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const filename = `VoxStudio_Script_${new Date().toISOString().slice(0, 10)}_${Date.now().toString().slice(-4)}.txt`;
      await uploadTextToDrive(accessToken, filename, text);
      setSuccessMsg(`Script saved to Google Drive as "${filename}"!`);
      fetchDriveFiles(accessToken);
    } catch (err: any) {
      setError(err.message || "Failed to save script to Google Drive.");
    } finally {
      setSavingToDrive(false);
    }
  };

  const handleSaveAudioToDrive = async () => {
    if (!accessToken) {
      setError("Please sign in with Google first.");
      return;
    }
    if (!audioUrl) {
      setError("No audio has been synthesized yet. Please trigger speech first.");
      return;
    }
    setSavingToDrive(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const filename = `VoxStudio_Audio_${new Date().toISOString().slice(0, 10)}_${Date.now().toString().slice(-4)}.mp3`;
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      await uploadAudioToDrive(accessToken, filename, blob);
      setSuccessMsg(`Audio recording saved to Google Drive as "${filename}"!`);
      fetchDriveFiles(accessToken);
    } catch (err: any) {
      setError(err.message || "Failed to save audio to Google Drive.");
    } finally {
      setSavingToDrive(false);
    }
  };

  const handleImportDriveFile = async (fileId: string, filename: string, mimeType: string) => {
    if (!accessToken) return;
    setLoadingDrive(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const fileContent = await downloadDriveFile(accessToken, fileId, mimeType);
      setText(fileContent);
      setSuccessMsg(`Imported "${filename}" from Google Drive successfully!`);
    } catch (err: any) {
      setError(err.message || "Failed to download/import file from Google Drive.");
    } finally {
      setLoadingDrive(false);
    }
  };

  const handleResetToDefault = () => {
    setVocalVelocity(1.0);
    setVocalPitch(1.0);
    setAudioGain(1.0);
    setTone({
      cheerful: false,
      formal: false,
      dramatic: false,
      discourse: false,
      maleKid: false,
      femaleKid: false,
      adultMale: false,
      adultFemale: false
    });
    setEngine("local");
    setLanguage("en");
    setSuccessMsg("All controls and expressions reset to default.");
    setError(null);
  };

  // Audio References
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Get browser local voices
  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        const voices = window.speechSynthesis.getVoices();
        setLocalVoices(voices);
        if (voices.length > 0 && !localVoiceName) {
          // Select default or first available English voice
          const defaultVoice = voices.find(v => v.lang.startsWith("en")) || voices[0];
          setLocalVoiceName(defaultVoice.name);
        }
      }
    };

    loadVoices();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Update Gemini voice selection when language changes
  useEffect(() => {
    if (language === "hi") {
      setGeminiVoice("hindi-female");
      // Set to Hindi preset if current text is the default English one
      if (text.startsWith("Welcome to the future")) {
        setText(PRESETS.hi[0].text);
      }
    } else {
      setGeminiVoice("Kore");
      // Set to English preset if current text is the Hindi one
      if (text.startsWith("नमस्ते! भारत")) {
        setText(PRESETS.en[0].text);
      }
    }
  }, [language]);

  // Handle speed, volume, and local play synchronization
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = vocalVelocity;
    }
  }, [vocalVelocity]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, audioGain));
    }
  }, [audioGain]);

  // Clean up Audio URLs
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Sound Wave Visualizer Animation
  useEffect(() => {
    if (playing) {
      startVisualizer();
    } else {
      stopVisualizer();
    }
    return () => stopVisualizer();
  }, [playing]);

  const startVisualizer = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = canvas.width = canvas.parentElement?.clientWidth || 400;
    let height = canvas.height = 60;
    
    const barsCount = 36;
    const barWidth = Math.floor(width / barsCount) - 3;
    const barHeights = Array(barsCount).fill(4);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Draw ambient backdrop glow
      const gradientBg = ctx.createLinearGradient(0, 0, width, 0);
      gradientBg.addColorStop(0, "rgba(37, 99, 235, 0.05)");
      gradientBg.addColorStop(0.5, "rgba(139, 92, 246, 0.08)");
      gradientBg.addColorStop(1, "rgba(37, 99, 235, 0.05)");
      ctx.fillStyle = gradientBg;
      ctx.fillRect(0, 0, width, height);

      // Draw stylized animated bars
      for (let i = 0; i < barsCount; i++) {
        // Generate pseudo random waves depending on state
        const multiplier = playing ? Math.sin(Date.now() * 0.005 + i * 0.3) * 0.5 + 0.5 : 0.05;
        const targetHeight = 4 + multiplier * (height - 12);
        
        // Linear interpolation for smooth transitions
        barHeights[i] += (targetHeight - barHeights[i]) * 0.2;

        const x = i * (barWidth + 3);
        const y = (height - barHeights[i]) / 2;

        // Multicolored bar gradients (Blue -> Purple)
        const percent = i / barsCount;
        let color = "rgba(37, 99, 235, 0.8)"; // Blue
        if (percent > 0.5) {
          color = "rgba(139, 92, 246, 0.9)"; // Purple
        }

        ctx.fillStyle = color;
        // Rounded rectangles
        ctx.beginPath();
        ctx.roundRect?.(x, y, barWidth, barHeights[i], 3);
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
  };

  const stopVisualizer = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    // Render static resting wave
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const width = canvas.width = canvas.parentElement?.clientWidth || 400;
    const height = canvas.height = 60;
    ctx.clearRect(0, 0, width, height);

    const barsCount = 36;
    const barWidth = Math.floor(width / barsCount) - 3;
    
    for (let i = 0; i < barsCount; i++) {
      const x = i * (barWidth + 3);
      const y = (height - 6) / 2;
      ctx.fillStyle = "rgba(51, 51, 51, 0.6)"; // Dark gray/border color
      ctx.beginPath();
      ctx.roundRect?.(x, y, barWidth, 6, 2);
      ctx.fill();
    }
  };

  // Toggle Tone modifiers (Single selection, mutually exclusive behavior)
  const toggleTone = (key: keyof ToneSettings) => {
    setTone(prev => {
      const isCurrentlyActive = prev[key];
      const newTone = {
        cheerful: false,
        formal: false,
        dramatic: false,
        discourse: false,
        maleKid: false,
        femaleKid: false,
        adultMale: false,
        adultFemale: false
      };
      if (!isCurrentlyActive) {
        newTone[key] = true;
        
        const setLocalVoiceByLangAndGender = (langPrefix: string, gender: "male" | "female" | "kid") => {
          const matchingVoices = localVoices.filter(v => v.lang.toLowerCase().startsWith(langPrefix.toLowerCase()));
          if (matchingVoices.length > 0) {
            const genderVoice = matchingVoices.find(v => {
              const nameLower = v.name.toLowerCase();
              if (gender === "male") {
                return nameLower.includes("male") || nameLower.includes("david") || nameLower.includes("george") || nameLower.includes("ravi") || nameLower.includes("microsoft") || nameLower.includes("standard-b");
              } else if (gender === "female") {
                return nameLower.includes("female") || nameLower.includes("zira") || nameLower.includes("hazel") || nameLower.includes("heera") || nameLower.includes("google") || nameLower.includes("standard-a");
              } else {
                return nameLower.includes("kid") || nameLower.includes("child") || nameLower.includes("toy") || nameLower.includes("google");
              }
            });
            if (genderVoice) {
              setLocalVoiceName(genderVoice.name);
            } else {
              setLocalVoiceName(matchingVoices[0].name);
            }
          }
        };

        if (key === "discourse") {
          if (language === "hi") {
            setGeminiVoice("hindi-male");
            setLocalVoiceByLangAndGender("hi", "male");
          } else {
            setGeminiVoice("Fenrir");
            setLocalVoiceByLangAndGender("en", "male");
          }
          setVocalVelocity(0.75); // meditative pace 110-130 WPM
          setVocalPitch(0.8);     // lower-than-average pitch
        } else if (key === "cheerful") {
          setVocalVelocity(1.15);
          setVocalPitch(1.15);
        } else if (key === "formal") {
          setVocalVelocity(1.0);
          setVocalPitch(1.0);
        } else if (key === "dramatic") {
          setVocalVelocity(0.9);
          setVocalPitch(1.05);
        } else if (key === "maleKid") {
          if (language === "hi") {
            setGeminiVoice("hindi-male");
            setLocalVoiceByLangAndGender("hi", "kid");
          } else {
            setGeminiVoice("Puck");
            setLocalVoiceByLangAndGender("en", "kid");
          }
          setVocalVelocity(1.2);
          setVocalPitch(1.4);
        } else if (key === "femaleKid") {
          if (language === "hi") {
            setGeminiVoice("hindi-female");
            setLocalVoiceByLangAndGender("hi", "kid");
          } else {
            setGeminiVoice("Kore");
            setLocalVoiceByLangAndGender("en", "kid");
          }
          setVocalVelocity(1.1);
          setVocalPitch(1.5);
        } else if (key === "adultMale") {
          if (language === "hi") {
            setGeminiVoice("hindi-male");
            setLocalVoiceByLangAndGender("hi", "male");
          } else {
            setGeminiVoice("Fenrir");
            setLocalVoiceByLangAndGender("en", "male");
          }
          setVocalVelocity(0.95);
          setVocalPitch(0.85);
        } else if (key === "adultFemale") {
          if (language === "hi") {
            setGeminiVoice("hindi-female");
            setLocalVoiceByLangAndGender("hi", "female");
          } else {
            setGeminiVoice("Kore");
            setLocalVoiceByLangAndGender("en", "female");
          }
          setVocalVelocity(1.05);
          setVocalPitch(1.15);
        }
      } else {
        // Toggled off - reset sliders to default
        setVocalVelocity(1.0);
        setVocalPitch(1.0);
      }
      return newTone;
    });
  };

  // Clear Textarea input
  const handleClearText = () => {
    setText("");
  };

  const handleAddSampleText = () => {
    const samples = language === "hi" ? PRESETS.hi : PRESETS.en;
    const currentSample = samples[sampleIndex % samples.length];
    setText(currentSample.text);
    setSampleIndex(prev => prev + 1);
    setError(null);
  };

  // Load Preset text
  const handleLoadPreset = (presetText: string) => {
    setText(presetText);
    setError(null);
  };

  // MAIN TRIGGERS: SPEAK SPEECH
  const handleTriggerSpeech = async () => {
    setError(null);
    setSuccessMsg(null);

    if (!text.trim()) {
      setError("Please type or select some text to read aloud.");
      return;
    }

    if (text.length > 5000) {
      setError(`Character limit exceeded. Please limit your input to 5000 characters (Current: ${text.length}).`);
      return;
    }

    // Stop any current playing audio
    if (playing) {
      handleStopSpeech();
      // wait a tiny bit to avoid overlap
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (engine === "gemini") {
      await speakViaGemini();
    } else {
      speakViaBrowser();
    }
  };

  // Stop Synthesis
  const handleStopSpeech = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlaying(false);
  };

  // 1. Speak Via Gemini AI Studio (Server API Endpoint)
  const speakViaGemini = async () => {
    setLoading(true);
    setAudioUrl(null);
    try {
      const res = await fetch("/api/tts/gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text,
          voice: geminiVoice,
          speed: vocalVelocity,
          tone,
          language
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate speech using Gemini engine");
      }

      if (data.audioBase64) {
        // Convert base64 back to Blob URL for native playing
        const binaryString = window.atob(data.audioBase64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: data.mimeType || "audio/wav" });
        const url = URL.createObjectURL(blob);
        
        setAudioUrl(url);
        if (data.warning) {
          setSuccessMsg(data.warning);
        } else {
          setSuccessMsg("Gemini synthesized audio successfully!");
        }

        // Auto play
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.src = url;
            audioRef.current.playbackRate = vocalVelocity;
            audioRef.current.volume = Math.max(0, Math.min(1, audioGain));
            audioRef.current.play()
              .then(() => setPlaying(true))
              .catch(err => {
                console.warn("Playback error", err);
                setError("Audio file loaded successfully, but browser blocked autoplay. Press play below to listen.");
              });
          }
        }, 150);
      } else {
        throw new Error("No audio payload returned from Gemini server.");
      }
    } catch (err: any) {
      console.warn("Gemini synthesis error:", err);
      setError(err.message || "An unexpected error occurred while communicating with Gemini server.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Speak Via Local Browser Engine (utilizing native Web Speech API with high fidelity server fallback)
  const speakViaBrowser = async () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Find selected voice
        if (localVoiceName) {
          const selectedVoice = localVoices.find(v => v.name === localVoiceName);
          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }
        }
        
        utterance.rate = vocalVelocity; // Rate 0.1 to 10
        utterance.pitch = vocalPitch;   // Pitch 0 to 2
        utterance.volume = Math.max(0, Math.min(1, audioGain)); // Volume 0 to 1
        
        utterance.onstart = () => {
          setPlaying(true);
          setError(null);
        };
        utterance.onend = () => {
          setPlaying(false);
        };
        utterance.onerror = (e) => {
          // If native synthesis fails or is blocked, seamlessly fall back to local proxy
          console.warn("SpeechSynthesis error, falling back to local proxy", e);
          speakViaLocalProxy();
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn("Failed to initiate native SpeechSynthesis, falling back to server local proxy", err);
        await speakViaLocalProxy();
      }
    } else {
      await speakViaLocalProxy();
    }
  };

  // 2b. Fallback: Speak via server local TTS proxy if browser synthesis fails
  const speakViaLocalProxy = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tts/local", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text,
          language: language === "hi" ? "hi" : "en",
          speed: vocalVelocity,
          pitch: vocalPitch,
          tone
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to synthesize local fallback audio from server.");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.playbackRate = vocalVelocity;
          audioRef.current.volume = Math.max(0, Math.min(1, audioGain));
          audioRef.current.play()
            .then(() => {
              setPlaying(true);
              setLoading(false);
              setSuccessMsg("Switched to high-fidelity server TTS fallback successfully!");
            })
            .catch(err => {
              console.warn("Playback error", err);
              setError("Audio synthesized successfully via server fallback, but browser blocked autoplay. Press play below to listen.");
              setLoading(false);
            });
        }
      }, 150);
    } catch (err: any) {
      console.warn("Local proxy TTS synthesis error", err);
      setError(err.message || "An error occurred while generating speech audio fallback.");
      setLoading(false);
    }
  };

  // EXPORTS: DOWNLOAD AS MP3
  const handleDownloadMp3 = async () => {
    setError(null);
    if (!text.trim()) {
      setError("Cannot export empty text. Please type something first.");
      return;
    }

    setLoading(true);
    try {
      if (engine === "gemini") {
        let currentAudioUrl = audioUrl;
        if (!currentAudioUrl) {
          // Generate speech on-the-fly for download since it hasn't been generated yet
          const res = await fetch("/api/tts/gemini", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              text,
              voice: geminiVoice,
              speed: vocalVelocity,
              tone,
              language
            })
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || "Failed to generate speech using Gemini engine");
          }

          const audioBytes = Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0));
          const blob = new Blob([audioBytes], { type: "audio/mp3" });
          currentAudioUrl = URL.createObjectURL(blob);
          setAudioUrl(currentAudioUrl);

          if (audioRef.current) {
            audioRef.current.src = currentAudioUrl;
            audioRef.current.playbackRate = vocalVelocity;
            audioRef.current.volume = Math.max(0, Math.min(1, audioGain));
          }
        }

        const a = document.createElement("a");
        a.href = currentAudioUrl;
        a.download = `gemini-speech-${Date.now()}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setSuccessMsg("MP3 exported successfully!");
      } else {
        // Fallback or explicit request: download browser local TTS as MP3 from server proxy
        const res = await fetch("/api/tts/local", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            text,
            language: language === "hi" ? "hi" : "en"
          })
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to export audio from server.");
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement("a");
        a.href = url;
        a.download = `local-speech-${Date.now()}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setSuccessMsg("MP3 file downloaded successfully!");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while generating the downloadable MP3 audio file.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="tts-root-container" className="min-h-screen lg:h-screen bg-[#0A0A0A] text-[#F5F5F5] font-sans flex flex-col lg:overflow-hidden select-text">
      {/* Top Header Navigation */}
      <nav className="flex items-center justify-between px-3 sm:px-6 py-2 border-b border-[#222] bg-[#0A0A0A] shrink-0 select-text">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-semibold tracking-tight text-blue-400 flex items-center gap-1.5">
              AuraStudio Pro: Text to Speech Generation AI Tool
              <span className="text-[8px] uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1 py-0.2 rounded-full font-mono font-medium">
                v2.5
              </span>
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {/* Reset to Default Button */}
          <button
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-purple-400 hover:text-purple-300 bg-[#111] hover:bg-[#1A1A1A] border border-purple-900/40 hover:border-purple-500/30 rounded-md transition-colors cursor-pointer select-text"
            title="Reset vocal and expression controls to default values"
          >
            <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
            <span>Reset to Default</span>
          </button>

          {needsAuth ? (
            <button
              onClick={handleGoogleLogin}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-yellow-400 hover:text-yellow-300 bg-[#111] hover:bg-[#1A1A1A] border border-yellow-900/40 hover:border-yellow-500/30 rounded-md transition-colors cursor-pointer select-text"
            >
              <svg className="w-3 h-3" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              </svg>
              <span>Connect Drive</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                {googleUser?.photoURL ? (
                  <img
                    src={googleUser.photoURL}
                    alt={googleUser.displayName || ""}
                    className="w-5 h-5 rounded-full border border-blue-500/50"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold">
                    {googleUser?.displayName?.charAt(0) || "U"}
                  </div>
                )}
                <span className="text-[11px] text-zinc-300 hidden sm:inline max-w-[80px] truncate">
                  {googleUser?.displayName?.split(" ")[0]}
                </span>
              </div>
              <button
                onClick={handleGoogleLogout}
                className="p-1 text-zinc-500 hover:text-rose-400 rounded hover:bg-[#1C1C1C] transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Main Panel Area containing Left Sidebar and Right Workspace */}
      <div className="flex flex-col lg:flex-row flex-1 lg:overflow-hidden min-h-0">
        
        {/* Left sidebar - Controls and Customizers */}
        <aside className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-[#222] bg-[#0F0F0F] p-3 sm:p-4 flex flex-col justify-between shrink-0 space-y-3 lg:overflow-y-auto">
          <div className="space-y-4">
            {/* SECTION 1: Engine selector box */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[9px] uppercase tracking-[0.1em] text-[#555] font-bold">
                  Speech Synthesizer Engine
                </h3>
                <span className="flex h-1.5 w-1.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                </span>
              </div>

              <div className="space-y-1.5">
                <div
                  id="engine-gemini"
                  onClick={() => {
                    setEngine("gemini");
                    handleStopSpeech();
                  }}
                  className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-all ${
                    engine === "gemini"
                      ? "bg-blue-600/10 border border-blue-500 text-blue-400 font-medium"
                      : "bg-[#1A1A1A] border border-[#333] text-[#888] hover:border-[#444]"
                  }`}
                >
                  <span className="text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    AI Studio Voices
                  </span>
                  {engine === "gemini" && <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>}
                </div>

                <div
                  id="engine-local"
                  onClick={() => {
                    setEngine("local");
                    handleStopSpeech();
                  }}
                  className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-all ${
                    engine === "local"
                      ? "bg-blue-600/10 border border-blue-500 text-blue-400 font-medium"
                      : "bg-[#1A1A1A] border border-[#333] text-[#888] hover:border-[#444]"
                  }`}
                >
                  <span className="text-xs flex items-center gap-1.5">
                    <Laptop className="w-3.5 h-3.5 shrink-0" />
                    Local Browser Voices
                  </span>
                  {engine === "local" && <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>}
                </div>
              </div>
            </section>

            {/* SECTION 2: Voice configuration panel */}
            <section>
              <h3 className="text-[9px] uppercase tracking-[0.1em] text-[#555] font-bold mb-2">
                Voice Settings
              </h3>

              {/* If engine is Gemini */}
              {engine === "gemini" && (
                <div className="space-y-3">
                  {/* Language Selector */}
                  <div>
                    <label className="text-[9px] uppercase tracking-wider text-[#888] block mb-1 font-mono font-medium">Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as any)}
                      className="w-full bg-[#1A1A1A] border border-[#333] text-xs rounded-md px-2 py-1 outline-none text-[#CCC] focus:border-blue-500 transition-colors cursor-pointer"
                    >
                      <option value="en">English (US)</option>
                      <option value="hi">Hindi (India)</option>
                    </select>
                  </div>

                  {/* Gemini speaker options */}
                  <div>
                    <label className="text-[9px] uppercase tracking-wider text-[#888] block mb-1 font-mono font-medium">
                      {language === "hi" ? "Signature Speaker" : "Signature Accent"}
                    </label>
                    {language === "hi" ? (
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => setGeminiVoice("hindi-male")}
                          className={`py-1 px-2 text-[10px] rounded-md border transition-all ${
                            geminiVoice === "hindi-male"
                              ? "bg-blue-600 border border-blue-500 text-white font-medium"
                              : "bg-[#1A1A1A] text-[#888] border border-[#333] hover:border-[#444]"
                          }`}
                        >
                          Male
                        </button>
                        <button
                          onClick={() => setGeminiVoice("hindi-female")}
                          className={`py-1 px-2 text-[10px] rounded-md border transition-all ${
                            geminiVoice === "hindi-female"
                              ? "bg-blue-600 border border-blue-500 text-white font-medium"
                              : "bg-[#1A1A1A] text-[#888] border border-[#333] hover:border-[#444]"
                          }`}
                        >
                          Female
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-1.5">
                        {["Kore", "Puck", "Fenrir", "Zephyr"].map((voice) => (
                          <button
                            key={voice}
                            onClick={() => setGeminiVoice(voice)}
                            className={`py-1 px-2 text-[10px] rounded-md border transition-all ${
                              geminiVoice === voice
                                ? "bg-blue-600 border border-blue-500 text-white font-medium"
                                : "bg-[#1A1A1A] text-[#888] border border-[#333] hover:border-[#444]"
                            }`}
                          >
                            {voice}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* If engine is Local */}
              {engine === "local" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] uppercase tracking-wider text-[#888] block mb-1 font-mono font-medium">Browser Installed Voices</label>
                    {localVoices.length === 0 ? (
                      <div className="text-[10px] text-[#666] bg-[#1A1A1A] border border-[#333] p-2 rounded-md text-center font-mono">
                        No local voices found.
                      </div>
                    ) : (
                      <select
                        value={localVoiceName}
                        onChange={(e) => setLocalVoiceName(e.target.value)}
                        className="w-full bg-[#1A1A1A] border border-[#333] text-[11px] rounded-md px-2 py-1 outline-none text-[#CCC] focus:border-blue-500 cursor-pointer"
                      >
                        {localVoices.map((voice) => (
                          <option key={voice.name} value={voice.name}>
                            {voice.name} ({voice.lang})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="text-[9px] uppercase tracking-wider text-[#888] block mb-1 font-mono font-medium">Download Language Accent</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { code: "en", label: "English" },
                        { code: "hi", label: "Hindi" }
                      ].map((item) => (
                        <button
                          key={item.code}
                          onClick={() => setLanguage(item.code as any)}
                          className={`py-1 px-2 text-[10px] rounded-md border transition-all ${
                            language === item.code
                              ? "bg-blue-600 border border-blue-500 text-white font-medium"
                              : "bg-[#1A1A1A] text-[#888] border border-[#333] hover:border-[#444]"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Google Drive Integration Panel */}
            {/* Acoustic & Expression Controls Panel */}
            <section className="border-t border-[#222] pt-3 space-y-4">
              <h3 className="text-[9px] uppercase tracking-[0.1em] text-[#555] font-bold">
                Acoustic & Expression
              </h3>

              {/* Vocal Velocity (Speed) Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] text-[#888] uppercase tracking-wider font-semibold font-mono">
                    Vocal Velocity (Speed)
                  </label>
                  <span className="text-[10px] text-blue-500 font-mono font-bold bg-blue-500/10 px-1.5 py-0.2 rounded">
                    {vocalVelocity.toFixed(2)}x
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={vocalVelocity}
                    onChange={(e) => setVocalVelocity(parseFloat(e.target.value))}
                    className="w-full h-0.5 bg-[#222] rounded appearance-none cursor-pointer accent-blue-600"
                  />
                  <button
                    onClick={() => setVocalVelocity(1.0)}
                    className="text-[9px] font-mono hover:text-white text-[#555] border border-[#222] px-1.5 py-0.2 rounded bg-[#1A1A1A] hover:bg-[#222] transition-colors cursor-pointer"
                  >
                    1.0x
                  </button>
                </div>
              </div>

              {/* Vocal Pitch Tone Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] text-[#888] uppercase tracking-wider font-semibold font-mono">
                    Vocal Pitch Tone
                  </label>
                  <span className="text-[10px] text-purple-400 font-mono font-bold bg-purple-500/10 px-1.5 py-0.2 rounded">
                    {vocalPitch.toFixed(2)}x
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={vocalPitch}
                    onChange={(e) => setVocalPitch(parseFloat(e.target.value))}
                    className="w-full h-0.5 bg-[#222] rounded appearance-none cursor-pointer accent-purple-500"
                  />
                  <button
                    onClick={() => setVocalPitch(1.0)}
                    className="text-[9px] font-mono hover:text-white text-[#555] border border-[#222] px-1.5 py-0.2 rounded bg-[#1A1A1A] hover:bg-[#222] transition-colors cursor-pointer"
                  >
                    1.0x
                  </button>
                </div>
              </div>

              {/* Audio Gain Volume Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] text-[#888] uppercase tracking-wider font-semibold font-mono">
                    Audio Gain Volume
                  </label>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded">
                    {Math.round(audioGain * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.05"
                    value={audioGain}
                    onChange={(e) => setAudioGain(parseFloat(e.target.value))}
                    className="w-full h-0.5 bg-[#222] rounded appearance-none cursor-pointer accent-emerald-500"
                  />
                  <button
                    onClick={() => setAudioGain(1.0)}
                    className="text-[9px] font-mono hover:text-white text-[#555] border border-[#222] px-1.5 py-0.2 rounded bg-[#1A1A1A] hover:bg-[#222] transition-colors cursor-pointer"
                  >
                    100%
                  </button>
                </div>
              </div>

              {/* Voice Tone & Expression Preset Buttons */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[9px] text-[#888] uppercase tracking-wider font-semibold font-mono">
                  Voice Tone & Expression
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { key: "cheerful", label: "Cheerful" },
                    { key: "formal", label: "Formal" },
                    { key: "dramatic", label: "Dramatic" },
                    { key: "discourse", label: "Discourse" },
                    { key: "maleKid", label: "Male Kid" },
                    { key: "femaleKid", label: "Female Kid" },
                    { key: "adultMale", label: "Adult Male" },
                    { key: "adultFemale", label: "Adult Female" }
                  ].map((item) => {
                    const isActive = tone[item.key as keyof ToneSettings];
                    return (
                      <button
                        key={item.key}
                        onClick={() => toggleTone(item.key as keyof ToneSettings)}
                        className={`px-2 py-1 text-[10px] border rounded transition-all cursor-pointer ${
                          isActive
                            ? "bg-blue-600/20 border-blue-500/50 text-blue-400 font-semibold"
                            : "bg-[#1A1A1A] border border-[#333] text-white hover:border-[#444] hover:text-white"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Google Drive Integration Panel (Only when connected) */}
            {!needsAuth && (
              <section className="border-t border-[#222] pt-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[9px] uppercase tracking-[0.1em] text-[#555] font-bold flex items-center gap-1">
                    <Cloud className="w-3 h-3 text-blue-500" />
                    Google Drive Cloud
                  </h3>
                  <span className="text-[8px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded">
                    connected
                  </span>
                </div>

                <div className="space-y-2">
                  {/* Save buttons */}
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      onClick={handleSaveScriptToDrive}
                      disabled={savingToDrive || !text.trim()}
                      className="flex items-center justify-center gap-1 py-1 px-1 text-[9px] font-medium rounded border border-[#333] bg-[#1A1A1A] text-zinc-300 hover:border-[#444] hover:text-white transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Save Script as .txt to Drive"
                    >
                      {savingToDrive ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <UploadCloud className="w-3 h-3 text-blue-400" />
                      )}
                      <span>Save Script</span>
                    </button>

                    <button
                      onClick={handleSaveAudioToDrive}
                      disabled={savingToDrive || !audioUrl}
                      className="flex items-center justify-center gap-1 py-1 px-1 text-[9px] font-medium rounded border border-[#333] bg-[#1A1A1A] text-zinc-300 hover:border-[#444] hover:text-white transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Save Synthesized Audio (.mp3) to Drive"
                    >
                      {savingToDrive ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Cloud className="w-3 h-3 text-emerald-400" />
                      )}
                      <span>Save Audio</span>
                    </button>
                  </div>

                  {/* Drive File List */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] uppercase tracking-wider text-[#555] font-semibold font-mono">
                        Import from Drive
                      </span>
                      <button
                        onClick={() => fetchDriveFiles(accessToken || "")}
                        disabled={loadingDrive}
                        className="text-[8px] text-blue-500 hover:underline font-mono cursor-pointer"
                      >
                        {loadingDrive ? "loading..." : "refresh"}
                      </button>
                    </div>

                    <div className="max-h-[110px] overflow-y-auto border border-[#222] rounded bg-[#0A0A0A] divide-y divide-[#1A1A1A] custom-scrollbar font-sans">
                      {loadingDrive && driveFiles.length === 0 ? (
                        <div className="p-3 text-center">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin mx-auto text-blue-500" />
                        </div>
                      ) : driveFiles.length === 0 ? (
                        <div className="p-2 text-center text-[9px] text-[#555] font-mono">
                          No txt or docs found.
                        </div>
                      ) : (
                        driveFiles.map((file) => (
                          <div
                            key={file.id}
                            onClick={() => handleImportDriveFile(file.id, file.name, file.mimeType)}
                            className="p-1.5 hover:bg-[#111] cursor-pointer flex items-start gap-1.5 transition-colors group"
                            title={`Click to load "${file.name}"`}
                          >
                            <FileText className="w-3.5 h-3.5 text-[#666] group-hover:text-blue-400 mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] text-zinc-400 group-hover:text-[#F5F5F5] truncate leading-tight font-medium">
                                {file.name}
                              </p>
                              <span className="text-[7.5px] text-[#555] font-mono block">
                                {file.mimeType.includes("document") ? "Google Doc" : "Plain Text"}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

          </div>
        </aside>

        {/* Right workspace panel */}
        <main className="flex-1 flex flex-col bg-[#0A0A0A] p-2 sm:p-3 lg:p-4 lg:overflow-hidden min-w-0 min-h-0">
          
          {/* Top banner / notifications / errors */}
          <div className="mb-2 min-h-5 shrink-0 flex items-center">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] text-rose-400 font-medium flex items-center gap-1"
                >
                  <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
              {successMsg && !error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] text-emerald-400 font-medium flex items-center gap-1"
                >
                  <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span>{successMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Main Transcript Input Card */}
          <div className="flex-1 relative min-h-[220px] lg:min-h-0 mb-3 border border-zinc-800 rounded-xl p-2.5 lg:p-3.5 bg-[#151515] flex flex-col gap-2">
            
            {/* Controls bar inside script box */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 z-10 shrink-0">
              <div className="text-[9px] uppercase tracking-wider text-yellow-400 font-bold font-mono">
                {language === "hi" ? "इनपुट: स्क्रिप्ट/टेक्स्ट टाइप या पेस्ट करें (Input: Type or Paste Script/Text)" : "Input: Type or Paste Script/Text"}
              </div>

              <div className="flex items-center gap-1.5">
                {/* Add Sample Text Button */}
                <button
                  onClick={handleAddSampleText}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium text-zinc-300 hover:text-blue-400 bg-[#1A1A1A] border border-[#333] hover:border-blue-500/30 rounded-md transition-colors cursor-pointer"
                  title="Add sample text based on language selection"
                >
                  <FileText className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                  <span>Add Sample Text</span>
                </button>

                {/* Compact Character Limit box */}
                <div className="flex items-center gap-2 bg-[#1A1A1A] border border-[#333] px-2.5 py-1 rounded-md">
                  <span className="text-[9px] uppercase tracking-wider font-mono font-semibold text-[#888]">
                    Limit:
                  </span>
                  <span className="text-[10px] text-blue-500 font-mono font-bold">
                    {text.length.toLocaleString()}/5,000
                  </span>
                  <div className="w-12 h-1 bg-[#333] rounded-full overflow-hidden hidden sm:block">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${Math.min((text.length / 5000) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <button
                  onClick={handleClearText}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium text-zinc-300 hover:text-rose-400 bg-[#1A1A1A] border border-[#333] hover:border-rose-400/30 rounded-md transition-colors cursor-pointer select-text"
                  title="Clear Script"
                >
                  <Trash2 className="w-3 h-3 shrink-0" />
                  <span>Clear Script</span>
                </button>
              </div>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={5000}
              className="w-full flex-1 bg-transparent text-xs sm:text-sm font-light leading-relaxed text-white placeholder-zinc-600 focus:outline-none resize-none overflow-y-auto transition-colors"
              placeholder="Type or paste your text here to begin synthesis..."
              id="tts-textarea"
            />

            <div className="absolute bottom-2 right-3.5 text-[9px] text-[#555] font-mono tracking-widest uppercase pointer-events-none select-text">
              Character Limit: 5000
            </div>
          </div>


          {/* Unified Voice Spectrum Visualizer & Controls */}
          <div className="mb-3 bg-[#111] border border-[#222] rounded-xl p-2.5 flex flex-col md:flex-row items-stretch md:items-center gap-3 shrink-0 relative overflow-hidden">
            {/* Real-time voice spectrum visualizer box */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between text-[9px] text-[#888] uppercase tracking-wider font-mono">
                <span>Real-Time Voice Spectrum</span>
                <span className="text-blue-500 font-semibold text-[10px]">{playing ? "active output stream" : "idle"}</span>
              </div>
              <div className="w-full bg-[#0F0F0F] rounded-lg p-1 border border-[#222] flex items-center justify-center relative overflow-hidden h-[35px]">
                <canvas ref={canvasRef} className="w-full h-5" />
                
                <AnimatePresence>
                  {loading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-[#0F0F0F]/95 flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />
                      <span className="text-[10px] text-blue-400 font-medium font-mono">
                        {engine === "gemini" ? "Synthesizing High-Fidelity Neural Speech..." : "Initializing Local Speech Synthesizer..."}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Actions: Trigger Speech & Download MP3 to the right of the spectrum box */}
            <div className="flex flex-col gap-2 shrink-0 self-end md:self-center mt-[13px] md:mt-0">
              <div className="flex items-center gap-2">
                {/* Trigger Speech Button */}
                <button
                  onClick={playing ? handleStopSpeech : handleTriggerSpeech}
                  disabled={loading}
                  className={`h-8 px-4 font-medium rounded-lg flex items-center justify-center space-x-1.5 transition-all active:scale-95 text-xs cursor-pointer shrink-0 ${
                    loading
                      ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700"
                      : playing
                      ? "bg-rose-600 hover:bg-rose-700 text-white border border-rose-500"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {playing ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H10a1 1 0 01-1-1v-4z" />
                      </svg>
                      <span>Stop Speech</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                      </svg>
                      <span>Generate Speech</span>
                    </>
                  )}
                </button>

                {/* Download MP3 Action */}
                <button
                  onClick={handleDownloadMp3}
                  disabled={loading}
                  className="h-8 px-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer text-xs font-sans shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                  </svg>
                  <span>Download MP3</span>
                </button>
              </div>

              {/* Elegant Seekable Playback Bar with Timer just below the Buttons */}
              {audioUrl && (
                <div className="flex items-center gap-2.5 bg-[#161616] border border-[#262626] rounded-lg px-2.5 py-1.5 min-w-[280px]">
                  {/* Play / Pause button */}
                  <button
                    onClick={() => {
                      if (audioRef.current) {
                        if (playing) {
                          audioRef.current.pause();
                        } else {
                          audioRef.current.play().catch(console.warn);
                        }
                      }
                    }}
                    className="p-1 hover:text-white text-zinc-400 hover:bg-[#222] rounded transition-colors"
                    title={playing ? "Pause" : "Play"}
                  >
                    {playing ? (
                      <Pause className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <Play className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </button>

                  {/* Progress Seek Slider */}
                  <input
                    type="range"
                    min="0"
                    max={audioDuration || 100}
                    step="0.05"
                    value={audioCurrentTime}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setAudioCurrentTime(val);
                      if (audioRef.current) {
                        audioRef.current.currentTime = val;
                      }
                    }}
                    className="flex-1 h-1 bg-[#333] rounded appearance-none cursor-pointer accent-blue-500"
                    title="Seek audio progress"
                  />

                  {/* Timer */}
                  <span className="text-[10px] text-zinc-400 font-mono font-semibold whitespace-nowrap">
                    {formatTime(audioCurrentTime)} / {formatTime(audioDuration)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Hidden HTML5 Audio tag to manage play states, metadata, time updates, and seeking */}
          <audio
            ref={audioRef}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => {
              setPlaying(false);
              setAudioCurrentTime(0);
            }}
            onTimeUpdate={() => {
              if (audioRef.current) {
                setAudioCurrentTime(audioRef.current.currentTime);
              }
            }}
            onDurationChange={() => {
              if (audioRef.current) {
                setAudioDuration(audioRef.current.duration || 0);
              }
            }}
            onLoadedMetadata={() => {
              if (audioRef.current) {
                setAudioDuration(audioRef.current.duration || 0);
              }
            }}
            className="hidden"
          />
        </main>
      </div>
    </div>
  );
}
