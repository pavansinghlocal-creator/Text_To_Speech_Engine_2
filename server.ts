import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Helper to convert PCM Buffer to WAV Buffer
function convertPcmToWav(pcmBuffer: Buffer, sampleRate: number = 24000): Buffer {
  if (pcmBuffer.length > 4 && pcmBuffer.toString("ascii", 0, 4) === "RIFF") {
    return pcmBuffer;
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0); // ChunkID
  header.writeUInt32LE(36 + pcmBuffer.length, 4); // ChunkSize
  header.write("WAVE", 8); // Format
  header.write("fmt ", 12); // Subchunk1ID
  header.writeUInt32LE(16, 16); // Subchunk1Size
  header.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  header.writeUInt16LE(1, 22); // NumChannels (1 = Mono)
  header.writeUInt32LE(sampleRate, 24); // SampleRate
  header.writeUInt32LE(sampleRate * 2, 28); // ByteRate
  header.writeUInt16LE(2, 32); // BlockAlign
  header.writeUInt16LE(16, 34); // BitsPerSample
  header.write("data", 36); // Subchunk2ID
  header.writeUInt32LE(pcmBuffer.length, 40); // Subchunk2Size

  return Buffer.concat([header, pcmBuffer]);
}

// Google TTS chunked fetcher and merger for Browser Local download fallback
async function getGoogleTTSMp3(text: string, lang: string): Promise<Buffer> {
  const chunks: string[] = [];
  let currentChunk = "";
  // Split on sentences, punctuation, or spaces
  const sentences = text.match(/[^.!?\n]+[.!?\n]*|.+/g) || [text];

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > 180) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }
      if (sentence.length > 180) {
        let start = 0;
        while (start < sentence.length) {
          chunks.push(sentence.substring(start, start + 180).trim());
          start += 180;
        }
      } else {
        currentChunk = sentence;
      }
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence;
    }
  }
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  const buffers: Buffer[] = [];
  for (const chunk of chunks) {
    if (!chunk) continue;
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(chunk)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
      }
    });
    if (!res.ok) {
      throw new Error(`Google TTS failed with status ${res.status}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    buffers.push(Buffer.from(arrayBuffer));
  }

  return Buffer.concat(buffers);
}

// Gemini AI Studio Speech Synthesis Route
app.post("/api/tts/gemini", async (req, res) => {
  try {
    const { text, voice, speed, tone, language } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      return res.status(400).json({
        error: "Gemini API Key is not configured. Please add your GEMINI_API_KEY to Secrets in Settings."
      });
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });

    // Build guidance instructions for the model to speak with the specified tone and style
    const toneDescription: string[] = [];
    if (tone) {
      if (tone.cheerful) toneDescription.push("cheerful, happy, energetic, and warm");
      if (tone.formal) toneDescription.push("professional, formal, articulate, clear, and serious");
      if (tone.dramatic) toneDescription.push("highly expressive, dramatic, emotional, and theatrical");
      if (tone.discourse) toneDescription.push("deeply meditative, hypnotic, emotionally resonant, saint-like, and peaceful");
      if (tone.maleKid) toneDescription.push("playful, energetic, high-pitched male kid, fast/bubbly pace, and light resonance");
      if (tone.femaleKid) toneDescription.push("sweet, gentle, melodic, very high-pitched female kid, and storytelling-like");
      if (tone.adultMale) toneDescription.push("low pitch, deep baritone, warm, grounded chest resonance, and steady authoritative");
      if (tone.adultFemale) toneDescription.push("medium-high pitch, crisp, articulate, head/mask resonance, and smooth conversational");
    }
    const toneGuide = toneDescription.length > 0 
      ? `Speak in a ${toneDescription.join(" and ")} manner.` 
      : "Speak in a natural and clear manner.";

    let voiceInstruction = "";
    let baseVoice = voice || "Kore";

    if (tone && tone.discourse) {
      baseVoice = "Fenrir"; // Force Male voice for discourse gravity
      if (language === "hi") {
        voiceInstruction = "Read the following Hindi text in a deeply meditative, slow meditative pace of 110-130 WPM, with lower-than-average pitch, deep/warm chest resonance, extended micro-pauses, elongated vowel endings, and flat hypnotic intonation. Hindi must use soft dental consonants and sound profoundly serene.";
      } else {
        voiceInstruction = "Read the following English text. Use a warm, neutral Indian English accent that conveys ancient wisdom, spiritual authority, and absolute calm. Speak slowly at a meditative pace of 110-130 WPM, with a lower-than-average pitch, deep/warm chest resonance, extended micro-pauses, elongated vowel endings, and flat hypnotic intonation.";
      }
    } else if (tone && tone.maleKid) {
      baseVoice = "Puck"; // Playful kid voice
      if (language === "hi") {
        voiceInstruction = "Read the following Hindi text in a high pitch, energetic, playful Male Kid voice with a slight lisp or soft consonants, fast/bubbly pace, light resonance, and native casual inflections.";
      } else {
        voiceInstruction = "Read the following English text in a high pitch, energetic, playful Male Kid voice with a slight lisp or soft consonants, fast/bubbly pace, and light resonance. Sound clear and enthusiastic.";
      }
    } else if (tone && tone.femaleKid) {
      baseVoice = "Kore"; // Sweet female/child voice
      if (language === "hi") {
        voiceInstruction = "Read the following Hindi text in a very high pitch, sweet, gentle, melodic, soft breathy quality, rhythmic pace, and a soft, polite tone.";
      } else {
        voiceInstruction = "Read the following English text in a very high pitch, sweet, gentle, melodic, soft breathy quality, rhythmic pace. Sound clear, expressive, and storytelling-like.";
      }
    } else if (tone && tone.adultMale) {
      baseVoice = "Fenrir"; // Deep male baritone
      if (language === "hi") {
        voiceInstruction = "Read the following Hindi text in a low pitch, deep baritone, warm, grounded chest resonance, and steady authoritative pace. Sound neutral and respectful (formal standard).";
      } else {
        voiceInstruction = "Read the following English text in a professional, clear, low pitch, deep baritone, warm, grounded chest resonance, and steady authoritative pace.";
      }
    } else if (tone && tone.adultFemale) {
      baseVoice = "Kore"; // Clear female voice
      if (language === "hi") {
        voiceInstruction = "Read the following Hindi text in a medium-high pitch, crisp, articulate, head/mask resonance, smooth conversational pace, and sound empathetic and soft-spoken.";
      } else {
        voiceInstruction = "Read the following English text in a professional, confident, warm, medium-high pitch, crisp, articulate, head/mask resonance, and smooth conversational pace.";
      }
    } else if (language === "hi") {
      if (voice === "hindi-male") {
        voiceInstruction = "Read the following Hindi text in a clear, native Indian Male signature speaker voice with an Indian accent.";
        baseVoice = "Fenrir"; // Base voice for male
      } else if (voice === "hindi-female") {
        voiceInstruction = "Read the following Hindi text in a clear, native Indian Female signature speaker voice with an Indian accent.";
        baseVoice = "Kore"; // Base voice for female
      } else {
        voiceInstruction = "Read the following text in a clear Hindi accent.";
      }
    } else {
      voiceInstruction = `Read the following text using the ${baseVoice} voice profile.`;
    }

    // Combine tone guide and voice instructions
    const prompt = `${voiceInstruction} ${toneGuide}\n\nText:\n${text}`;

    let base64Audio: string | undefined;
    let fallbackUsed = false;
    let mimeType = "audio/wav";
    let wavBuffer: Buffer | null = null;
    let mp3Buffer: Buffer | null = null;

    try {
      // Call Gemini 3.1 flash tts model
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: baseVoice },
            },
          },
        },
      });

      base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        throw new Error("No audio payload returned from Gemini model.");
      }

      // Convert raw PCM bytes to WAV
      const pcmBuffer = Buffer.from(base64Audio, "base64");
      wavBuffer = convertPcmToWav(pcmBuffer, 24000);
    } catch (geminiError: any) {
      console.log("Serving high-fidelity voice from local proxy.");
      fallbackUsed = true;
      mimeType = "audio/mpeg";
      try {
        const langCode = language === "hi" ? "hi" : "en";
        mp3Buffer = await getGoogleTTSMp3(text, langCode);
      } catch (localTtsError: any) {
        console.error("Local high-fidelity fallback also failed:", localTtsError);
        return res.status(500).json({
          error: `Both Gemini TTS and local fallback failed. Gemini Error: ${geminiError.message || "Unknown"}`
        });
      }
    }

    if (fallbackUsed && mp3Buffer) {
      res.json({
        audioBase64: mp3Buffer.toString("base64"),
        mimeType: "audio/mpeg",
        fallback: true,
        warning: "Gemini TTS quota exceeded. Seamlessly playing high-fidelity fallback audio instead."
      });
    } else if (wavBuffer) {
      res.json({
        audioBase64: wavBuffer.toString("base64"),
        mimeType: "audio/wav"
      });
    } else {
      res.status(500).json({ error: "Failed to generate speech audio." });
    }
  } catch (error: any) {
    console.error("Gemini TTS Error:", error);
    res.status(500).json({ error: error.message || "An unexpected error occurred during speech synthesis" });
  }
});

// Browser Local audio download proxy route
app.post("/api/tts/local", async (req, res) => {
  try {
    const { text, language, tone } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    // For Local Browser Voices / Download Fallback:
    // If English and Discourse (or any tone), we can use "en-in" (Indian English) to satisfy "English should use a warm, neutral Indian English accent"
    // Otherwise standard "en" is used.
    let langCode = "en";
    if (language === "hi") {
      langCode = "hi";
    } else if (tone && (tone.discourse || tone.maleKid || tone.femaleKid || tone.adultMale || tone.adultFemale)) {
      langCode = "en-in";
    }

    const mp3Buffer = await getGoogleTTSMp3(text, langCode);

    res.setHeader("Content-Type", "audio/mpeg");
    res.send(mp3Buffer);
  } catch (error: any) {
    console.error("Local TTS Proxy Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate local audio download file" });
  }
});

// Vite & Static file handling
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
