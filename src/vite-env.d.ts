/// <reference types="vite/client" />

// ElevenLabs Conversational AI Widget
declare namespace JSX {
  interface IntrinsicElements {
    'elevenlabs-convai': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        'agent-id': string;
      },
      HTMLElement
    >;
  }
}
