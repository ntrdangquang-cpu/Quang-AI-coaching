import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { base64ToUint8Array, decodeAudioData, createPcmBlob } from "../utils/audio-utils";
import { CoachMode, RoleplayScenario, LiveConfig } from "../types";

export type LiveClientEvents = {
  onOpen?: () => void;
  onClose?: () => void;
  onMessage?: (text: string, isUser: boolean, isComplete: boolean) => void;
  onError?: (error: Error) => void;
  onAudioData?: (amplitude: number) => void; // For visualizer
};

export class GeminiLiveClient {
  private ai: GoogleGenAI;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private nextStartTime: number = 0;
  private isConnected: boolean = false;
  private events: LiveClientEvents;
  
  // Need to keep track of the session promise to send inputs securely
  private sessionPromise: Promise<any> | null = null;
  // Keep track of active audio sources to stop them on interruption
  private activeSources: Set<AudioBufferSourceNode> = new Set();

  constructor(events: LiveClientEvents) {
    this.events = events;
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  public async connect(config: LiveConfig) {
    if (this.isConnected) return;

    try {
      // 1. Setup Audio Contexts
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });

      // 2. Get Microphone Stream
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 3. Define System Instruction based on Mode
      let systemInstruction = "You are a friendly and helpful English language coach.";
      
      if (config.mode === CoachMode.PRONUNCIATION) {
        systemInstruction = `
          You are a strict but encouraging Pronunciation Coach.
          Your Goal: Guide the user through a drill of common English words that are difficult to pronounce (like 'thorough', 'squirrel', 'colonel', 'rural', 'phenomenon', 'specific').
          Process: 
          1. Propose a word.
          2. Ask the user to say it.
          3. Listen carefully to their pronunciation.
          4. If it's correct, praise them and move to the next word.
          5. If it's incorrect, explain exactly how to move their tongue or lips to fix it (e.g., 'Put your tongue between your teeth for the TH sound').
          6. Ask them to try again.
          Keep your responses short and focused on the sounds.
        `;
      } else if (config.mode === CoachMode.ROLEPLAY) {
        let scenarioContext = "";
        switch (config.scenario) {
          case RoleplayScenario.RESTAURANT:
            scenarioContext = "You are a waiter at a busy, popular restaurant. The user is a customer. Start by welcoming them and asking what they would like to drink.";
            break;
          case RoleplayScenario.DIRECTIONS:
            scenarioContext = "You are a friendly local on the street. The user looks lost and will ask you for directions to a landmark (like the train station or museum). Provide clear but slightly complex directions to test their understanding.";
            break;
          case RoleplayScenario.INTERVIEW:
            scenarioContext = "You are a hiring manager for a major tech company. The user is a candidate for a Software Engineering role. Start by asking: 'Tell me a little about yourself and why you want this job.' Be professional and ask follow-up questions.";
            break;
          default:
            scenarioContext = "Pick a common real-world scenario (like returning an item to a store) and start the roleplay.";
        }
        systemInstruction = `
          Act as a roleplay partner. ${scenarioContext}
          Stay in character at all times. Do not break character to explain grammar rules unless the user specifically asks for help or makes a very serious mistake that prevents understanding.
          Keep the conversation flowing naturally.
        `;
      } else {
        systemInstruction += " Engage in free-flowing conversation about hobbies, news, or daily life. Correct major grammar and vocabulary mistakes naturally as they happen, but prioritize the flow of conversation.";
      }
      
      // 4. Initialize Live Session
      this.sessionPromise = this.ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voiceName } },
          },
          systemInstruction: systemInstruction,
          inputAudioTranscription: { model: "gemini-2.5-flash" },
          outputAudioTranscription: { model: "gemini-2.5-flash" },
        },
        callbacks: {
          onopen: () => {
            console.log("Live session connected");
            this.isConnected = true;
            this.events.onOpen?.();
            this.startAudioInput();
          },
          onmessage: this.handleMessage.bind(this),
          onclose: () => {
            console.log("Live session closed");
            this.cleanup();
            this.events.onClose?.();
          },
          onerror: (err) => {
            console.error("Live session error:", err);
            this.events.onError?.(new Error(err.message));
            this.cleanup();
          },
        },
      });

    } catch (error) {
      console.error("Failed to connect:", error);
      this.events.onError?.(error instanceof Error ? error : new Error("Unknown connection error"));
      this.cleanup();
    }
  }

  private startAudioInput() {
    if (!this.inputAudioContext || !this.mediaStream) return;

    this.source = this.inputAudioContext.createMediaStreamSource(this.mediaStream);
    this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      if (!this.isConnected || !this.sessionPromise) return;

      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate simple amplitude for visualizer
      let sum = 0;
      for(let i=0; i<inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const amplitude = Math.sqrt(sum / inputData.length);
      this.events.onAudioData?.(amplitude);

      // Create blob and send
      const pcmBlob = createPcmBlob(inputData);
      this.sessionPromise.then((session) => {
          session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    this.source.connect(this.processor);
    this.processor.connect(this.inputAudioContext.destination);
  }

  private async handleMessage(message: LiveServerMessage) {
    // 1. Handle Transcriptions
    if (message.serverContent?.outputTranscription) {
      this.events.onMessage?.(
        message.serverContent.outputTranscription.text, 
        false, 
        false
      );
    } else if (message.serverContent?.inputTranscription) {
      this.events.onMessage?.(
        message.serverContent.inputTranscription.text, 
        true, 
        false
      );
    }
    
    if (message.serverContent?.turnComplete) {
       // Mark last message as complete (logic handled in UI typically by debouncing or just accepting stream)
       this.events.onMessage?.("", false, true); // Signal turn complete
    }

    // 2. Handle Audio Output
    const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (audioData && this.outputAudioContext) {
      this.playAudioChunk(audioData);
    }

    // 3. Handle Interruption
    if (message.serverContent?.interrupted) {
      this.activeSources.forEach(source => {
        try { source.stop(); } catch(e) {}
      });
      this.activeSources.clear();
      this.nextStartTime = 0;
    }
  }

  private async playAudioChunk(base64Audio: string) {
    if (!this.outputAudioContext) return;
    
    try {
        const uint8Array = base64ToUint8Array(base64Audio);
        const audioBuffer = await decodeAudioData(uint8Array, this.outputAudioContext);
        
        const source = this.outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.outputAudioContext.destination);
        
        // Ensure gapless playback
        const currentTime = this.outputAudioContext.currentTime;
        if (this.nextStartTime < currentTime) {
            this.nextStartTime = currentTime;
        }
        
        source.start(this.nextStartTime);
        this.nextStartTime += audioBuffer.duration;
        
        this.activeSources.add(source);
        source.onended = () => {
            this.activeSources.delete(source);
        };
    } catch (e) {
        console.error("Error playing audio chunk", e);
    }
  }

  public disconnect() {
    this.cleanup();
    this.sessionPromise?.then(session => {
        if (session.close) session.close();
    }).catch(() => {});
    
    this.isConnected = false;
  }

  private cleanup() {
    this.isConnected = false;
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.inputAudioContext) {
      this.inputAudioContext.close();
      this.inputAudioContext = null;
    }

    if (this.outputAudioContext) {
      this.outputAudioContext.close();
      this.outputAudioContext = null;
    }
    
    this.activeSources.clear();
    this.nextStartTime = 0;
  }
}