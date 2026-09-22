export const ttsModels = {
  en: {
    label: "English",
    id: "Xenova/mms-tts-eng",
    revision: "3f8955a2adbd6487ce57420620d4916de22b9dac",
    bytes: 38361643,
  },
  hi: {
    label: "हिन्दी · Hindi",
    id: "Xenova/mms-tts-hin",
    revision: "3fc18cc9d5ce10023fb0d22e8339e318fdcae9d9",
    bytes: 38368171,
  },
  bn: {
    label: "বাংলা · Bengali",
    id: "payam1394/traxlate-mms-tts-ben",
    revision: "106a9346fd6bd56bb1185c7870f0b83da12bb479",
    bytes: 38303469,
  },
  ta: {
    label: "தமிழ் · Tamil",
    id: "payam1394/traxlate-mms-tts-tam",
    revision: "c5f6594ebfda402f40f2fef9a69bcb6af3b6ced5",
    bytes: 38300398,
  },
  kn: {
    label: "ಕನ್ನಡ · Kannada",
    id: "onnx-community/mms-tts-kan-ONNX",
    revision: "cac3976902fe64861618432d00337d19e8c2ec61",
    bytes: 37744174,
  },
} as const;

export type TtsLanguage = keyof typeof ttsModels;
export type LanguageChoice = TtsLanguage | "auto";
export type Passage = { text: string; language: TtsLanguage };

const aliases: Record<string, TtsLanguage> = {
  english: "en",
  eng: "en",
  en: "en",
  hindi: "hi",
  hin: "hi",
  hi: "hi",
  हिन्दी: "hi",
  हिंदी: "hi",
  bengali: "bn",
  bangla: "bn",
  ben: "bn",
  bn: "bn",
  বাংলা: "bn",
  tamil: "ta",
  tam: "ta",
  ta: "ta",
  தமிழ்: "ta",
  kannada: "kn",
  kan: "kn",
  kn: "kn",
  ಕನ್ನಡ: "kn",
};

export function savedLanguage(value: string): TtsLanguage | undefined {
  return aliases[value.trim().toLowerCase().split(/[-_]/u)[0]];
}

/** Script detection is deliberately limited: romanized and mixed text need an override. */
export function detectLanguage(text: string): TtsLanguage | undefined {
  const scores: [TtsLanguage, number][] = [
    ["bn", (text.match(/\p{Script=Bengali}/gu) ?? []).length],
    ["ta", (text.match(/\p{Script=Tamil}/gu) ?? []).length],
    ["kn", (text.match(/\p{Script=Kannada}/gu) ?? []).length],
    ["hi", (text.match(/\p{Script=Devanagari}/gu) ?? []).length],
    ["en", (text.match(/\p{Script=Latin}/gu) ?? []).length],
  ];
  scores.sort((a, b) => b[1] - a[1]);
  return scores[0][1] ? scores[0][0] : undefined;
}

export function makePassages(
  text: string,
  bookLanguage: string,
  choice: LanguageChoice,
): Passage[] {
  const saved = savedLanguage(bookLanguage);
  if (choice === "auto" && bookLanguage.trim() && !saved) {
    throw new Error(
      "Choose a narration language below. This book’s language is not supported yet.",
    );
  }
  const detected = detectLanguage(text);
  // English is the historical book default. Prefer a clear native script over that default.
  const fallback = saved && saved !== "en" ? saved : (detected ?? saved ?? "en");
  const sentences =
    text.normalize("NFC").match(/[^.!?।॥。！？\n]+[.!?।॥。！？]*|[.!?।॥。！？]+/gu) ?? [];
  const passages: Passage[] = [];
  for (const sentence of sentences) {
    let rest = sentence.replace(/\s+/gu, " ").trim();
    while (rest) {
      let end = rest.length;
      if (end > 220) {
        end = rest.lastIndexOf(" ", 220);
        if (end < 1) end = 220;
      }
      const part = rest.slice(0, end);
      rest = rest.slice(end).trim();
      if (!/\p{L}|\p{N}/u.test(part)) continue;
      const script = detectLanguage(part);
      if (
        choice === "auto" &&
        /[\p{Script=Arabic}\p{Script=Telugu}\p{Script=Malayalam}\p{Script=Gujarati}\p{Script=Gurmukhi}\p{Script=Han}]/u.test(
          part,
        )
      ) {
        throw new Error(
          "This passage contains an unsupported language. Choose a language below if detection is incorrect.",
        );
      }
      const language = choice === "auto" ? (script ?? fallback) : choice;
      const previous = passages.at(-1);
      // Fewer audio boundaries also amortize the fixed cost of each inference call.
      if (previous?.language === language && previous.text.length + part.length + 1 <= 80) {
        previous.text += ` ${part}`;
      } else {
        passages.push({ text: part, language });
      }
    }
  }
  return passages;
}
