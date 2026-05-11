export interface Camera {
  make: string;
  model: string;
}

export type CameraFormat = 'long' | 'medium' | 'short';

const leadingMakeWord = (make: string) => make.split(/\s+/)[0];

export const formatCameraText = (
  { make, model }: Camera,
  format: CameraFormat = 'medium',
): string => {
  const short = leadingMakeWord(make);
  const isApple = make === 'Apple';
  const modelHasMake = model.toLowerCase().startsWith(short.toLowerCase());

  switch (format) {
    case 'long':
      return `${make} ${model}`;

    case 'short': {
      if (isApple) {
        // "iPhone 11 Pro" → "11 Pro", but "iPhone 11" stays (number alone is ambiguous)
        const m = model.match(/^iPhone (\d+)(\s+.+)?$/);
        return m?.[2] ? `${m[1]}${m[2]}` : model;
      }
      return modelHasMake ? model.slice(short.length).trim() : model;
    }

    default: {
      // Apple models are self-identifying; other brands prefix only when the
      // model doesn't already start with the make name.
      return isApple || modelHasMake ? model : `${short} ${model}`;
    }
  }
};
