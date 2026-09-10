declare module '@emoji-mart/react' {
  import type { ComponentType } from 'react';
  const Picker: ComponentType<{
    data: unknown;
    onEmojiSelect?: (emoji: { native?: string }) => void;
    theme?: string;
    dynamicWidth?: boolean;
    previewPosition?: string;
    skinTonePosition?: string;
  }>;
  export default Picker;
}
