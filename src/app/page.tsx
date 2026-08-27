import {
  ArrowRight,
  BookOpenText,
  Check,
  Code2,
  Feather,
  Focus,
  HardDrive,
  MoonStar,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: Focus,
    title: "A focused writing room",
    description:
      "A calm, distraction-free editor that keeps your chapters, notes, and momentum in one place.",
  },
  {
    icon: BookOpenText,
    title: "Your whole story, organized",
    description:
      "Move from book to chapter without losing the thread. Everything stays tidy as the story grows.",
  },
  {
    icon: MoonStar,
    title: "Built for your rhythm",
    description:
      "Set a daily target, follow your streak, and make steady progress without turning writing into a chore.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#f8f6f1] text-[#23231f]">
      <header className="relative z-20 border-b border-[#23231f]/8">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
          <Link
            className="flex items-center gap-2.5 font-heading text-xl font-semibold tracking-tight"
            href="/"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-[#282b24] text-[#f8f6f1] shadow-[0_6px_18px_rgba(35,35,31,0.18)]">
              <Feather aria-hidden="true" className="size-4.5" />
            </span>
            awthor
          </Link>

          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-8 text-sm font-semibold text-[#68685f] md:flex"
          >
            <a className="transition-colors hover:text-[#23231f]" href="#features">
              Features
            </a>
            <a className="transition-colors hover:text-[#23231f]" href="#how-it-works">
              How it works
            </a>
            <a className="transition-colors hover:text-[#23231f]" href="#open-source">
              Open source
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              className="hidden rounded-xl px-4 py-2.5 text-sm font-semibold text-[#5e5e56] transition-colors hover:bg-white/70 hover:text-[#23231f] sm:inline-flex"
              href="/books"
            >
              Your library
            </Link>
            <Link
              className="inline-flex items-center gap-2 rounded-xl bg-[#282b24] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(40,43,36,0.18)] transition hover:-translate-y-0.5 hover:bg-[#3c4036]"
              href="/books"
            >
              Start writing
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative isolate">
          <div
            aria-hidden="true"
            className="absolute -top-32 left-1/2 -z-10 h-[620px] w-[960px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(209,219,185,0.75)_0%,rgba(248,246,241,0)_68%)] blur-2xl"
          />

          <div className="mx-auto grid w-full max-w-7xl items-center gap-14 px-5 pt-16 pb-20 sm:px-8 sm:pt-24 lg:grid-cols-[0.88fr_1.12fr] lg:gap-20 lg:px-12 lg:pt-28 lg:pb-28">
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#75805f]/20 bg-white/65 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#657052] backdrop-blur">
                <Sparkles aria-hidden="true" className="size-3.5" />
                Free &amp; open source
              </div>
              <h1 className="text-balance font-heading text-5xl leading-[0.98] font-semibold tracking-[-0.045em] sm:text-6xl lg:text-[4.8rem]">
                Your story deserves a quieter place.
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-[#68685f] sm:text-xl">
                Awthor gives novelists a beautifully simple space to plan, write, and finish their
                books—one good writing day at a time.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-[#282b24] px-6 text-sm font-bold text-white shadow-[0_14px_30px_rgba(40,43,36,0.2)] transition hover:-translate-y-0.5 hover:bg-[#3c4036]"
                  href="/books"
                >
                  Start your first book
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
                <a
                  className="inline-flex h-13 items-center justify-center rounded-2xl border border-[#23231f]/12 bg-white/60 px-6 text-sm font-bold text-[#34342f] transition hover:border-[#23231f]/20 hover:bg-white"
                  href="#how-it-works"
                >
                  See how it works
                </a>
              </div>

              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-[#77776f]">
                <span className="flex items-center gap-1.5">
                  <Check aria-hidden="true" className="size-4 text-[#73805c]" />
                  Free, always
                </span>
                <span className="flex items-center gap-1.5">
                  <Check aria-hidden="true" className="size-4 text-[#73805c]" />
                  Your words stay local
                </span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-2xl lg:mx-0">
              <div
                aria-hidden="true"
                className="absolute -inset-5 -z-10 rotate-2 rounded-[2.2rem] bg-[#dfe5d0]/70"
              />
              <div className="overflow-hidden rounded-[1.7rem] border border-[#23231f]/10 bg-[#fdfcf9] shadow-[0_30px_80px_rgba(52,55,45,0.17)]">
                <div className="flex items-center justify-between border-b border-[#23231f]/8 bg-white/70 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-[#d8a18e]" />
                    <span className="size-2.5 rounded-full bg-[#dfc77f]" />
                    <span className="size-2.5 rounded-full bg-[#9eb48d]" />
                  </div>
                  <span className="rounded-full bg-[#eef0e8] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6f7565]">
                    Saved on this device
                  </span>
                </div>

                <div className="grid min-h-[430px] grid-cols-[132px_1fr] sm:grid-cols-[180px_1fr]">
                  <aside className="border-r border-[#23231f]/8 bg-[#f5f3ed] p-4 sm:p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#929187]">
                      The Long Way Home
                    </p>
                    <div className="mt-5 space-y-1.5 text-xs font-semibold text-[#77776f]">
                      <div className="rounded-lg px-2.5 py-2">01 · The Letter</div>
                      <div className="rounded-lg bg-[#dfe5d0] px-2.5 py-2 text-[#404637]">
                        02 · Northbound
                      </div>
                      <div className="rounded-lg px-2.5 py-2">03 · A Familiar Face</div>
                      <div className="rounded-lg px-2.5 py-2">04 · The Crossing</div>
                    </div>
                  </aside>

                  <article className="px-6 py-8 sm:px-10 sm:py-10">
                    <div className="mb-8 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.15em] text-[#9a998f]">
                      <span>Chapter two</span>
                      <span>1,247 words</span>
                    </div>
                    <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
                      Northbound
                    </h2>
                    <div className="mt-7 space-y-5 font-serif text-[15px] leading-7 text-[#56564f] sm:text-base">
                      <p>
                        The train slipped out of the city before Mara could decide whether leaving
                        counted as courage or surrender.
                      </p>
                      <p>
                        Beyond the glass, morning gathered over the fields in pale ribbons. She
                        opened the letter once more, though by now she knew every word.
                      </p>
                      <p className="text-[#77776f]">
                        At the bottom of the page, her mother&apos;s handwriting leaned gently
                        toward the margin...
                        <span className="ml-0.5 inline-block h-5 w-px translate-y-1 bg-[#7f8b68]" />
                      </p>
                    </div>
                  </article>
                </div>
              </div>

              <div className="absolute -right-1 -bottom-5 flex items-center gap-3 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-[0_14px_35px_rgba(52,55,45,0.15)] backdrop-blur sm:-right-5">
                <div className="grid size-9 place-items-center rounded-xl bg-[#edf0e6] text-[#687456]">
                  <Feather aria-hidden="true" className="size-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#96958c]">
                    Today
                  </p>
                  <p className="text-sm font-extrabold text-[#33342e]">682 words written</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#23231f]/8 bg-[#eeeee6]" id="features">
          <div className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-16 sm:px-8 md:grid-cols-3 lg:px-12 lg:py-20">
            {features.map((feature) => (
              <article
                className="rounded-[1.5rem] border border-[#23231f]/8 bg-[#f8f7f2] p-6 shadow-[0_12px_35px_rgba(52,55,45,0.06)] sm:p-7"
                key={feature.title}
              >
                <div className="grid size-11 place-items-center rounded-2xl bg-[#dde3cf] text-[#5f6b4e]">
                  <feature.icon aria-hidden="true" className="size-5" />
                </div>
                <h2 className="mt-6 font-heading text-xl font-semibold tracking-tight">
                  {feature.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-[#74746b]">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="mx-auto w-full max-w-4xl px-5 py-20 text-center sm:px-8 lg:py-28"
          id="how-it-works"
        >
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#74805f]">
            From blank page to final chapter
          </p>
          <h2 className="mt-4 text-balance font-heading text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
            Less managing. More writing.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#74746b]">
            Create a book, break it into chapters, and return each day to the exact place you left
            off. Awthor keeps the process light, your words private, and your story moving.
          </p>
          <Link
            className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[#4e5940] transition hover:gap-3"
            href="/books"
          >
            Explore the demo library
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </section>

        <section className="px-5 pb-8 sm:px-8" id="open-source">
          <div className="mx-auto w-full max-w-7xl rounded-[2rem] bg-[#292c25] px-7 py-10 text-white sm:px-10 lg:px-14 lg:py-14">
            <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b9c5a1]">
                  Free. Open. Yours.
                </p>
                <h2 className="mt-3 max-w-2xl font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                  Your manuscript belongs on your computer—not ours.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-white/65 sm:text-base">
                  Awthor is completely free and open source. The hosted app keeps your writing on
                  your device and never stores your manuscript in an Awthor server database.
                </p>
              </div>
              <Link
                className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-[#f3f1e9] px-6 py-3.5 text-sm font-bold text-[#292c25] transition hover:-translate-y-0.5 hover:bg-white"
                href="/books"
              >
                Open your library
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>

            <div className="mt-9 grid gap-3 border-t border-white/10 pt-7 sm:grid-cols-3">
              <div className="flex items-center gap-3 text-sm font-bold text-white/80">
                <Code2 aria-hidden="true" className="size-4 text-[#bdc9a6]" />
                Open-source code
              </div>
              <div className="flex items-center gap-3 text-sm font-bold text-white/80">
                <HardDrive aria-hidden="true" className="size-4 text-[#bdc9a6]" />
                Stored on your device
              </div>
              <div className="flex items-center gap-3 text-sm font-bold text-white/80">
                <ShieldCheck aria-hidden="true" className="size-4 text-[#bdc9a6]" />
                No manuscript database
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-[#85857c] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <span className="flex items-center gap-2 font-heading font-semibold text-[#4c4d45]">
          <Feather aria-hidden="true" className="size-4" />
          awthor
        </span>
        <span>Free · Open source · Local-first</span>
      </footer>
    </div>
  );
}
