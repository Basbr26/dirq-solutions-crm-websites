import { useCallback, useEffect, useRef, useState } from 'react';

interface VoiceCommand {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

interface RecognitionCommand {
  text: string;
  action: string;
  keywords: string[];
}

const COMMANDS: RecognitionCommand[] = [
  {
    text: 'approve',
    action: 'approve',
    keywords: ['approve', 'yes', 'ja', 'ok', 'accept'],
  },
  {
    text: 'reject',
    action: 'reject',
    keywords: ['reject', 'deny', 'no', 'nee', 'decline'],
  },
  {
    text: 'undo',
    action: 'undo',
    keywords: ['undo', 'undo that', 'take back', 'terugdraaien'],
  },
  {
    text: 'next',
    action: 'next',
    keywords: ['next', 'volgende', 'skip', 'move on'],
  },
  {
    text: 'show team',
    action: 'show_team',
    keywords: ['show team', 'team status', 'team', 'who'],
  },
  {
    text: 'calendar',
    action: 'show_calendar',
    keywords: ['calendar', 'heatmap', 'availability', 'capacity'],
  },
];

// Browser SpeechRecognition API types
/* eslint-disable @typescript-eslint/no-explicit-any */
interface SpeechRecognitionWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export function useVoiceCommands(onCommand?: (action: string) => void) {
  const recognitionRef = useRef<any>(null);
  const [isListening, setIsListening] = useState(false);
  const [command, setCommand] = useState<VoiceCommand | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check browser support
    const windowWithSpeech = window as unknown as SpeechRecognitionWindow;
    const SpeechRecognition =
      windowWithSpeech.SpeechRecognition ||
      windowWithSpeech.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'nl-NL'; // Dutch by default

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const transcript = finalTranscript || interimTranscript;

      if (transcript) {
        setCommand({
          transcript,
          isFinal: !!finalTranscript,
          confidence: event.results[event.results.length - 1][0].confidence,
        });

        // Check if transcript matches any command
        if (finalTranscript) {
          const matchedCommand = COMMANDS.find((cmd) =>
            cmd.keywords.some((keyword) =>
              finalTranscript.toLowerCase().includes(keyword)
            )
          );

          if (matchedCommand) {
            onCommand?.(matchedCommand.action);
          }
        }
      }
    };

    recognition.onerror = (event) => {
      setError(
        `Voice error: ${event.error}`
      );
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    return () => {
      recognition.abort();
    };
  }, [onCommand]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    command,
    error,
    startListening,
    stopListening,
    toggleListening,
  };
}
